import json

from django.core.exceptions import FieldError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import F, Q
from django.http import JsonResponse

from hhub.models import Entry
from hhub.serializers import EntrySerializer


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
    data = open(f"db-sources/{entry.basepath}/{pk}/game.json").read()
    json_data = json.loads(data)

    # Enrich the manifest with some values available only in the (postgres) database
    json_data["devtoolinfo"] = entry.devtoolinfo
    json_data["basepath"] = entry.basepath
    json_data["baserepo"] = entry.baserepo
    return JsonResponse(json_data)


def entries_all(request):
    sort_by_param = request.GET.get("sort", "")
    order_by_param = request.GET.get("order_by", "")
    num_elements = request.GET.get("results", 10)

    entries = Entry.objects.all()

    # sort and order
    try:
        entries = sort_and_order(entries, order_by_param, sort_by_param)
    except FieldError as e:
        return JsonResponse({"error": str(e)}, status=400)

    paginator = Paginator(entries, num_elements)
    page = request.GET.get("page", 1)

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
        data = open(f"db-sources/{entry.basepath}/{entry.slug}/game.json").read()
        json_entries.append(json.loads(data))
    return JsonResponse(
        {
            "results": results,
            "page_total": paginator.num_pages,
            "page_current": page,
            "page_elements": len(serializer.data),
            "entries": json_entries,
        },
        safe=False,
    )
    return JsonResponse(serializer.data, safe=False)


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
    order_by_param = request.GET.get("order_by", "")
    sort_by_param = request.GET.get("sort", "")

    # Start by selecting everything
    entries = Entry.objects.all()

    # Boundaries for elements per page
    # if num_elements <= 1:
    #    num_elements = 1
    # elif num_elements >= 30:
    #    num_elements = 30

    if thirdparty:
        entries = entries.filter(thirdparty__contains=[thirdparty])

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
        data = open(f"db-sources/{entry.basepath}/{entry.slug}/game.json").read()
        json_data = json.loads(data)
        # Enrich the manifest with some values available only in the (postgres) database
        json_data["basepath"] = entry.basepath
        json_entries.append(json_data)

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
            # array of entries manifests
            "entries": json_entries,
        },
        # Allow non-dict instances to be passed and serialized
        safe=False,
    )


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
        },
    }

    return JsonResponse(data)


# Utils
def sort_and_order(entries, col_name, sort_by_param):
    # regardless what user has submitted, we lowercase the input
    col_name = col_name.lower().strip()
    sort_by_param = sort_by_param.lower().strip()

    # If no column name has been passed, sort the results by most recent
    if col_name == "":
        col_name = "published_date"
        sort_by_param = "desc"

    # if col_name has been specified and it is in allowed list of fields,
    # check if sort has been specified
    if col_name in ["slug", "title", "published_date"]:
        if sort_by_param in ["", "asc", "desc"]:
            if sort_by_param == "asc" or not sort_by_param:
                return entries.order_by(F(col_name).asc(nulls_last=True))
            elif sort_by_param == "desc":
                return entries.order_by(F(col_name).desc(nulls_last=True))
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
