from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Count, Q
from django.http import JsonResponse, HttpRequest, HttpResponse, HttpResponseBadRequest
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView

from .models import Customer, Order, Vehicle, ServiceDetails, TireSalesDetails, ConsultationDetails, JobCard, Invoice


# ---------- Utilities ----------

def _now():
    return timezone.now()


def _generate_id(prefix: str) -> str:
    # Max 32 chars for model id; keep it compact
    return f"{prefix}{uuid.uuid4().hex[:12]}"  # e.g., Cxxxxxxxxxxxx or Oxxxxxxxxxxxx


def _generate_order_number() -> str:
    now = _now()
    yy = str(now.year)[-2:]
    mm = str(now.month).zfill(2)
    dd = str(now.day).zfill(2)
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_day = start_day + timedelta(days=1)
    count_today = Order.objects.filter(created_at__gte=start_day, created_at__lt=end_day).count() + 1
    return f"{yy}{mm}{dd}-{str(count_today).zfill(3)}"


def _normalize_customer_type(raw_type: Optional[str], is_bodaboda: bool = False) -> str:
    if is_bodaboda:
        return Customer.BODABODA
    if not raw_type:
        return Customer.PERSONAL
    t = (raw_type or '').strip().lower()
    mapping = {
        'personal': Customer.PERSONAL,
        'owner': Customer.PERSONAL,
        'driver': Customer.PERSONAL,
        'government': Customer.GOVERNMENT,
        'gov': Customer.GOVERNMENT,
        'ngo': Customer.NGO,
        'company': Customer.COMPANY,
        'private-company': Customer.COMPANY,
        'business': Customer.COMPANY,
        'boda-boda': Customer.BODABODA,
        'bodaboda': Customer.BODABODA,
    }
    return mapping.get(t, Customer.PERSONAL)


def _map_order_type(service_type: str) -> str:
    st = (service_type or '').strip().lower()
    if st == 'tire-sales':
        return Order.SALES
    if st == 'consultation' or st == 'general-inquiry':
        return Order.CONSULTATION
    return Order.SERVICE


def _json(request: HttpRequest) -> Dict[str, Any]:
    try:
        return json.loads(request.body.decode('utf-8')) if request.body else {}
    except json.JSONDecodeError:
        return {}


# ---------- Template Views ----------

class DashboardView(TemplateView):
    template_name = 'index.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        # Basic metrics (not directly used by current templates but useful if needed)
        now = _now()
        start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        active_status = [Order.CREATED, Order.ASSIGNED, Order.IN_PROGRESS]
        ctx.update({
            'metric_total_customers': Customer.objects.count(),
            'metric_active_orders': Order.objects.filter(status__in=active_status).count(),
            'metric_completed_today': Order.objects.filter(status=Order.COMPLETED, departure_time__date=now.date()).count(),
            'metric_arrivals_today': Order.objects.filter(arrival_time__gte=start_day).count(),
        })
        return ctx


class CustomerRegistrationView(TemplateView):
    template_name = 'customer-registration.html'


class CustomerListView(TemplateView):
    template_name = 'customer-list.html'


class CustomerSearchView(TemplateView):
    template_name = 'customer-search.html'


class CustomerManagerView(TemplateView):
    template_name = 'customer-manager.html'


class OrderCreateView(TemplateView):
    template_name = 'order-create.html'


class OrderListView(TemplateView):
    template_name = 'order-list.html'


class OrderTrackingView(TemplateView):
    template_name = 'order-tracking.html'


class AnalyticsOverviewView(TemplateView):
    template_name = 'analytics-overview.html'


class AnalyticsPerformanceView(TemplateView):
    template_name = 'analytics-performance.html'


class AnalyticsCustomerView(TemplateView):
    template_name = 'analytics-customer.html'


class AnalyticsServiceView(TemplateView):
    template_name = 'analytics-service.html'


class AnalyticsRevenueView(TemplateView):
    template_name = 'analytics-revenue.html'


class ReportsDailyView(TemplateView):
    template_name = 'reports-daily.html'


class ReportsCustomerView(TemplateView):
    template_name = 'reports-customer.html'


class ReportsServiceView(TemplateView):
    template_name = 'reports-service.html'


class ReportsFinancialView(TemplateView):
    template_name = 'reports-financial.html'


class ReportsCustomView(TemplateView):
    template_name = 'reports-custom.html'


class SettingsGeneralView(TemplateView):
    template_name = 'settings-general.html'


