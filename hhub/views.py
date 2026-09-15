import json

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import F, Q
from django.http import JsonResponse, Http404

from hhub.models import Entry, Event, File
from hhub.serializers import EntrySerializer

from drf_spectacular.utils import (
    extend_schema,
    inline_serializer,
    OpenApiParameter,
    OpenApiTypes,
)

from rest_framework import serializers
from rest_framework.decorators import api_view


def entry_manifest(request, pk):
    """
    Check if an entry with the given slug exists,
    reads its JSON manifest from disk and returns it
    """
    try:
        entry = Entry.objects.get(pk=pk)
    except Entry.DoesNotExist:
        return JsonResponse(
            {"error": "No entry found in the database with the given slug"}, status=404
        )

    # Manifests need to stay on disk (and not serialized/deserialized from db)
    # because that way they can be versioned and modified through PRs
    data = open(f"db-sources/{entry.basepath}/entries/{pk}/game.json").read()
    json_data = json.loads(data)

    merged_json_data = merge_manifest_data(json_data, entry)
    return JsonResponse(merged_json_data)


def event_manifest(request, pk):
    """
    Check if an event with the given slug exists,
    reads its JSON manifest from disk and returns it
    """
    try:
        event = Event.objects.get(pk=pk)
    except Event.DoesNotExist:
        return JsonResponse(
            {"error": "No event found in the database with the given slug"}, status=404
        )

    data = open(f"db-sources/{event.basepath}/events/{pk}/event.json").read()
    json_data = json.loads(data)

    merged_json_data = merge_event_manifest_data(json_data, event)
    return JsonResponse(merged_json_data)


@extend_schema(
    summary="Reverse search files by hash",
    description="Returns a list of entries whose files match the given SHA-256 hash.",
    parameters=[
        OpenApiParameter(
            "hash",
            OpenApiTypes.STR,
            location=OpenApiParameter.PATH,
            description="SHA-256 hash of the file",
        ),
    ],
    responses={
        200: inline_serializer(
            name="FileMatchList",
            fields={
                "entry_id": serializers.CharField(),
                "name": serializers.CharField(),
            },
            many=True,
        ),
        404: OpenApiTypes.OBJECT,
    },
)
@api_view(["GET"])
def search_hash(request, hash):
    """
    GET /search/<hash>/
    -------------------
    • 404  if no File rows match *hash*
    • JSON list of File rows otherwise (length ≥ 1)

    The response body is **always** a list.
    Use `safe=False` so `JsonResponse` can emit a top-level JSON array.
    """
    qs = File.objects.filter(file_hash=hash).select_related("entry")

    if not qs.exists():
        raise Http404("No file found with given hash")

    payload = [_file_payload(f) for f in qs]

    return JsonResponse(payload, safe=False)


def _file_payload(f):
    """Serialize a File instance into a plain-dict."""
    return {
        "entry_id": f.entry_id,
        "name": f.name,
    }


