from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProduitViewSet, UniteViewSet, StockViewSet,
    MouvementStockViewSet, DemandeProduitViewSet
)

router = DefaultRouter()
router.register(r'produits', ProduitViewSet, basename='produit')
router.register(r'unites', UniteViewSet, basename='unite')
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'mouvements', MouvementStockViewSet, basename='mouvement-stock')
router.register(r'demandes', DemandeProduitViewSet, basename='demande-produit')

urlpatterns = [
    path('', include(router.urls)),
]
