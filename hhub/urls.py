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
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from hhub import views

urlpatterns = [
    path(
        # Set base path
        r"api/",
        include(
            [
                # Serve the OpenAPI schema
                path("schema/", SpectacularAPIView.as_view(), name="schema"),
                # Serve the Swagger UI to browse the OpenAPI schema
                path(
                    "schema/swagger-ui/",
                    SpectacularSwaggerView.as_view(url_name="schema"),
                    name="swagger-ui",
                ),
                path("entry/<slug:pk>.json", views.entry_manifest),
                path("all", views.entries_all),
                path("stats", views.stats),
                path("search", views.search_entries),
            ]
        ),
    )
]