@extend_schema(
    summary="Search entries",
    description="Returns entries matching the given filter parameters. If no filters are specified, all entries are returned.",
    parameters=[
        OpenApiParameter(
            "developer", OpenApiTypes.STR, description="Filter by developer name"
        ),
        OpenApiParameter(
            "title", OpenApiTypes.STR, description="Filter by title (substring match)"
        ),
        OpenApiParameter(
            "typetag",
            OpenApiTypes.STR,
            description="Filter by type tag (e.g. game, demo, music)",
        ),
        OpenApiParameter(
            "tags",
            OpenApiTypes.STR,
            description="Comma-separated list of tags to filter by",
        ),
        OpenApiParameter(
            "platform",
            OpenApiTypes.STR,
            description="Filter by platform (e.g. GB, GBC, GBA, NES)",
        ),
        OpenApiParameter(
            "q", OpenApiTypes.STR, description="Full-text search across title and slug"
        ),
        OpenApiParameter(
            "random", OpenApiTypes.BOOL, description="Return results in random order"
        ),
        OpenApiParameter(
            "thirdparty",
            OpenApiTypes.STR,
            description="Filter by third-party store presence",
        ),
        OpenApiParameter("page", OpenApiTypes.INT, description="Page number"),
        OpenApiParameter(
            "results",
            OpenApiTypes.INT,
            description="Number of results per page (default: 10)",
        ),
        OpenApiParameter(
            "sort",
            OpenApiTypes.STR,
            description="Sort key: slug, title, published_date, firstadded_date (default: firstadded_date)",
        ),
        OpenApiParameter(
            "order",
            OpenApiTypes.STR,
            description="Sort direction: asc or desc (default: desc)",
        ),
    ],
    responses={
        200: inline_serializer(
            name="SearchEntriesResponse",
            fields={
                "results": serializers.IntegerField(),
                "page_total": serializers.IntegerField(),
                "page_current": serializers.IntegerField(),
                "page_elements": serializers.IntegerField(),
                "sort": serializers.CharField(),
                "order": serializers.CharField(),
                "entries": serializers.ListField(child=serializers.DictField()),
            },
        ),
    },
)
@api_view(["GET"])
def search_entries(request):
    """
    Returns every entry matching the conditions given in the query
    parameters. If not filter is specified, everything is returned.

    Every entry is represented by its manifest, read from disk.
    """
    # Parse query params, providing defaults
    # Filters
    developer = request.GET.get("developer", "")
    title = request.GET.get("title", "")
    typetag = request.GET.get("typetag", "")
    tags = request.GET.get("tags", "")
    platform = request.GET.get("platform", "")
    text_query = request.GET.get("q", "")
    random_query = request.GET.get("random", False)
    thirdparty = request.GET.get("thirdparty", "")

    # Pagination
    # Request a specific page
    page = request.GET.get("page", "")
    # Request a specific number of results (>1,<30)
    num_elements = request.GET.get("results", 10)

    # Order and sort

    # Ordering key
    #  by default, sort by date of addition to the database
    sort_key = request.GET.get("sort", "firstadded_date")
    # Direction of desired ordering (ascending or descending)
    order = request.GET.get("order", "desc")

    # Start by selecting everything
    entries = Entry.objects.all()

    # Boundaries for elements per page
    # if num_elements <= 1:
    #    num_elements = 1
    # elif num_elements >= 30:
    #    num_elements = 30

    if thirdparty:
        entries = entries.filter(thirdparty__contains=[thirdparty])

    if developer:
        entries = entries.filter(developer=developer)

    if platform:
        entries = entries.filter(platform=platform)

    if typetag:
        entries = entries.filter(typetag=typetag)

    if title:
        entries = entries.filter(title__contains=title)

    if tags:
        # Read the value of tags as an array of tags separated by commas
        tags = tags.split(",")
        entries = entries.filter(tags__contains=tags)
    if text_query:
        entries = entries.filter(
            Q(title__icontains=text_query) | Q(slug__icontains=text_query)
        )
    results = len(entries)

    if random_query:
        entries = entries.order_by("?")
    else:
        entries = sort_entries(entries, sort_key, order)

    # Prepare paginators and number of results
    paginator = Paginator(entries, num_elements)

    # Request the desired page of results
    try:
        entries = paginator.page(page)
    except PageNotAnInteger:
        entries = paginator.page(1)
        page = 1
    except EmptyPage:
        entries = paginator.page(paginator.num_pages)
        page = paginator.num_pages

    serializer = EntrySerializer(entries, many=True)

    # Read from disks the manifests of the result entries
    json_entries = []
    for entry in entries:
        data = open(
            f"db-sources/{entry.basepath}/entries/{entry.slug}/game.json"
        ).read()
        json_data = json.loads(data)

        merged_json_data = merge_manifest_data(json_data, entry)

        json_entries.append(merged_json_data)

    # Prepare final JSON response
    return JsonResponse(
        {
            # total number of results from the query
            "results": results,
            # total number of pages
            "page_total": paginator.num_pages,
            # current request page
            "page_current": int(page),
            # number of elements in this page
            "page_elements": len(serializer.data),
            "sort": sort_key,
            "order": order,
            # array of entries manifests
            "entries": json_entries,
        },
        # Allow non-dict instances to be passed and serialized
        safe=False,
    )


