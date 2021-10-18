from django.http import HttpResponse, JsonResponse

from hhub.models import Entry
from hhub.serializers import EntrySerializer
import json
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.exceptions import FieldError

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
    sort_by_param = request.GET.get('sort_by', '')
    order_by_param = request.GET.get('order_by', '')

    entries = Entry.objects.all()

    # sort and order
    # it would be meaningless to have a sort without an order
    try:
        entries = sort_and_order(entries, order_by_param, sort_by_param)
    except FieldError as e:
        return JsonResponse(
            {'error': str(e) }, status=400
        )

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
    order_by_param = request.GET.get('order_by', '')
    sort_by_param = request.GET.get('sort', '')
    
    # Start selecting everything
    entries = Entry.objects.all()

    # sort and order
    if sort_by_param:
        entries = sort_and_order(entries, order_by_param, sort_by_param)

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

#########
# UTILS #
#########
def sort_and_order(entries, col_name, sort_by_param):
    # regardless what user has submitted, we lowercase the input
    col_name = col_name.lower().strip()  
    sort_by_param = sort_by_param.lower().strip()
    
    # if col_name has been specified and it is in allowed list of fields, check if sort has been specified
    if col_name in ["slug", "title"]:
        if sort_by_param in ["", "asc", "desc"]:
            if sort_by_param == "asc" or not sort_by_param:
                return entries.order_by(col_name)
            elif sort_by_param == "desc":
                # minus here means "desc" order, according to 
                # https://docs.djangoproject.com/en/dev/ref/models/querysets/#order-by
                return entries.order_by("-" + col_name)
        else:
            return entries.order_by(col_name)
    elif sort_by_param in ["", "asc", "desc"]:
        # default sorting: slug, asc order
        if sort_by_param == "asc" or not sort_by_param:
            return entries.order_by("slug")
        elif sort_by_param == "desc":
            # minus here means "desc" order, according to 
            # https://docs.djangoproject.com/en/dev/ref/models/querysets/#order-by
            return entries.order_by("-slug") 
    
    return entries