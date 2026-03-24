from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, RapportViewSet, FormatExportViewSet

router = DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='log-audit')
router.register(r'rapports', RapportViewSet, basename='rapport')
router.register(r'formats-export', FormatExportViewSet, basename='format-export')

urlpatterns = [
    path('', include(router.urls)),
]