@extend_schema(
    summary="Search events",
    description="Returns events matching the given title filter. If no filter is specified, all events are returned.",
    parameters=[
        OpenApiParameter(
            "title",
            OpenApiTypes.STR,
            description="Filter by event name (substring match)",
        ),
        OpenApiParameter("page", OpenApiTypes.INT, description="Page number"),
        OpenApiParameter(
            "results",
            OpenApiTypes.INT,
            description="Number of results per page (default: 10)",
        ),
    ],
    responses={
        200: inline_serializer(
            name="SearchEventsResponse",
            fields={
                "results": serializers.IntegerField(),
                "page_total": serializers.IntegerField(),
                "page_current": serializers.IntegerField(),
                "page_elements": serializers.IntegerField(),
                "events": serializers.ListField(child=serializers.DictField()),
            },
        ),
    },
)
@api_view(["GET"])
def search_events(request):
    """
    Returns every event matching the title filter given in the query
    parameters. If no filter is specified, everything is returned.

    Every event is represented by its manifest, read from disk.
    """
    title = request.GET.get("title", "")

    # Pagination
    # Request a specific page
    page = request.GET.get("page", "")
    # Request a specific number of results (>1,<30)
    num_elements = request.GET.get("results", 10)

    events = Event.objects.all()

    if title:
        events = events.filter(name__icontains=title)

    results = len(events)

    # Prepare paginators and number of results
    paginator = Paginator(events, num_elements)

    # Request the desired page of results
    try:
        events = paginator.page(page)
    except PageNotAnInteger:
        events = paginator.page(1)
        page = 1
    except EmptyPage:
        events = paginator.page(paginator.num_pages)
        page = paginator.num_pages

    # Read from disk the manifests of the result events
    json_events = []
    for event in events:
        data = open(
            f"db-sources/{event.basepath}/events/{event.slug}/event.json"
        ).read()
        json_data = json.loads(data)

        merged_json_data = merge_event_manifest_data(json_data, event)

        json_events.append(merged_json_data)

    return JsonResponse(
        {
            # total number of results from the query
            "results": results,
            # total number of pages
            "page_total": paginator.num_pages,
            # current request page
            "page_current": int(page),
            # number of elements in this page
            "page_elements": len(json_events),
            # array of event manifests
            "events": json_events,
        },
        safe=False,
    )


@extend_schema(
    summary="Get statistics about the entries in the database",
    description="Retrieve aggregated counts of entries by type, tags, and platforms.",
    responses={
        200: inline_serializer(
            name="StatsResponse",
            fields={
                "total": serializers.IntegerField(),
                "typetag": inline_serializer(
                    name="TypetagStats",
                    fields={
                        "game": serializers.IntegerField(),
                        "demo": serializers.IntegerField(),
                        "music": serializers.IntegerField(),
                        "tools": serializers.IntegerField(),
                    },
                ),
                "tags": inline_serializer(
                    name="TagStats",
                    fields={
                        "oss": serializers.IntegerField(),
                        "puzzle": serializers.IntegerField(),
                        "rpg": serializers.IntegerField(),
                        "platform": serializers.IntegerField(),
                    },
                ),
                "platforms": inline_serializer(
                    name="PlatformStats",
                    fields={
                        "gba": serializers.IntegerField(),
                        "gbc": serializers.IntegerField(),
                        "gb": serializers.IntegerField(),
                        "nes": serializers.IntegerField(),
                    },
                ),
            },
        ),
    },
)
@api_view(["GET"])
def stats(request):
    entries = Entry.objects
    data = {
        "total": entries.all().count(),
        "typetag": {
            "game": entries.filter(typetag="game").count(),
            "demo": entries.filter(typetag="demo").count(),
            "music": entries.filter(typetag="music").count(),
            "tools": entries.filter(typetag="homebrew").count(),
        },
        "tags": {
            "oss": entries.filter(tags__contains=["Open Source"]).count(),
            "puzzle": entries.filter(tags__contains=["Puzzle"]).count(),
            "rpg": entries.filter(tags__contains=["RPG"]).count(),
            "platform": entries.filter(tags__contains=["Platform"]).count(),
        },
        "platforms": {
            "gba": entries.filter(platform="GBA").count(),
            "gbc": entries.filter(platform="GBC").count(),
            "gb": entries.filter(platform="GB").count(),
            "nes": entries.filter(platform="NES").count(),
        },
    }

    return JsonResponse(data)


def merge_manifest_data(data, entry):
    # Enrich the manifest with some values available only in the (postgres) database
    additional_json_data = {
        "basepath": entry.basepath,
        "baserepo": entry.baserepo,
        "firstadded_date": entry.firstadded_date,
        "devtoolinfo": entry.devtoolinfo,
    }

    return {**data, **additional_json_data}


def merge_event_manifest_data(data, event):
    # Enrich the manifest with some values available only in the (postgres) database
    additional_json_data = {
        "basepath": event.basepath,
    }

    return {**data, **additional_json_data}


# Utils
def sort_entries(entries, sort_key, direction="asc"):
    # regardless what user has submitted, we lowercase the input
    sort_key = sort_key.lower().strip()
    direction = direction.lower().strip()

    allowed_keys = ["slug", "title", "published_date", "firstadded_date"]

    if sort_key not in allowed_keys:
        sort_key = "firstadded_date"
    if direction not in ["asc", "desc"]:
        direction = "asc"

    if direction == "asc":
        return entries.order_by(F(sort_key).asc(nulls_last=True))
    else:
        return entries.order_by(F(sort_key).desc(nulls_last=True))

    return entries
