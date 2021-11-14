import sqlite3
import os
import json

dirs = os.listdir("database/entries")


def connect_db():
    con = sqlite3.connect("db.sqlite3")
    cur = con.cursor()
    return con, cur


def sync_db(con, cur):
    inserted = 0
    updated = 0
    for game in dirs:
        with open(f"database/entries/{game}/game.json") as json_file:
            data = json.load(json_file)
            print(f"Processing entry {game}")
            if "tags" not in data:
                data["tags"] = ""
            if "platform" not in data:
                print("no platform")
                data["platform"] = "GB"
            if "developer" not in data:
                data["developer"] = ""
            values = (
                data["developer"],
                data["title"],
                data["platform"],
                data["typetag"],
                data["slug"],
            )
            # Check if the entry already exists
            select_query = """
            SELECT *
            FROM "main"."hhub_entry"
            WHERE "slug"=?
            """

            cur.execute(select_query, (data["slug"],))
            rows = cur.fetchall()

            if len(rows) > 0:
                print("Entry already in the database, overwriting its values..")
                query = """
                UPDATE "main"."hhub_entry" SET "developer" = ?, "title" = ?, "platform" = ?, "typetag" = ? WHERE "slug"=?
                """
                updated += 1
            else:
                print("Inserting new entry..")
                query = """
                INSERT INTO "main"."hhub_entry"("developer","title","platform","typetag", "slug") VALUES (?, ?, ?, ?, ?);
                """
                inserted += 1

            cur.execute(query, values)

    print(f"{inserted} new entries inserted, {updated} updated")
    # Save (commit) the changes
    con.commit()

    # Close the connection as we are done with it.
    con.close()


# Connect to the database
con, cur = connect_db()
# Synchronize entries
sync_db(con, cur)
