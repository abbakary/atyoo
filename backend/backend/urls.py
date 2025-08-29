from django.contrib import admin
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve as static_serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('tracking.urls')),
]

# Dev static serving for existing asset/js paths referenced directly in templates
# This allows paths like /tracking-system.js or /assets/... to work in DEBUG
if settings.DEBUG:
    re_static = r'^(?P<path>.*\.(?:js|css|png|jpg|jpeg|svg|gif|ico|ttf|woff|woff2|map))$'
    urlpatterns += [
        re_path(re_static, static_serve, {'document_root': settings.BASE_DIR}),
    ]
