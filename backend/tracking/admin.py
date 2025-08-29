from django.contrib import admin
from .models import Customer, Vehicle, Order, JobCard, Invoice

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('id','name','phone','customer_type','total_visits','last_visit')
    search_fields = ('name','phone','email','id')

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('plate_number','make','model','customer')
    search_fields = ('plate_number','make','model')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number','customer','service_type','status','priority','arrival_time','departure_time')
    list_filter = ('status','priority','service_type','order_type')
    search_fields = ('order_number','customer__name','customer__phone')

@admin.register(JobCard)
class JobCardAdmin(admin.ModelAdmin):
    list_display = ('number','order','created_at')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('number','order','status','created_at')
