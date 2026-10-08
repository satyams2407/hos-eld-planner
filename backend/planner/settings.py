import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'assessment-development-key-change-me')
DEBUG = os.getenv('DJANGO_DEBUG', '1') == '1'
ALLOWED_HOSTS = ['*']
ROOT_URLCONF = 'planner.urls'
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]
INSTALLED_APPS = []
TEMPLATES = []
WSGI_APPLICATION = 'planner.wsgi.application'
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [x.strip() for x in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',') if x.strip()]
NOMINATIM_URL = os.getenv('GEOCODING_API_URL', 'https://nominatim.openstreetmap.org/search')
ROUTING_API_URL = os.getenv('ROUTING_API_URL', 'https://router.project-osrm.org/route/v1/driving')
NOMINATIM_USER_AGENT = os.getenv('NOMINATIM_USER_AGENT', 'HOS-ELD-Assessment/1.0')
