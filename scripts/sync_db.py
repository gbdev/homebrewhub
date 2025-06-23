# This script must be run through Django manage.py as it interacts with the ORM
# e.g python manage.py runscript sync_db
# In importing other folders, keep also in mind that this will run from the root
# of the project, even if it's in hhub/scripts

import hashlib
import json
import os
import subprocess

import dateutil.parser

from hhub.models import Entry

# The list of the target directories that need to be processed
# Those should point to the "entries" subfolder of a "Homebrew Hub database"
# e.g.: https://github.com/gbdev/database or https://github.com/gbadev-org/games

from pathlib import Path

basefolder = "db-sources"

dirs = [
    "database-gb",
    "database-gba",
    "database-nes",
]


git_pointers = {
    "database-gb": "https://github.com/gbdev/database",
    "database-gba": "https://github.com/gbadev-org/games",
    "database-nes": "https://github.com/nesdev-org/homebrew-db",
}


def _get_sha1_hash(game, romfile):
    """
    Compute the SHA1 of the passed file
    """
    try:
        sha1sum = hashlib.sha1()

        with open(f"database/entries/{game}/{romfile}", "rb") as source:  # noqa: E501
            block = source.read(2**16)

            while len(block) != 0:
                sha1sum.update(block)
                block = source.read(2**16)

        sha1 = sha1sum.hexdigest()
        return sha1

    except Exception:
        return ""


def get_file_addition_date(file_path, repo_dir):
    try:
        command = [
            "git",
            "log",
            "--diff-filter=A",
            "--follow",
            "--format=%ad",
            "--date=iso-strict",
            "--",
            file_path,
        ]
        result = subprocess.run(
            command,
            cwd=repo_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        dates = result.stdout.strip().splitlines()
        return dates[-1] if dates else None
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}")
        return None


def run():
    inserted = 0
    updated = 0
    d = 0
    for database_folder in dirs:
        # Since we'd normally operate on the file system outside the container (e.g. git pulling database repos),
        # this allows running git commands from inside the container (with a different user)
        subprocess.run(
            [
                "git",
                "config",
                "--global",
                "--add",
                "safe.directory",
                f"{Path.cwd()}/{basefolder}/{database_folder}",
            ],
            check=True,
        )

        folder = f"{basefolder}/{database_folder}"
        d += 1
        print(f"Processing folder {folder}")
        try:
            games = os.listdir(f"{folder}/entries")
        except FileNotFoundError:
            print("Folder not found, skipping it")
            continue

        games_count = len(games)
        print(f"Found {games_count} games")

        for n, game in enumerate(games, start=1):
            with open(f"{folder}/entries/{game}/game.json") as json_file:
                data = json.load(json_file)
                print(f"({d}/{len(dirs)}) ({n}/{games_count}) Processing entry {game}")

                first_added = get_file_addition_date(
                    f"entries/{game}/game.json", folder
                )

                romfile = ""

                # Safety check to protect against entry without file (against schema)
                if "files" not in data:
                    print("Entry missing 'files' key, skipping...")
                    continue

                for file in data["files"]:
                    if "playable" in file:
                        romfile = file["filename"]

                # For the GB database only, run the gbstoolsid to get
                # some information about how the ROM was developed
                if "database-gb" in folder:
                    try:
                        gbtoolsid_out = subprocess.check_output(
                            [
                                "./scripts/gbtoolsid",
                                "-oj",
                                f"{folder}/entries/{game}/{romfile}",
                            ]
                        )
                        tools = json.loads(gbtoolsid_out)
                    except Exception:
                        tools = ""
                else:
                    tools = ""

                _get_sha1_hash(game, romfile)

                if "tags" not in data:
                    data["tags"] = []

                if "thirdparty" not in data:
                    data["thirdparty"] = []

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

            parsed_date = None

            # If a "date" field is present, try to parse it as a date
            if "date" in data:
                try:
                    parsed_date = dateutil.parser.parse(data["date"])
                except Exception:
                    parsed_date = None

            # Manually flag an entry as Open Source if it has an explicit license
            #  set or if it has a valid git repository
            if "Open Source" not in data["tags"]:
                if "repository" in data:
                    if data["repository"] != "":
                        data["tags"].append("Open Source")
                if "gameLicense" in data:
                    data["tags"].append("Open Source")

            # Returns an (entry, bool) tuple. Here we don't need the object that was
            # either updated or created, we only want to know if it was created or not
            _, created = Entry.objects.update_or_create(
                slug=data["slug"],
                defaults=dict(
                    slug=data["slug"],
                    platform=data["platform"],
                    developer=data["developer"],
                    typetag=data["typetag"],
                    title=data["title"],
                    tags=data["tags"],
                    thirdparty=data["thirdparty"],
                    basepath=database_folder,
                    devtoolinfo=tools,
                    baserepo=git_pointers[database_folder],
                    published_date=parsed_date,
                    firstadded_date=first_added,
                ),
            )

            if created:
                inserted += 1
            else:
                updated += 1

    print(f"{inserted} new entries inserted, {updated} updated")  # noqa: E501
