from django.db import migrations


def migrate_livree_to_en_attente_paiement(apps, schema_editor):
    """Migrate existing LIVREE orders to EN_ATTENTE_PAIEMENT"""
    Commande = apps.get_model('commandes', 'Commande')
    updated = Commande.objects.filter(statut='LIVREE').update(statut='EN_ATTENTE_PAIEMENT')
    if updated:
        print(f"\n  {updated} commande(s) LIVREE migree(s) vers EN_ATTENTE_PAIEMENT")


def reverse_migration(apps, schema_editor):
    """Reverse: EN_ATTENTE_PAIEMENT back to LIVREE"""
    Commande = apps.get_model('commandes', 'Commande')
    Commande.objects.filter(statut='EN_ATTENTE_PAIEMENT').update(statut='LIVREE')


class Migration(migrations.Migration):

    dependencies = [
        ('commandes', '0006_order_payment_lifecycle'),
    ]

    operations = [
        migrations.RunPython(
            migrate_livree_to_en_attente_paiement,
            reverse_code=reverse_migration,
        ),
    ]
