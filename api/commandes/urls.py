from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import CommandeViewSet, PlatViewSet, push_subscribe
from . import consumers

router = DefaultRouter()
router.register(r'commandes', CommandeViewSet, basename='commande')
router.register(r'plats', PlatViewSet, basename='plat')
# router.register(r'statuts', StatutCommandeViewSet, basename='statut-commande')

urlpatterns = [
    path('', include(router.urls)),

    path("notifications/push-subscribe/", push_subscribe, name="push-subscribe"),
]
    
websocket_urlpatterns = [
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]
    