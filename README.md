# hhub

![Github CI](https://github.com/gbdev/homebrewhub/actions/workflows/ci.yaml/badge.svg)

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

Documentation about the exposed API and how to interact with the Homebrew Hub instance over hh3.gbdev.io, see [API.md](API.md)

## Local Development

There are two options for running this project locally: manually or using Docker.

### Manual requirements

You need Python 3 and a couple of packages to build `psycopg2` (database driver).

On Linux, this command should install all requirements:

```bash
apt install python3 libpq-dev python3-dev python3-venv
```

Next, install Postgres 12 ([download link](https://www.postgresql.org/download/)), create a user, password and a database named `hh`. Have it running in the background on port `5432`.

After that, follow the steps below to get started running the project manually:

```bash
# Clone the repo locally
git clone https://github.com/gbdev/homebrewhub

# Change into the cloned repo
cd homebrewhub

# Set up a virtual env
python3 -m venv env

# Activate it
source env/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Pre-Commit git hooks (for enforcing code style on git commit)
pre-commit install

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
DATABASE_URL=postgres://yourpostgresuserhere:yourpostgrespasswordhere@localhost:5432/hh python3 manage.py runscript sync_db

# Optional note: You can export the environment variable to avoid typing it each time:
EXPORT DATABASE_URL=postgres://yourpostgresuserhere:yourpostgrespasswordhere@localhost:5432/hh

# Start the Django app
DATABASE_URL=postgres://yourpostgresuserhere:yourpostgrespasswordhere@localhost:5432/hh python3 manage.py runserver

# In another terminal, query the /api/all route to see if everything's there
curl https://localhost:8000/api/all
```

### Docker based requirements

First, install Docker ([download link](https://docs.docker.com/get-docker/)).

After that, follow the steps below to get started running the project using containers:

```bash
# Clone the repo locally
git clone https://github.com/gbdev/homebrewhub

# Change into the cloned repo
cd homebrewhub

# Clone the database repositories
# GB/GBC
git clone https://github.com/gbdev/database/
# GBA
git clone https://github.com/gbadev-org/games database-gba

# Start up backing services (web server, database and database admin)
# NOTE: This command will also take care of synchronising the database (including migrations)
docker-compose up --build

# Once that's finished, in another terminal, query the /api/all route to see if everything's there
curl https://localhost:8000/api/all
```

### Synchronising the database

The Homebrew Hub "source" database is simply a collection of folders, hosted as a git repository, each one containing an homebrew entry (ROM, screenshots, ..) and a "game.json" manifest file providing more details and metadata in a _consistent_ way (see the game.json JSON schema).

For more information check the ["database" repository](https://github.com/gbdev/database) documentation.

This enables the database to be "community-maintained", allowing everyone to add new entries (manually or by writing scrapers) or improve existing ones simply by opening Pull Requests.

The "real" database needs to be built (and updated when a commit gets pushed) from this collection of folders. This job is done by the **sync_db.py** script.

> Keep in mind that the two are not equivalent, as the Django database will keep additional values about each entry (e.g. simple analytics).

```sh
python3 manage.py runscript sync_db
```

### Legacy

If you were looking for old version written in Node/Express, check [homebrewhub-legacy](https://github.com/gb-archive/homebrewhub-legacy).
