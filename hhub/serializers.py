from rest_framework import serializers
from hhub.models import Entry


class EntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ["slug", "platform", "developer", "title", "typetag"]
