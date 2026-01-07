from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogAuditViewSet, RapportViewSet, FormatExportViewSet

router = DefaultRouter()
router.register(r'logs', LogAuditViewSet, basename='log-audit')
router.register(r'rapports', RapportViewSet, basename='rapport')
router.register(r'formats-export', FormatExportViewSet, basename='format-export')

urlpatterns = [
    path('', include(router.urls)),
]
