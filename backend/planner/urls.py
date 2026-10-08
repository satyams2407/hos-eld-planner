from django.urls import path
from api.views import health, plan_trip

urlpatterns = [
    path('api/health/', health),
    path('api/plan-trip/', plan_trip),
]
