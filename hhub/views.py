from django.http import HttpResponse, JsonResponse

from hhub.models import Entry
from hhub.serializers import EntrySerializer
import json


def entry_manifest(request, pk):
    try:
        entry = Entry.objects.get(pk=pk)
    except Entry.DoesNotExist:
        return JsonResponse(
            {'error': 'No entry found in the database with the given slug'}, status=404
        )

    data = open(f'database/entries/{pk}/game.json').read()
    jsonData = json.loads(data)
    return JsonResponse(jsonData)


def entries_all(request):
    entries = Entry.objects.all()
    serializer = EntrySerializer(entries, many=True)
    return JsonResponse(serializer.data, safe=False)
