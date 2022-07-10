# This script must be run through Django manage.py as it interacts with the ORM
# e.g python manage.py runscript sync_db
# In importing other folders, keep also in this runs for the root of the project, even if it's in hhub/scripts

import hashlib
import json
import os
import subprocess

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
                for file in data["files"]:
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

                try:
                    sha1sum = hashlib.sha1()
                    with open(f"database/entries/{game}/{romfile}", 'rb') as source:
                        block = source.read(2**16)
                        while len(block) != 0:
                            sha1sum.update(block)
                            block = source.read(2**16)
                        sha1 = sha1sum.hexdigest()
                        print("SHA1:", sha1)
                except Exception:
                    sha1 = ""

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

            try:
                # Check if an entry already exists with the given slug
                entry = Entry.objects.get(slug=data["slug"])
                # And update its values
                entry = Entry(
                    slug=data["slug"],
                    platform=data["platform"],
                    developer=data["developer"],
                    typetag=data["typetag"],
                    title=data["title"],
                    tags=data["tags"],
                    basepath=folder,
                    devtoolinfo=tools,
                )
                updated += 1
            except Exception:
                # otherwise, create a new entry
                entry = Entry(
                    slug=data["slug"],
                    platform=data["platform"],
                    developer=data["developer"],
                    typetag=data["typetag"],
                    title=data["title"],
                    tags=data["tags"],
                    basepath=folder,
                    devtoolinfo=tools,
                )
                inserted += 1

            entry.save()

    print(f"{inserted} new entries inserted, {updated} updated")
