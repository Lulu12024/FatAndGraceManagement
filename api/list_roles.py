import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stock_management.settings')
django.setup()

from users.models import Role
for role in Role.objects.all():
    print(f"Role ID: {role.id}, Name: {role.nom}")
