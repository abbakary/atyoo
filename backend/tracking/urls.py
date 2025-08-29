from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.DashboardView.as_view(), name='dashboard'),

    # Pages
    path('customers/register/', views.CustomerRegistrationView.as_view(), name='customer_register'),
    path('customers/list/', views.CustomerListView.as_view(), name='customer_list'),
    path('customers/search/', views.CustomerSearchView.as_view(), name='customer_search'),
    path('customers/manage/', views.CustomerManagerView.as_view(), name='customer_manage'),

    path('orders/create/', views.OrderCreateView.as_view(), name='order_create'),
    path('orders/list/', views.OrderListView.as_view(), name='order_list'),
    path('orders/tracking/', views.OrderTrackingView.as_view(), name='order_tracking'),

    path('analytics/overview/', views.AnalyticsOverviewView.as_view(), name='analytics_overview'),
    path('analytics/performance/', views.AnalyticsPerformanceView.as_view(), name='analytics_performance'),
    path('analytics/customer/', views.AnalyticsCustomerView.as_view(), name='analytics_customer'),
    path('analytics/service/', views.AnalyticsServiceView.as_view(), name='analytics_service'),
    path('analytics/revenue/', views.AnalyticsRevenueView.as_view(), name='analytics_revenue'),

    path('reports/daily/', views.ReportsDailyView.as_view(), name='reports_daily'),
    path('reports/customer/', views.ReportsCustomerView.as_view(), name='reports_customer'),
    path('reports/service/', views.ReportsServiceView.as_view(), name='reports_service'),
    path('reports/financial/', views.ReportsFinancialView.as_view(), name='reports_financial'),
    path('reports/custom/', views.ReportsCustomView.as_view(), name='reports_custom'),

    path('settings/general/', views.SettingsGeneralView.as_view(), name='settings_general'),
    path('settings/services/', views.SettingsServicesView.as_view(), name='settings_services'),
    path('settings/users/', views.SettingsUsersView.as_view(), name='settings_users'),
    path('settings/backup/', views.SettingsBackupView.as_view(), name='settings_backup'),

    # APIs
    path('api/customers/', views.CustomerCreateApi.as_view(), name='api_customer_create'),  # POST
    path('api/customers/search/', views.CustomerSearchApi.as_view(), name='api_customer_search'),  # GET
    path('api/customers/<str:customer_id>/', views.CustomerDetailApi.as_view(), name='api_customer_detail'),  # GET/PUT

    path('api/orders/', views.OrderCreateApi.as_view(), name='api_order_create'),  # POST
    path('api/orders/list/', views.OrdersListApi.as_view(), name='api_orders_list'),  # GET
    path('api/orders/<str:order_id>/status/', views.OrderStatusApi.as_view(), name='api_order_status'),  # POST

    path('api/analytics/summary/', views.AnalyticsSummaryApi.as_view(), name='api_analytics_summary'),  # GET

    re_path(r'^.*$', views.DashboardView.as_view()),
]
