from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# Auth views
from users.views import login, logout, me, change_password

# ViewSets
from users.views import UserViewSet, RoleViewSet, PermissionViewSet
from commandes.views import TableViewSet, PlatViewSet, OrderViewSet, InvoiceViewSet, NotificationViewSet
from stocks.views import ProductViewSet, UniteViewSet, StockViewSet, MovementViewSet, DemandeProduitViewSet
from audit.views import AuditLogViewSet, RapportViewSet, FormatExportViewSet
from audit.reports import ReportsViewSet

# ==================== ROUTER ====================

router = DefaultRouter()

# Tables
router.register(r'tables', TableViewSet, basename='table')

# Orders
router.register(r'orders', OrderViewSet, basename='order')

# Plats (menu items)
router.register(r'plats', PlatViewSet, basename='plat')

# Products
router.register(r'products', ProductViewSet, basename='product')

# Movements
router.register(r'movements', MovementViewSet, basename='movement')

# Invoices
router.register(r'invoices', InvoiceViewSet, basename='invoice')

# Users
router.register(r'users', UserViewSet, basename='user')

# Roles & Permissions
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'permissions', PermissionViewSet, basename='permission')

# Audit Logs
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

# Reports
router.register(r'reports', ReportsViewSet, basename='report')

# Notifications
router.register(r'notifications', NotificationViewSet, basename='notification')

# Stock (internal: unites, stocks, demandes)
router.register(r'unites', UniteViewSet, basename='unite')
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'demandes', DemandeProduitViewSet, basename='demande-produit')

# Legacy endpoints kept
router.register(r'rapports', RapportViewSet, basename='rapport')
router.register(r'formats-export', FormatExportViewSet, basename='format-export')


# ==================== URL PATTERNS ====================

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/login/', login, name='login'),
    path('api/auth/logout/', logout, name='logout'),
    path('api/auth/me/', me, name='me'),
    path('api/auth/change-password/', change_password, name='change-password'),

    # All API endpoints via router
    path('api/', include(router.urls)),

    # API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# Serve static/media in debug mode
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
