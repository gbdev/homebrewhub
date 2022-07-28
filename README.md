# hhub

This repository provides the source code of the new [HHub API](https://hh3.gbdev.io/api), which powers [Homebrew Hub](https://hh.gbdev.io), the largest digital collection of Game Boy and Game Boy Color homebrews, playable natively in your browser.

Table of contents:

- [API Documentation](#api-documentation)
  - [GET `/entry/<entry-slug>.json`](#get---entry--entry-slug-json-)
    - [Examples](#examples)
  - [GET `/entry/<entry-slug>/<filename>`](#get---entry--entry-slug---fialename--)
    - [Examples](#examples-1)
  - [GET `/all`](#get---all-)
  - [GET `/search`](#get---search-)
    - [Examples](#examples-2)
  - [Pagination](#pagination)
  - [Sort and order by](#sort-and-order-by)
- [Deploy](#deploy)
  - [Synchronising the database](#synchronising-the-database)
  - [Legacy](#legacy)

---

## API Documentation

The API is exposed at `https://hh3.gbdev.io/api`.

Here's a quick overview of the available endpoints:

### GET `/entry/<entry-slug>.json`

Get the game manifest for the game with the given slug identifier, providing every information available in the database about the entry. Here's a quick overview on how it's built:

- `title` - Full name of the game
- `slug` - A unique string identifier for a game
- `typetag` - Type of the software (can be "game", "homebrew", "demo", "hackrom" or "music")
- `developer` - Name of the author(s)
- `files` - Attached ROM files
- `license` - License under which the software is released
- `platform` - Target console (can be "GB", "GBC" or "GBA")
- `screenshots` - A list of filenames of screenshots
- `tags` - A list of the categories representing the entry

To learn more about formal definitions of each of these properties, check the specification [JSON Schema](https://github.com/gbdev/database/blob/master/game-schema-d3.json), against which every manifest is validated.

#### Examples

```bash
curl hh3.gbdev.io/api/entry/2048.json
```

will return:

```json
{
  "developer": "Sanqui",
  "files": [
    {
      "default": true,
      "filename": "2048.gb",
      "playable": true
    }
  ],
  "license": "Zlib",
  "platform": "GB",
  "repository": "https://github.com/Sanqui/2048-gb",
  "screenshots": ["1.png", "2.png"],
  "slug": "2048gb",
  "tags": ["Open Source", "Puzzle"],
  "title": "2048gb",
  "typetag": "game"
}
```

_Some_ of these fields can be queried through the [`/search`](#get-search) route.

### GET `/entry/<entry-slug>/<filename>`

Gives access to the files related to an entry (e.g. the ROMs, screenshots,..).

File names are found in the game manifest, accessed with the previous route.

#### Examples

```bash
# Get the game manifest for the game with the slug "2048gb"
curl hh3.gbdev.io/api/entry/2048.json
# In the response JSON, a file name "2048.gb" is found in the "files" array, as a playable ROM
#  Let's get it:
curl hh3.gbdev.io/api/entry/2048gb/2048.gb
```

### GET `/all`

Returns every entry in the database. Every entry is represented by its game manifest.

### GET `/search`

Return every entry in the database matching the given conditions. Every entry is represented by its game manifest.

The following query parameters can be used:

- `type` (exact matching)
- `developer` (exact matching)
- `platform` (exact matching)
- `tags` (exact matching, comma-separated array e.g. `/search?tags=Open Source,RPG`)
- `title` ("contains" matching, e.g. `/search?title=brick` will return "**Brick**ster" and "**Brick**Breaker")

More than one query parameter can be specified. They will be concatenated in "AND" statements, i.e. `/search?type=homebrew&platform=GBC` will return every Homebrew developed with GBC features.

Every matching is case-insensitive.

#### Examples

```bash
# Get every RPG released as Open Source with Game Boy Color features:
curl hh3.gbdev.io/api/search?tags=Open Source,RPG&platform=GBC
```

### Pagination

Every result is paginated. These additional query params can be used in any of the previous routes:

- `page` - Selects the current page
- `page_elements` - Selects how many elements per-page

The following values are always present in responses, related to the given query:

- `results` - Total number of results
- `page_total` - Total pages
- `page_current` - Current page. This can be different from the requested page (using the `page` query param) when the number is invalid or out of the range 0..`page-total`.
- `page_elements` - Elements per page. This can be customised (in the allowed range 1..10) by passing the `page_elements` query param.

### Sort and order by

This API supports sort and order operations, you just need to specify these query params while doing requests (respectively `sort` and `order_by`).

`order_by` could assume these values:

- `slug`
- `title`

`sort` is intended to be used with `order_by` and could assume the following values:

- `asc`: enabled by default, ascending order
- `desc`: descending order

Example:

```bash
# Get every game in the homebrewhub ordered by title in a descending order:
curl hh3.gbdev.io/api/all?order_by=title&sort=desc
```

## Deploy

### Requirements

You need Python 3 and a couple of packages to build psycopg2:

```bash
apt install python3 libpq-dev python3-dev python3-venv
```

### Run server

Here's how to quickly get started:

```bash

# Start up backing services (database and database admin)
# NOTE: Remember to run "docker-compose down" afterwards
docker-compose up --detach

# Set up a virtual env
python3 -m venv env

# Activate it
source env/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Prepare migrations for our Entry model
python3 manage.py makemigrations hhub

# Sync the database for the first time
python3 manage.py migrate

# Clone the database repositories
# GB/GBC
git clone https://github.com/gbdev/database/
# GBA
git clone https://github.com/gbadev-org/games database-gba


# Populate with the entries from the database repository
python3 manage.py runscript sync_db

# Start the Django app
python3 manage.py runserver

# Query the /all route to see if everything's there
curl https://localhost:8000/all
```

### Synchronising the database

The Homebrew Hub "source" database is simply a collection of folders, hosted as a git repository, each one containing an homebrew entry (ROM, screenshots, ..) and a "game.json" manifest file providing more details and metadata in a _consistent_ way (see the game.json JSON schema).

For more information check the ["database" repository](https://github.com/gbdev/database) documentation.

This enables the database to be "community-maintained", allowing everyone to add new entries (manually or by writing scrapers) or improve existing ones simply by opening Pull Requests.

The "real" database needs to be built (and updated when a commit gets pushed) from this collection of folders. This job is done by the **sync-db.py** script.

> Keep in mind that the two are not equivalent, as the Django database will keep additional values about each entry (e.g. simple analytics).

```sh
python manage.py runscript sync-db
```

### Legacy

If you were looking for old version written in Node/Express, check [homebrewhub-legacy](https://github.com/gb-archive/homebrewhub-legacy).
