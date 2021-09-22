"""hhub URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import include, path
from hhub import views


urlpatterns = [
    path(
        # Set base path
        r"api/",
        include(
            [
                path('entry/<slug:pk>', views.entry_manifest),
                path('entry/<slug:pk>/<str:filename>', views.entry_download_file),
                path('all', views.entries_all),
                path('search', views.search_entries),
            ]
        ),
    )
]
