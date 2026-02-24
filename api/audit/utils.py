from .models import LogAudit


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT', '')


def log_action(user, action, type_action, description, table_name='',
               record_id=None, old_values=None, new_values=None, request=None):
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
        new_values=new_values
    )
