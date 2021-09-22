from django.http import HttpResponse, JsonResponse

from hhub.models import Entry
from hhub.serializers import EntrySerializer
import json
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger


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
    sort_by = request.GET.get('sort_by', 1)
    order_by = request.GET.get('order_by', 1)

    entries = Entry.objects.all()

    # sort and order
    # it would be meaningless to have a sort without an order
    # order_by a specific field from schema
    if order_by != 1 and order_by != "":
        # specify an order --> asc is by default, so we're not dealing with it
        if sort_by != 1 and sort_by != "" and sort_by.lower() != "asc":
            entries = entries.order_by("-" + order_by.lower())  # order_by desc order
        else:
            entries = entries.order_by(order_by.lower())        # by default: sort by asc order
    else:
        # TODO: should we notify the user about a malformed query in case of empty order_by param? e.g. /api/all?order_by=&page=2
        pass

    paginator = Paginator(entries, 10)
    page = request.GET.get('page', 1)
    results = len(entries)
    try:
        entries = paginator.page(page)
    except PageNotAnInteger:
        entries = paginator.page(1)
        page = 1
    except EmptyPage:
        entries = paginator.page(paginator.num_pages)
        page = paginator.num_pages

    serializer = EntrySerializer(entries, many=True)

    json_entries = []
    for entry in entries:
        data = open(f'database/entries/{entry.slug}/game.json').read()
        json_entries.append(json.loads(data))
    return JsonResponse(
        {
            'results': results,
            'page_total': paginator.num_pages,
            'page_current': page,
            'page_elements': len(serializer.data),
            'entries': json_entries,
        },
        safe=False,
    )
    return JsonResponse(serializer.data, safe=False)


def search_entries(request):
    # Catch query params
    page = request.GET.get('page', '')
    developer = request.GET.get('developer', '')
    title = request.GET.get('title', '')
    typetag = request.GET.get('typetag', '')
    tags = request.GET.get('tags', '')
    platform = request.GET.get('platform', '')

    # Start selecting everything
    entries = Entry.objects.all()

    if developer:
        entries = entries.filter(developer=developer)

    if platform:
        entries = entries.filter(platform=platform)

    if typetag:
        entries = entries.filter(typetag=typetag)

    if title:
        entries = entries.filter(title__contains=title)

    paginator = Paginator(entries, 10)
    results = len(entries)
    try:
        entries = paginator.page(page)
    except PageNotAnInteger:
        entries = paginator.page(1)
        page = 1
    except EmptyPage:
        entries = paginator.page(paginator.num_pages)
        page = paginator.num_pages

    serializer = EntrySerializer(entries, many=True)

    json_entries = []
    for entry in entries:
        data = open(f'database/entries/{entry.slug}/game.json').read()
        json_entries.append(json.loads(data))
    return JsonResponse(
        {
            'results': results,
            'page_total': paginator.num_pages,
            'page_current': page,
            'page_elements': len(serializer.data),
            'entries': json_entries,
        },
        safe=False,
    )
    return JsonResponse(serializer.data, safe=False)


def entry_platform(request, platform):
    return
