# This script must be run through Django manage.py as it interacts with the ORM
# e.g python manage.py runscript sync_db
# In importing other folders, keep also in this runs for the root of the project,
# even if it's in hhub/scripts

import hashlib
import json
import os
import subprocess

from hhub.models import Entry

dirs = ["database/entries", "database-gba/entries"]


def _get_sha1_hash(game, romfile):
    try:
        sha1sum = hashlib.sha1()

        with open(f"database/entries/{game}/{romfile}", "rb") as source:  # noqa: E501
            block = source.read(2**16)

            while len(block) != 0:
                sha1sum.update(block)
                block = source.read(2**16)

        sha1 = sha1sum.hexdigest()
        print("SHA1:", sha1)
        return sha1

    except Exception:
        return ""


def run():
    inserted = 0
    updated = 0

    for folder in dirs:
        print(f"Processing folder {folder}")
        games = os.listdir(folder)

        games_count = len(games)
        print(f"Found {games_count} games")

        for n, game in enumerate(games, start=1):
            with open(f"{folder}/{game}/game.json") as json_file:
                data = json.load(json_file)
                print(f"({n}/{games_count}) Processing entry {game}")

                romfile = ""

                for file in data.get("files", []):
                    if "playable" in file:
                        romfile = file["filename"]

                # Run gbstoolsid to get some information about how the ROM was developed
                try:
                    gbtoolsid_out = subprocess.check_output(
                        ["./gbtoolsid", "-oj", f"database/entries/{game}/{romfile}"]
                    )
                    tools = json.loads(gbtoolsid_out)
                except Exception:
                    tools = ""

                _get_sha1_hash(game, romfile)

                if "tags" not in data:
                    data["tags"] = []

                if "platform" not in data:
                    print("no platform")
                    data["platform"] = "GB"

                if "developer" not in data:
                    data["developer"] = ""

                if "typetag" not in data:
                    data["typetag"] = "game"

                if "title" not in data:
                    print("Warning: no title")
                    data["title"] = ""

            _, created = Entry.objects.update_or_create(
                slug=data["slug"],
                defaults=dict(
                    slug=data["slug"],
                    platform=data["platform"],
                    developer=data["developer"],
                    typetag=data["typetag"],
                    title=data["title"],
                    tags=data["tags"],
                    basepath=folder,
                    devtoolinfo=tools,
                ),
            )

            if created:
                inserted += 1
            else:
                updated += 1

    print(f"{inserted} new entries inserted, {updated} updated")  # noqa: E501
