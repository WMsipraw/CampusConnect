# campusconnect_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import RegisterView, LoginView, RequestViewSet, BookingViewSet, ProviderViewSet

# Automatic routing for standard REST database actions
router = DefaultRouter()
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'providers', ProviderViewSet, basename='provider') # <-- ENSURE THIS IS REGISTERED

urlpatterns = [
    path('admin/', admin.site.admin_view), # Django secure admin panel
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/login/', LoginView.as_view(), name='login'),
    path('api/', include(router.urls)), # Combines standard requests, bookings, and providers routes
]