import sqlite3
import os
import json


dirs = os.listdir('database/entries')


def connect_db():
    con = sqlite3.connect('db.sqlite3')
    cur = con.cursor()
    return con, cur


def init_db():
    """
    Initialises an empty sqlite db with necessary tables
    """
    create = """
    CREATE TABLE "entries" (
    "slug"  TEXT,
    "developer" TEXT,
    "title" TEXT,
    "platform"  TEXT,
    "typetag"   TEXT,
    "tags"  TEXT,
    PRIMARY KEY("slug")
    )
    """
    return


def sync_db(con, cur):
    for game in dirs:
        with open(f'database/entries/{game}/game.json') as json_file:
            data = json.load(json_file)
            # print(data["title"])
            if "tags" not in data:
                data["tags"] = ""
            if "platform" not in data:
                print("no platform for", data["slug"])
                data["platform"] = "GB"
            if "developer" not in data:
                data["developer"] = ""
            values = (
                data["slug"],
                data["developer"],
                data["title"],
                data["platform"],
                data["typetag"],
            )
            insert_query = """
            INSERT INTO "main"."hhub_entry"("slug","developer","title","platform","typetag") VALUES (?, ?, ?, ?, ?);
            """
            cur.execute(insert_query, values)

    # Save (commit) the changes
    con.commit()

    # Close the connection as we are done with it.
    con.close()


con, cur = connect_db()
sync_db(con, cur)
