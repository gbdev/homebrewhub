from django.db import models


class Entry(models.Model):
    slug = models.TextField(primary_key=True)
    platform = models.TextField()
    developer = models.TextField(null=True)
    title = models.TextField()
    typetag = models.TextField(null=True)

    class Meta:
        ordering = ["slug"]
