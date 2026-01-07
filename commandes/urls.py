from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommandeViewSet, PlatViewSet, StatutCommandeViewSet

router = DefaultRouter()
router.register(r'commandes', CommandeViewSet, basename='commande')
router.register(r'plats', PlatViewSet, basename='plat')
router.register(r'statuts', StatutCommandeViewSet, basename='statut-commande')

urlpatterns = [
    path('', include(router.urls)),
]