class SettingsServicesView(TemplateView):
    template_name = 'settings-services.html'


class SettingsUsersView(TemplateView):
    template_name = 'settings-users.html'


class SettingsBackupView(TemplateView):
    template_name = 'settings-backup.html'


# ---------- API Views (JSON) ----------

@method_decorator(csrf_exempt, name='dispatch')
class CustomerCreateApi(View):
    def post(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        data = _json(request)
        name = (data.get('name') or '').strip()
        phone = (data.get('phone') or '').strip()
        if not name or not phone:
            return JsonResponse({'success': False, 'error': 'Name and phone are required'}, status=400)

        is_boda = bool(data.get('isBodaboda'))
        customer_type = _normalize_customer_type(data.get('customerType'), is_boda)
        email = (data.get('email') or '').strip()
        address = (data.get('address') or '').strip()
        organization_name = (data.get('organizationName') or '').strip()
        tax_number = (data.get('taxNumber') or '').strip()
        personal_subtype = (data.get('personalSubType') or data.get('personalType') or '').strip()
        notes = (data.get('notes') or '').strip()

        if Customer.objects.filter(phone=phone).exists():
            return JsonResponse({'success': False, 'error': 'Customer with this phone already exists'}, status=400)

        cust_id = (data.get('id') or '').strip() or _generate_id('C')
        customer = Customer.objects.create(
            id=cust_id,
            name=name,
            phone=phone,
            email=email,
            address=address,
            customer_type=customer_type,
            organization_name=organization_name,
            tax_number=tax_number,
            personal_subtype=personal_subtype,
            notes=notes,
            created_at=_now(),
        )

        vehicles_payload = data.get('vehicles') or []
        for v in vehicles_payload:
            Vehicle.objects.create(
                customer=customer,
                plate_number=(v.get('plateNumber') or v.get('plate_number') or '').strip(),
                make=(v.get('make') or '').strip(),
                model=(v.get('model') or '').strip(),
                vehicle_type=(v.get('vehicleType') or v.get('type') or '').strip(),
            )

        return JsonResponse({'success': True, 'customer': _serialize_customer(customer)}, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class CustomerSearchApi(View):
    def get(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        q = (request.GET.get('q') or '').strip()
        customers = Customer.objects.all()
        if q:
            customers = customers.filter(Q(name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q) | Q(id__icontains=q))
        return JsonResponse({'success': True, 'results': [_serialize_customer(c) for c in customers[:100]]})


@method_decorator(csrf_exempt, name='dispatch')
class CustomerDetailApi(View):
    def get(self, request: HttpRequest, customer_id: str, *args, **kwargs) -> JsonResponse:
        try:
            c = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Not found'}, status=404)
        return JsonResponse({'success': True, 'customer': _serialize_customer(c)})

    def put(self, request: HttpRequest, customer_id: str, *args, **kwargs) -> JsonResponse:
        try:
            c = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Not found'}, status=404)
        data = _json(request)
        updatable = {
            'name': 'name',
            'phone': 'phone',
            'email': 'email',
            'address': 'address',
            'organizationName': 'organization_name',
            'taxNumber': 'tax_number',
            'personalSubType': 'personal_subtype',
            'notes': 'notes',
        }
        for k, field in updatable.items():
            if k in data:
                setattr(c, field, (data.get(k) or '').strip())
        if 'customerType' in data or 'isBodaboda' in data:
            c.customer_type = _normalize_customer_type(data.get('customerType'), bool(data.get('isBodaboda')))
        c.save()
        return JsonResponse({'success': True, 'customer': _serialize_customer(c)})


@method_decorator(csrf_exempt, name='dispatch')
class OrderCreateApi(View):
    def post(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        data = _json(request)
        customer_id = (data.get('customerId') or '').strip()
        service_type = (data.get('serviceType') or '').strip()
        if not customer_id or not service_type:
            return JsonResponse({'success': False, 'error': 'customerId and serviceType are required'}, status=400)
        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Customer not found'}, status=404)

        order_id = (data.get('id') or '').strip() or _generate_id('O')
        order_number = _generate_order_number()
        order_type = _map_order_type(service_type)
        priority = (data.get('priority') or 'normal').lower()
        description = (data.get('description') or '').strip()
        estimated = data.get('estimatedCompletion') or ''

        order = Order.objects.create(
            id=order_id,
            order_number=order_number,
            customer=customer,
            order_type=order_type,
            service_type=service_type,
            status=Order.CREATED,
            priority=priority if priority in dict(Order.PRIORITY) else 'normal',
            description=description,
            estimated_duration_min=_parse_estimated_minutes(estimated),
            arrival_time=_now(),
            created_at=_now(),
        )
        
        # Create service-specific details based on order type
        service_details_data = data.get('serviceDetails', {})
        
        if order_type == Order.SERVICE and service_type == 'car-service':
            # Handle car service details
            services_selected = service_details_data.get('carServices', [])
            if isinstance(services_selected, str):
                services_selected = [services_selected]
            
            plate_number = (service_details_data.get('plateNumber') or '').strip()
            vehicle_make = (service_details_data.get('carMake') or '').strip()
            vehicle_model = (service_details_data.get('carModel') or '').strip()
            vehicle_type = (service_details_data.get('vehicleType') or '').strip()
            
            # Create or update vehicle record for this customer
            if plate_number:
                vehicle, created = Vehicle.objects.get_or_create(
                    customer=customer,
                    plate_number=plate_number,
                    defaults={
                        'make': vehicle_make,
                        'model': vehicle_model,
                        'vehicle_type': vehicle_type,
                    }
                )
                # Update vehicle details if they've changed
                if not created:
                    vehicle.make = vehicle_make or vehicle.make
                    vehicle.model = vehicle_model or vehicle.model
                    vehicle.vehicle_type = vehicle_type or vehicle.vehicle_type
                    vehicle.save()
            
            ServiceDetails.objects.create(
                order=order,
                plate_number=plate_number,
                vehicle_make=vehicle_make,
                vehicle_model=vehicle_model,
                vehicle_type=vehicle_type,
                problem_description=(service_details_data.get('problemDescription') or '').strip(),
                services_selected=services_selected
            )
            
        elif order_type == Order.SALES and service_type == 'tire-sales':
            # Handle tire sales details
            TireSalesDetails.objects.create(
                order=order,
                item_name=(service_details_data.get('tireItemName') or '').strip(),
                brand=(service_details_data.get('tireBrand') or '').strip(),
                quantity=int(service_details_data.get('tireQuantity', 1)),
                tire_condition=(service_details_data.get('tireType') or '').strip()
            )
            
        elif order_type == Order.CONSULTATION and service_type == 'consultation':
            # Handle consultation details
            follow_up_date = service_details_data.get('followUpDate')
            if follow_up_date:
                try:
                    from datetime import datetime
                    follow_up_date = datetime.strptime(follow_up_date, '%Y-%m-%d').date()
                except:
                    follow_up_date = None
            
            ConsultationDetails.objects.create(
                order=order,
                inquiry_type=(service_details_data.get('inquiryType') or '').strip(),
                questions=(service_details_data.get('inquiryQuestions') or '').strip(),
                contact_preference=(service_details_data.get('contactPreference') or '').strip(),
                follow_up_date=follow_up_date
            )
        
        # Update customer's last visit and visit count
        customer.total_visits += 1
        customer.last_visit = _now()
        customer.save()
        
        return JsonResponse({'success': True, 'order': _serialize_order(order)}, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class OrderStatusApi(View):
    def post(self, request: HttpRequest, order_id: str, *args, **kwargs) -> JsonResponse:
        data = _json(request)
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)
        new_status = (data.get('status') or '').strip().lower()
        valid = dict(Order.STATUS)
        if new_status not in valid:
            return JsonResponse({'success': False, 'error': 'Invalid status'}, status=400)
        order.status = new_status
        if new_status == Order.COMPLETED and not order.departure_time:
            order.departure_time = _now()
            if order.arrival_time:
                delta = order.departure_time - order.arrival_time
                order.actual_duration_min = int(delta.total_seconds() // 60)
            
            # Auto-generate job card and invoice when order is completed
            _generate_job_card_and_invoice(order)
        
        order.save()
        return JsonResponse({'success': True, 'order': _serialize_order(order)})


class OrdersListApi(View):
    def get(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        qs = Order.objects.select_related('customer').all().order_by('-created_at')
        status_q = (request.GET.get('status') or '').strip().lower()
        customer_id = (request.GET.get('customerId') or '').strip()
        if status_q:
            qs = qs.filter(status=status_q)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return JsonResponse({'success': True, 'results': [_serialize_order(o) for o in qs[:200]]})


class AnalyticsSummaryApi(View):
    def get(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        now = _now()
        start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        active_status = [Order.CREATED, Order.ASSIGNED, Order.IN_PROGRESS]
        completed_today = Order.objects.filter(status=Order.COMPLETED, departure_time__date=now.date())
        active_orders = Order.objects.filter(status__in=active_status)
        # Avg wait time for active orders (minutes)
        waits = []
        for o in active_orders:
            if o.arrival_time:
                waits.append(int((now - o.arrival_time).total_seconds() // 60))
        avg_wait_min = int(sum(waits) / len(waits)) if waits else 0

        service_breakdown = list(
            Order.objects.values('service_type').annotate(count=Count('id')).order_by('-count')
        )
        data = {
            'totalCustomers': Customer.objects.count(),
            'arrivalsToday': Order.objects.filter(arrival_time__gte=start_day).count(),
            'activeOrders': active_orders.count(),
            'completedToday': completed_today.count(),
            'avgWaitMinutes': avg_wait_min,
            'serviceBreakdown': service_breakdown,
        }
        return JsonResponse({'success': True, 'data': data})


# ---------- Serializers ----------

def _serialize_customer(c: Customer) -> Dict[str, Any]:
    return {
        'id': c.id,
        'name': c.name,
        'phone': c.phone,
        'email': c.email or '',
        'address': c.address or '',
        'customerType': c.customer_type,
        'organizationName': c.organization_name or '',
        'taxNumber': c.tax_number or '',
        'personalSubType': c.personal_subtype or '',
        'notes': c.notes or '',
        'createdAt': c.created_at.isoformat() if c.created_at else None,
        'lastVisit': c.last_visit.isoformat() if c.last_visit else None,
        'totalSpent': str(c.total_spent),
        'totalVisits': c.total_visits,
    }


def _serialize_order(o: Order) -> Dict[str, Any]:
    order_data = {
        'id': o.id,
        'orderNumber': o.order_number,
        'customerId': o.customer_id,
        'customerName': o.customer.name if o.customer_id else '',
        'orderType': o.order_type,
        'serviceType': o.service_type,
        'status': o.status,
        'priority': o.priority,
        'description': o.description or '',
        'arrivalTime': o.arrival_time.isoformat() if o.arrival_time else None,
        'departureTime': o.departure_time.isoformat() if o.departure_time else None,
        'estimatedDurationMin': o.estimated_duration_min,
        'actualDurationMin': o.actual_duration_min,
        'createdAt': o.created_at.isoformat() if o.created_at else None,
        'updatedAt': o.updated_at.isoformat() if o.updated_at else None,
    }
    
    # Add service-specific details
    try:
        if hasattr(o, 'service_details'):
            service_details = o.service_details
            order_data['serviceDetails'] = {
                'plateNumber': service_details.plate_number,
                'vehicleMake': service_details.vehicle_make,
                'vehicleModel': service_details.vehicle_model,
                'vehicleType': service_details.vehicle_type,
                'problemDescription': service_details.problem_description,
                'servicesSelected': service_details.services_selected,
            }
    except ServiceDetails.DoesNotExist:
        pass
    
    try:
        if hasattr(o, 'tire_sales_details'):
            tire_details = o.tire_sales_details
            order_data['serviceDetails'] = {
                'itemName': tire_details.item_name,
                'brand': tire_details.brand,
                'quantity': tire_details.quantity,
                'tireCondition': tire_details.tire_condition,
            }
    except TireSalesDetails.DoesNotExist:
        pass
    
    try:
        if hasattr(o, 'consultation_details'):
            consultation_details = o.consultation_details
            order_data['serviceDetails'] = {
                'inquiryType': consultation_details.inquiry_type,
                'questions': consultation_details.questions,
                'contactPreference': consultation_details.contact_preference,
                'followUpDate': consultation_details.follow_up_date.isoformat() if consultation_details.follow_up_date else None,
            }
    except ConsultationDetails.DoesNotExist:
        pass
    
    return order_data


def _parse_estimated_minutes(value: Any) -> int:
    if value is None:
        return 60
    if isinstance(value, int):
        return max(0, value)
    s = str(value).strip().lower()
    # Accept formats like '2h', '90m', '1h 30m', '120'
    total = 0
    num = ''
    i = 0
    while i < len(s):
        ch = s[i]
        if ch.isdigit():
            num += ch
            i += 1
            continue
        if ch in ['h', 'm']:
            if num:
                val = int(num)
                if ch == 'h':
                    total += val * 60
                else:
                    total += val
                num = ''
            i += 1
            continue
        i += 1
    if num:
        total += int(num)
    return total or 60
