import json

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import F, Q
from django.http import JsonResponse

from hhub.models import Entry
from hhub.serializers import EntrySerializer

from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes

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

    # Enrich the manifest with some values available only in the (postgres) database
    json_data["devtoolinfo"] = entry.devtoolinfo
    json_data["basepath"] = entry.basepath
    json_data["baserepo"] = entry.baserepo
    return JsonResponse(json_data)


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
        # Enrich the manifest with some values available only in the (postgres) database
        additional_json_data = {
            "basebath": entry.basepath,
            "firstadded_date": entry.firstadded_date,
        }
        json_entries.append({**json_data, **additional_json_data})

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
    summary="Get statistics about the entries in the database",
    description="Retrieve aggregated counts of entries by type, tags, and platforms.",
    responses={200: OpenApiTypes.OBJECT},
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
