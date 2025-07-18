from django.contrib.postgres.fields import ArrayField
from django.db import models


class Entry(models.Model):
    slug = models.TextField(primary_key=True)
    platform = models.TextField()
    developer = models.TextField(null=True)
    title = models.TextField()
    typetag = models.TextField(null=True)
    tags = ArrayField(models.TextField(), null=True)
    # Where is this entry on disk?
    basepath = models.TextField(default="")
    # This is used to generate the "Improve metadata" links
    baserepo = models.TextField(null=True)
    devtoolinfo = models.JSONField(null=True)
    published_date = models.DateField(default=None, null=True)
    firstadded_date = models.DateTimeField(default=None, null=True)
    thirdparty = ArrayField(models.TextField(), null=True, default=list)

    class Meta:
        ordering = ["slug"]


class File(models.Model):
    entry = models.ForeignKey(Entry, related_name="files", on_delete=models.CASCADE)
    name = models.TextField()
    file_hash = models.CharField(max_length=64, db_index=True)
    playable = models.BooleanField(default=False)
