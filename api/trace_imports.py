import os
import django
import sys

print("Starting import tracer...")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stock_management.settings')

try:
    print("Setting up Django...")
    django.setup()
    print("Django setup complete.")
    
    print("Importing users.views...")
    from users import views
    print("users.views imported.")
    
    print("Importing commandes.views...")
    from commandes import views
    print("commandes.views imported.")
    
    print("Importing stocks.views...")
    from stocks import views
    print("stocks.views imported.")
    
    print("Importing audit.views...")
    from audit import views
    print("audit.views imported.")
    
    print("Importing audit.reports...")
    from audit import reports
    print("audit.reports imported.")
    
    print("All imports complete.")
except Exception as e:
    print(f"Error during import: {e}")
    import traceback
    traceback.print_exc()
