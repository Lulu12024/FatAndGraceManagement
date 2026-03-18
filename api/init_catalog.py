"""
Script d'initialisation du catalogue : Plats du menu + Produits en stock.
À exécuter APRÈS init_data.py (les unités doivent déjà exister).

Exécution :
    python init_catalog.py
ou via le shell Django :
    python manage.py shell < init_catalog.py
"""

import os
import django
from decimal import Decimal
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stock_management.settings')
django.setup()

from commandes.models import Plat
from stocks.models import Produit, Stock, Unite


# ================================================================
# HELPERS
# ================================================================

def unite(nom):
    obj, _ = Unite.objects.get_or_create(nom=nom)
    return obj


# ================================================================
# PLATS
# ================================================================

def init_plats():
    print("🍽️  Initialisation des plats du menu...")

    plats_data = [

        # ── Entrées ──────────────────────────────────────────────
        {
            'nom': 'Salade César',
            'prix': Decimal('3500'),
            'categorie': 'Entrée',
            'description': 'Salade romaine, croûtons, parmesan, sauce César maison',
            'ingredients': 'Salade romaine, croûtons, parmesan, anchois, sauce César',
            'disponible': True,
        },
        {
            'nom': 'Soupe de légumes',
            'prix': Decimal('2500'),
            'categorie': 'Entrée',
            'description': 'Soupe maison aux légumes de saison',
            'ingredients': 'Carottes, poireaux, pommes de terre, oignons, bouillon',
            'disponible': True,
        },
        {
            'nom': 'Bruschetta tomate-basilic',
            'prix': Decimal('2800'),
            'categorie': 'Entrée',
            'description': 'Pain grillé, tomates fraîches, basilic, huile d\'olive',
            'ingredients': 'Pain baguette, tomates, basilic, ail, huile d\'olive',
            'disponible': True,
        },
        {
            'nom': 'Assiette de charcuterie',
            'prix': Decimal('5500'),
            'categorie': 'Entrée',
            'description': 'Sélection de charcuteries, cornichons, pain grillé',
            'ingredients': 'Jambon, saucisson, rillettes, cornichons, pain',
            'disponible': True,
        },

        # ── Plats principaux ─────────────────────────────────────
        {
            'nom': 'Poulet rôti aux herbes',
            'prix': Decimal('8500'),
            'categorie': 'Plat principal',
            'description': 'Demi-poulet rôti, herbes de Provence, accompagné de frites maison',
            'ingredients': 'Poulet, thym, romarin, ail, citron, pommes de terre',
            'disponible': True,
        },
        {
            'nom': 'Steak grillé sauce poivre',
            'prix': Decimal('12000'),
            'categorie': 'Plat principal',
            'description': 'Steak de bœuf grillé, sauce au poivre vert, frites',
            'ingredients': 'Bœuf, poivre vert, crème, cognac, beurre, pommes de terre',
            'disponible': True,
        },
        {
            'nom': 'Tilapia grillé sauce tomate',
            'prix': Decimal('9500'),
            'categorie': 'Plat principal',
            'description': 'Tilapia grillé entier, sauce tomate pimentée, alloco',
            'ingredients': 'Tilapia, tomates, oignons, piment, plantain, huile',
            'disponible': True,
        },
        {
            'nom': 'Riz au poulet djemba',
            'prix': Decimal('7000'),
            'categorie': 'Plat principal',
            'description': 'Riz parfumé accompagné de poulet en sauce djemba',
            'ingredients': 'Riz, poulet, tomates, oignons, épices locales',
            'disponible': True,
        },
        {
            'nom': 'Pâtes carbonara',
            'prix': Decimal('7500'),
            'categorie': 'Plat principal',
            'description': 'Spaghetti, lardons fumés, crème, parmesan, œuf',
            'ingredients': 'Spaghetti, lardons, crème fraîche, parmesan, œufs, poivre',
            'disponible': True,
        },
        {
            'nom': 'Burger maison',
            'prix': Decimal('8000'),
            'categorie': 'Plat principal',
            'description': 'Steak haché, cheddar, salade, tomate, oignons, sauce maison',
            'ingredients': 'Pain burger, steak haché, cheddar, salade, tomate, sauce burger',
            'disponible': True,
        },
        {
            'nom': 'Brochettes de bœuf',
            'prix': Decimal('9000'),
            'categorie': 'Plat principal',
            'description': 'Brochettes marinées, légumes grillés, sauce arachide',
            'ingredients': 'Bœuf, poivrons, oignons, arachides, épices',
            'disponible': True,
        },

        # ── Desserts ─────────────────────────────────────────────
        {
            'nom': 'Fondant au chocolat',
            'prix': Decimal('3500'),
            'categorie': 'Dessert',
            'description': 'Coulant au chocolat noir, cœur fondant, boule de glace vanille',
            'ingredients': 'Chocolat noir, beurre, œufs, farine, sucre, glace vanille',
            'disponible': True,
        },
        {
            'nom': 'Salade de fruits frais',
            'prix': Decimal('2500'),
            'categorie': 'Dessert',
            'description': 'Assortiment de fruits de saison, jus de citron, menthe',
            'ingredients': 'Mangue, ananas, papaye, banane, citron, menthe',
            'disponible': True,
        },
        {
            'nom': 'Crème brûlée',
            'prix': Decimal('3000'),
            'categorie': 'Dessert',
            'description': 'Crème vanillée caramélisée à la flamme',
            'ingredients': 'Crème, jaunes d\'œufs, sucre, vanille',
            'disponible': True,
        },
        {
            'nom': 'Banane flambée',
            'prix': Decimal('2800'),
            'categorie': 'Dessert',
            'description': 'Banane plantain flambée au rhum, glace vanille',
            'ingredients': 'Banane plantain, rhum, beurre, cassonade, glace',
            'disponible': True,
        },

        # ── Boissons ─────────────────────────────────────────────
        {
            'nom': 'Eau minérale (50cl)',
            'prix': Decimal('500'),
            'categorie': 'Boisson',
            'description': 'Eau minérale fraîche',
            'ingredients': 'Eau minérale',
            'disponible': True,
        },
        {
            'nom': 'Jus de bissap',
            'prix': Decimal('1000'),
            'categorie': 'Boisson',
            'description': 'Jus d\'hibiscus maison, sucré, servi frais',
            'ingredients': 'Fleurs d\'hibiscus, sucre, eau, gingembre',
            'disponible': True,
        },
        {
            'nom': 'Jus de gingembre-citron',
            'prix': Decimal('1200'),
            'categorie': 'Boisson',
            'description': 'Jus de gingembre frais pressé, citron, miel',
            'ingredients': 'Gingembre, citron, miel, eau',
            'disponible': True,
        },
        {
            'nom': 'Bière pression (25cl)',
            'prix': Decimal('1500'),
            'categorie': 'Boisson',
            'description': 'Bière locale pression bien fraîche',
            'ingredients': 'Bière',
            'disponible': True,
        },
        {
            'nom': 'Coca-Cola (33cl)',
            'prix': Decimal('800'),
            'categorie': 'Boisson',
            'description': 'Coca-Cola en bouteille, bien frais',
            'ingredients': 'Coca-Cola',
            'disponible': True,
        },

        # ── Snacks ───────────────────────────────────────────────
        {
            'nom': 'Frites maison',
            'prix': Decimal('1500'),
            'categorie': 'Snack',
            'description': 'Frites coupées maison, dorées et croustillantes',
            'ingredients': 'Pommes de terre, huile, sel',
            'disponible': True,
        },
        {
            'nom': 'Alloco',
            'prix': Decimal('1200'),
            'categorie': 'Snack',
            'description': 'Plantain frit, sauce pimentée',
            'ingredients': 'Plantain mûr, huile, piment, sel',
            'disponible': True,
        },
        {
            'nom': 'Sandwich club',
            'prix': Decimal('4500'),
            'categorie': 'Snack',
            'description': 'Sandwich triple couche, poulet, bacon, crudités, mayo',
            'ingredients': 'Pain de mie, poulet, bacon, tomate, salade, mayo',
            'disponible': True,
        },
    ]

    created = 0
    for p in plats_data:
        obj, created_flag = Plat.objects.get_or_create(
            nom=p['nom'],
            defaults={
                'prix': p['prix'],
                'categorie': p['categorie'],
                'description': p['description'],
                'ingredients': p['ingredients'],
                'disponible': p['disponible'],
            }
        )
        if created_flag:
            created += 1
            print(f"  ✓ {obj.nom} ({obj.categorie}) — {obj.prix} FCFA")
        else:
            print(f"  ⊙ Existe : {obj.nom}")

    print(f"✅ {created} plats créés, {len(plats_data) - created} existants\n")


