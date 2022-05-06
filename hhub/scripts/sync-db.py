# This script must be run through Django manage.py as it interacts with the ORM
# e.g python manage.py runscript sync_db
# Keep also in mind it runs for the root of the project, even if it's in hhub/scripts

import json
import os

from hhub.models import Entry

dirs = ["database/entries", "database-gba/entries"]


def run():
    inserted = 0
    updated = 0
    for folder in dirs:
        print(f"Processing folder {folder}")
        games = os.listdir(folder)
        for game in games:
            with open(f"{folder}/{game}/game.json") as json_file:
                data = json.load(json_file)
                print(f"Processing entry {game}")
                if "tags" not in data:
                    data["tags"] = ""
                if "platform" not in data:
                    print("no platform")
                    data["platform"] = "GB"
                if "developer" not in data:
                    data["developer"] = ""
                if "typetag" not in data:
                    data["typetag"] = "game"

            try:
                entry = Entry.objects.get(slug=data["slug"])
                print("Updating")
                updated += 1
            except Exception:
                entry = Entry(
                    slug=data["slug"],
                    platform=data["platform"],
                    developer=data["developer"],
                    typetag=data["typetag"],
                    title=data["title"],
                )
                inserted += 1

            entry.save()

    print(f"{inserted} new entries inserted, {updated} updated")
