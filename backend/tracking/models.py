from django.db import models
from django.utils import timezone

class Customer(models.Model):
    PERSONAL = 'personal'
    GOVERNMENT = 'government'
    NGO = 'ngo'
    COMPANY = 'company'
    BODABODA = 'bodaboda'
    CUSTOMER_TYPES = [
        (PERSONAL, 'Personal'),
        (GOVERNMENT, 'Government'),
        (NGO, 'NGO'),
        (COMPANY, 'Private Company'),
        (BODABODA, 'Bodaboda'),
    ]

    id = models.CharField(primary_key=True, max_length=32)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32, unique=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPES)
    organization_name = models.CharField(max_length=255, blank=True)
    tax_number = models.CharField(max_length=64, blank=True)
    personal_subtype = models.CharField(max_length=16, blank=True)  # owner/driver
    notes = models.TextField(blank=True)
    total_visits = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_visit = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.phone})"

class Vehicle(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='vehicles')
    plate_number = models.CharField(max_length=32)
    make = models.CharField(max_length=64, blank=True)
    model = models.CharField(max_length=64, blank=True)
    vehicle_type = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return self.plate_number

class Order(models.Model):
    CREATED = 'created'
    ASSIGNED = 'assigned'
    IN_PROGRESS = 'in-progress'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    STATUS = [
        (CREATED, 'Created'),
        (ASSIGNED, 'Assigned'),
        (IN_PROGRESS, 'In Progress'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]

    SERVICE = 'service'
    SALES = 'sales'
    CONSULTATION = 'consultation'
    TYPES = [
        (SERVICE, 'Service'),
        (SALES, 'Sales'),
        (CONSULTATION, 'Consultation')
    ]

    PRIORITY = [('low','Low'),('normal','Normal'),('high','High'),('urgent','Urgent')]

    id = models.CharField(primary_key=True, max_length=32)
    order_number = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders')
    order_type = models.CharField(max_length=16, choices=TYPES)
    service_type = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=STATUS, default=CREATED)
    priority = models.CharField(max_length=10, choices=PRIORITY, default='normal')
    description = models.TextField(blank=True)
    arrival_time = models.DateTimeField(default=timezone.now)
    departure_time = models.DateTimeField(null=True, blank=True)
    estimated_duration_min = models.PositiveIntegerField(default=60)
    actual_duration_min = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.order_number

class JobCard(models.Model):
    number = models.CharField(max_length=32, unique=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='job_card')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.number

class Invoice(models.Model):
    DRAFT = 'draft'
    SENT = 'sent'
    PAID = 'paid'
    STATUS = [(DRAFT,'Draft'),(SENT,'Sent'),(PAID,'Paid')]

    number = models.CharField(max_length=32, unique=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    status = models.CharField(max_length=16, choices=STATUS, default=DRAFT)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.number

class ServiceDetails(models.Model):
    """Service-specific details for car service orders"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='service_details')
    plate_number = models.CharField(max_length=32)
    vehicle_make = models.CharField(max_length=64)
    vehicle_model = models.CharField(max_length=64)
    vehicle_type = models.CharField(max_length=32)
    problem_description = models.TextField(blank=True)
    services_selected = models.JSONField(default=list, blank=True)  # List of selected services
    
    def __str__(self):
        return f"Service Details for {self.order.order_number}"

class TireSalesDetails(models.Model):
    """Tire sales specific details for tire orders"""
    TIRE_TYPES = [
        ('all-season', 'All-Season'),
        ('summer', 'Summer'),
        ('winter', 'Winter'),
        ('performance', 'Performance'),
        ('off-road', 'Off-Road'),
        ('eco', 'Eco-Friendly'),
        ('run-flat', 'Run-Flat'),
    ]
    
    TIRE_BRANDS = [
        ('michelin', 'Michelin'),
        ('bridgestone', 'Bridgestone'),
        ('goodyear', 'Goodyear'),
        ('continental', 'Continental'),
        ('pirelli', 'Pirelli'),
        ('other', 'Other'),
    ]
    
    TIRE_CONDITIONS = [
        ('new', 'New'),
        ('used', 'Used'),
        ('refurbished', 'Refurbished'),
    ]
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='tire_sales_details')
    item_name = models.CharField(max_length=32, choices=TIRE_TYPES)
    brand = models.CharField(max_length=32, choices=TIRE_BRANDS)
    quantity = models.PositiveIntegerField(default=1)
    tire_condition = models.CharField(max_length=16, choices=TIRE_CONDITIONS)
    
    def __str__(self):
        return f"Tire Sales for {self.order.order_number}"

class ConsultationDetails(models.Model):
    """Consultation specific details for inquiry orders"""
    INQUIRY_TYPES = [
        ('pricing', 'Pricing'),
        ('services', 'Services'),
        ('appointment-booking', 'Appointment Booking'),
        ('general', 'General'),
        ('vehicle-purchase', 'Vehicle Purchase'),
        ('service-advice', 'Service Advice'),
        ('maintenance-plan', 'Maintenance Plan'),
        ('upgrade-options', 'Upgrade Options'),
        ('other', 'Other'),
    ]
    
    CONTACT_PREFERENCES = [
        ('phone', 'Phone'),
        ('email', 'Email'),
    ]
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='consultation_details')
    inquiry_type = models.CharField(max_length=32, choices=INQUIRY_TYPES)
    questions = models.TextField()
    contact_preference = models.CharField(max_length=16, choices=CONTACT_PREFERENCES)
    follow_up_date = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"Consultation for {self.order.order_number}"