# ================================================================
# PRODUITS EN STOCK
# ================================================================

def init_produits():
    print("📦 Initialisation des produits en stock...")

    produits_data = [

        # ── Viandes & Poissons ────────────────────────────────────
        {
            'nom': 'Poulet entier',
            'categorie': 'Viandes & Poissons',
            'description': 'Poulet frais entier pour rôtissage',
            'unite': 'kg',
            'qte_initiale': Decimal('20'),
            'seuil_alerte': Decimal('5'),
            'date_peremption': date(2026, 3, 25),
        },
        {
            'nom': 'Steak de bœuf',
            'categorie': 'Viandes & Poissons',
            'description': 'Steak de bœuf 200g pièce',
            'unite': 'kg',
            'qte_initiale': Decimal('15'),
            'seuil_alerte': Decimal('4'),
            'date_peremption': date(2026, 3, 22),
        },
        {
            'nom': 'Bœuf haché',
            'categorie': 'Viandes & Poissons',
            'description': 'Bœuf haché pour burgers et brochettes',
            'unite': 'kg',
            'qte_initiale': Decimal('10'),
            'seuil_alerte': Decimal('3'),
            'date_peremption': date(2026, 3, 21),
        },
        {
            'nom': 'Tilapia frais',
            'categorie': 'Viandes & Poissons',
            'description': 'Tilapia entier frais',
            'unite': 'kg',
            'qte_initiale': Decimal('12'),
            'seuil_alerte': Decimal('3'),
            'date_peremption': date(2026, 3, 20),
        },
        {
            'nom': 'Lardons fumés',
            'categorie': 'Viandes & Poissons',
            'description': 'Lardons fumés en sachet',
            'unite': 'kg',
            'qte_initiale': Decimal('5'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 4, 15),
        },

        # ── Légumes & Fruits ──────────────────────────────────────
        {
            'nom': 'Tomates fraîches',
            'categorie': 'Légumes & Fruits',
            'description': 'Tomates fraîches locales',
            'unite': 'kg',
            'qte_initiale': Decimal('20'),
            'seuil_alerte': Decimal('5'),
            'date_peremption': date(2026, 3, 24),
        },
        {
            'nom': 'Oignons',
            'categorie': 'Légumes & Fruits',
            'description': 'Oignons blancs et rouges',
            'unite': 'kg',
            'qte_initiale': Decimal('15'),
            'seuil_alerte': Decimal('4'),
            'date_peremption': date(2026, 4, 30),
        },
        {
            'nom': 'Pommes de terre',
            'categorie': 'Légumes & Fruits',
            'description': 'Pommes de terre pour frites et accompagnements',
            'unite': 'kg',
            'qte_initiale': Decimal('30'),
            'seuil_alerte': Decimal('8'),
            'date_peremption': date(2026, 4, 15),
        },
        {
            'nom': 'Plantain mûr',
            'categorie': 'Légumes & Fruits',
            'description': 'Banane plantain bien mûre pour alloco',
            'unite': 'kg',
            'qte_initiale': Decimal('20'),
            'seuil_alerte': Decimal('5'),
            'date_peremption': date(2026, 3, 23),
        },
        {
            'nom': 'Salade romaine',
            'categorie': 'Légumes & Fruits',
            'description': 'Salade romaine fraîche',
            'unite': 'kg',
            'qte_initiale': Decimal('8'),
            'seuil_alerte': Decimal('2'),
            'date_peremption': date(2026, 3, 20),
        },
        {
            'nom': 'Ail',
            'categorie': 'Légumes & Fruits',
            'description': 'Ail frais en tête',
            'unite': 'kg',
            'qte_initiale': Decimal('5'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 5, 30),
        },
        {
            'nom': 'Citrons',
            'categorie': 'Légumes & Fruits',
            'description': 'Citrons verts frais',
            'unite': 'kg',
            'qte_initiale': Decimal('6'),
            'seuil_alerte': Decimal('2'),
            'date_peremption': date(2026, 3, 28),
        },
        {
            'nom': 'Mangues',
            'categorie': 'Légumes & Fruits',
            'description': 'Mangues locales pour salade de fruits',
            'unite': 'kg',
            'qte_initiale': Decimal('10'),
            'seuil_alerte': Decimal('3'),
            'date_peremption': date(2026, 3, 22),
        },

        # ── Épicerie & Féculents ──────────────────────────────────
        {
            'nom': 'Riz long grain',
            'categorie': 'Épicerie & Féculents',
            'description': 'Riz long grain parfumé',
            'unite': 'kg',
            'qte_initiale': Decimal('50'),
            'seuil_alerte': Decimal('10'),
            'date_peremption': date(2027, 12, 31),
        },
        {
            'nom': 'Spaghetti',
            'categorie': 'Épicerie & Féculents',
            'description': 'Pâtes spaghetti n°5',
            'unite': 'kg',
            'qte_initiale': Decimal('15'),
            'seuil_alerte': Decimal('4'),
            'date_peremption': date(2027, 6, 30),
        },
        {
            'nom': 'Farine de blé',
            'categorie': 'Épicerie & Féculents',
            'description': 'Farine blanche tout usage',
            'unite': 'kg',
            'qte_initiale': Decimal('20'),
            'seuil_alerte': Decimal('5'),
            'date_peremption': date(2026, 12, 31),
        },
        {
            'nom': 'Pain de mie',
            'categorie': 'Épicerie & Féculents',
            'description': 'Pain de mie tranché pour sandwiches',
            'unite': 'paquet',
            'qte_initiale': Decimal('20'),
            'seuil_alerte': Decimal('5'),
            'date_peremption': date(2026, 3, 21),
        },
        {
            'nom': 'Pain burger',
            'categorie': 'Épicerie & Féculents',
            'description': 'Pains à burger briochés',
            'unite': 'pièce',
            'qte_initiale': Decimal('50'),
            'seuil_alerte': Decimal('10'),
            'date_peremption': date(2026, 3, 22),
        },

        # ── Produits laitiers ─────────────────────────────────────
        {
            'nom': 'Crème fraîche',
            'categorie': 'Produits laitiers',
            'description': 'Crème fraîche épaisse 30% MG',
            'unite': 'L',
            'qte_initiale': Decimal('8'),
            'seuil_alerte': Decimal('2'),
            'date_peremption': date(2026, 3, 28),
        },
        {
            'nom': 'Parmesan râpé',
            'categorie': 'Produits laitiers',
            'description': 'Parmesan râpé en sachet',
            'unite': 'kg',
            'qte_initiale': Decimal('3'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 6, 30),
        },
        {
            'nom': 'Cheddar tranché',
            'categorie': 'Produits laitiers',
            'description': 'Cheddar en tranches pour burgers',
            'unite': 'kg',
            'qte_initiale': Decimal('3'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 4, 15),
        },
        {
            'nom': 'Beurre',
            'categorie': 'Produits laitiers',
            'description': 'Beurre doux en motte',
            'unite': 'kg',
            'qte_initiale': Decimal('5'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 4, 30),
        },
        {
            'nom': 'Œufs',
            'categorie': 'Produits laitiers',
            'description': 'Œufs frais calibre moyen',
            'unite': 'pièce',
            'qte_initiale': Decimal('100'),
            'seuil_alerte': Decimal('24'),
            'date_peremption': date(2026, 3, 31),
        },

        # ── Boissons ──────────────────────────────────────────────
        {
            'nom': 'Eau minérale 50cl',
            'categorie': 'Boissons',
            'description': 'Bouteille d\'eau minérale 50cl',
            'unite': 'bouteille',
            'qte_initiale': Decimal('100'),
            'seuil_alerte': Decimal('20'),
            'date_peremption': date(2027, 12, 31),
        },
        {
            'nom': 'Coca-Cola 33cl',
            'categorie': 'Boissons',
            'description': 'Canette Coca-Cola 33cl',
            'unite': 'bouteille',
            'qte_initiale': Decimal('60'),
            'seuil_alerte': Decimal('12'),
            'date_peremption': date(2027, 6, 30),
        },
        {
            'nom': 'Bière locale',
            'categorie': 'Boissons',
            'description': 'Bière pression locale en fût',
            'unite': 'L',
            'qte_initiale': Decimal('50'),
            'seuil_alerte': Decimal('10'),
            'date_peremption': date(2026, 6, 30),
        },
        {
            'nom': "Fleurs d'hibiscus (bissap)",
            'categorie': 'Boissons',
            'description': "Fleurs d'hibiscus séchées pour jus",
            'unite': 'kg',
            'qte_initiale': Decimal('5'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 12, 31),
        },
        {
            'nom': 'Gingembre frais',
            'categorie': 'Boissons',
            'description': 'Gingembre frais pour jus',
            'unite': 'kg',
            'qte_initiale': Decimal('4'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 4, 15),
        },

        # ── Épices & Condiments ───────────────────────────────────
        {
            'nom': 'Huile végétale',
            'categorie': 'Épices & Condiments',
            'description': 'Huile de palme raffinée ou tournesol pour friture',
            'unite': 'L',
            'qte_initiale': Decimal('20'),
            'seuil_alerte': Decimal('4'),
            'date_peremption': date(2026, 12, 31),
        },
        {
            'nom': 'Sel',
            'categorie': 'Épices & Condiments',
            'description': 'Sel de cuisine iodé',
            'unite': 'kg',
            'qte_initiale': Decimal('10'),
            'seuil_alerte': Decimal('2'),
            'date_peremption': date(2028, 12, 31),
        },
        {
            'nom': 'Poivre noir moulu',
            'categorie': 'Épices & Condiments',
            'description': 'Poivre noir moulu en pot',
            'unite': 'g',
            'qte_initiale': Decimal('500'),
            'seuil_alerte': Decimal('100'),
            'date_peremption': date(2027, 12, 31),
        },
        {
            'nom': 'Piment frais',
            'categorie': 'Épices & Condiments',
            'description': 'Piment rouge et vert frais',
            'unite': 'kg',
            'qte_initiale': Decimal('3'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 3, 28),
        },
        {
            'nom': 'Sauce arachide',
            'categorie': 'Épices & Condiments',
            'description': 'Pâte d\'arachide pour sauces',
            'unite': 'kg',
            'qte_initiale': Decimal('5'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 6, 30),
        },
        {
            'nom': 'Sucre',
            'categorie': 'Épices & Condiments',
            'description': 'Sucre blanc cristallisé',
            'unite': 'kg',
            'qte_initiale': Decimal('15'),
            'seuil_alerte': Decimal('3'),
            'date_peremption': date(2028, 12, 31),
        },

        # ── Chocolat & Desserts ───────────────────────────────────
        {
            'nom': 'Chocolat noir pâtissier',
            'categorie': 'Chocolat & Desserts',
            'description': 'Chocolat noir 70% cacao pour fondants',
            'unite': 'kg',
            'qte_initiale': Decimal('5'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2026, 12, 31),
        },
        {
            'nom': 'Glace vanille',
            'categorie': 'Chocolat & Desserts',
            'description': 'Crème glacée vanille en bac',
            'unite': 'L',
            'qte_initiale': Decimal('8'),
            'seuil_alerte': Decimal('2'),
            'date_peremption': date(2026, 8, 31),
        },
        {
            'nom': 'Rhum brun',
            'categorie': 'Chocolat & Desserts',
            'description': 'Rhum brun pour flambage',
            'unite': 'bouteille',
            'qte_initiale': Decimal('4'),
            'seuil_alerte': Decimal('1'),
            'date_peremption': date(2030, 12, 31),
        },
    ]

    created = 0
    for p in produits_data:
        u = unite(p['unite'])
        produit, created_flag = Produit.objects.get_or_create(
            nom=p['nom'],
            defaults={
                'categorie': p['categorie'],
                'description': p['description'],
                'unite': u,
                'seuil_alerte': p['seuil_alerte'],
                'date_peremption': p.get('date_peremption'),
            }
        )
        if created_flag:
            Stock.objects.get_or_create(
                produit=produit,
                defaults={'quantite_dispo': p['qte_initiale']}
            )
            created += 1
            print(f"  ✓ {produit.nom} ({produit.categorie}) — {p['qte_initiale']} {p['unite']}")
        else:
            print(f"  ⊙ Existe : {produit.nom}")

    print(f"✅ {created} produits créés, {len(produits_data) - created} existants\n")


# ================================================================
# MAIN
# ================================================================

def run_all():
    print("=" * 60)
    print("🚀 INITIALISATION DU CATALOGUE")
    print("=" * 60)
    print()

    try:
        init_plats()
        init_produits()

        print("=" * 60)
        print("✅ CATALOGUE INITIALISÉ AVEC SUCCÈS !")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ ERREUR : {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    run_all()
