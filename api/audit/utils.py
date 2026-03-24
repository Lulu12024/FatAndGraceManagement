import logging
from .models import LogAudit

logger = logging.getLogger(__name__)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT', '')


def serialize_instance(instance, fields):
    """Sérialise un objet Django en dict pour old_values/new_values."""
    result = {}
    for field in fields:
        try:
            val = getattr(instance, field, None)
            if hasattr(val, 'pk'):
                result[field] = str(val)
            elif hasattr(val, 'isoformat'):
                result[field] = val.isoformat()
            else:
                result[field] = val
        except Exception:
            result[field] = None
    return result


def log_action(user, action, type_action, description, table_name='',
               record_id=None, old_values=None, new_values=None, request=None):
    """
    Crée un log d'audit. Ne fait jamais planter l'action principale.
    """
    try:
        ip_address = get_client_ip(request) if request else None
        user_agent = get_user_agent(request) if request else ''

        LogAudit.objects.create(
            user=user,
            action=action,
            type_action=type_action,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
        )
    except Exception as e:
        # Le log ne doit jamais bloquer l'action principale
        logger.error(f"[AUDIT] Échec log_action ({type_action}): {e}")