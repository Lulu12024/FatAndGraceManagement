
import json
import logging
from django.conf import settings
 
logger = logging.getLogger(__name__)
 
def send_push_to_user(user, title, body, url="/", tag="fg-notif"):
    """
    Envoie une notification push à tous les devices abonnés d'un utilisateur.
    Usage :
        from .push_utils import send_push_to_user
        send_push_to_user(commande.serveur, "Commande prête", "Table 03 — CMD-012")
    """
    try:
        from pywebpush import webpush, WebPushException
        from commandes.models import PushSubscription  # adapter l'import selon votre structure
    except ImportError:
        logger.warning("[Push] pywebpush non installé — pip install pywebpush")
        return
 
    subscriptions = PushSubscription.objects.filter(user=user)
    payload = json.dumps({
        "title": title,
        "body":  body,
        "url":   url,
        "tag":   tag,
    })
 
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth":   sub.auth,
                    },
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=settings.VAPID_CLAIMS,
            )
        except Exception as e:
            logger.warning(f"[Push] Erreur envoi à {user}: {e}")
            # Si l'endpoint est mort (410 Gone), supprimer l'abonnement
            if hasattr(e, "response") and e.response and e.response.status_code in (404, 410):
                sub.delete()
 
 
def send_push_to_role(role_name, title, body, url="/", tag="fg-notif"):
    """
    Envoie une push à tous les utilisateurs d'un rôle donné.
    Usage :
        send_push_to_role("cuisinier", "Nouvelle commande", "Table 03")
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    users = User.objects.filter(role__nom__iexact=role_name, is_active=True)
    for user in users:
        send_push_to_user(user, title, body, url, tag)
 
 