# hhub

![Github CI](https://github.com/gbdev/homebrewhub/actions/workflows/ci.yaml/badge.svg)

This repository provides the source code of the [Homebrew Hub backend](https://hh3.gbdev.io/api), which powers [Homebrew Hub](https://hh.gbdev.io), the largest digital collection of Game Boy and Game Boy Color homebrews, playable natively in your browser.

Table of contents:

- [API Documentation](#api-documentation)
- [Local Development](#local-development)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Pull the games databases](#2-pull-the-games-databases)
  - [3A. Docker based requirements](#3a-docker-based-requirements)
  - [3B. Manual requirements](#3b-manual-requirements)
  - [4. Synchronising the database](#4-synchronising-the-database)
  - [5. Get the frontend running](#5-get-the-frontend-running)
- [Legacy](#legacy)

## API Documentation

Documentation about the exposed API and how to interact with the Homebrew Hub instance over hh3.gbdev.io, see [API.md](API.md).

## Local Development

To run a complete local instance of Homebrew Hub, let's start with:

```sh
# Cloning the repo locally
git clone https://github.com/gbdev/homebrewhub

# Changing directory into the cloned repo
cd homebrewhub
```

### 1. Prerequisites

No matter if you choose the local setup or the docker one, you will need a couple of pre-requirements on the system:

- `pre-commit` <br>
  E.g. Install it from pip:
  ```bash
  python3 -m venv env
  sourc env/bin/activate
  pip install pre-commit
  ```
  After it's installed, run `pre-commit install` in the project root folder to see if everything gets initialised correctly. `pre-commit run --all-files` will run it against the whole repository.
- (Optional) The `gbtoolsid` ([Game Boy Toolchain ID](https://github.com/bbbbbr/gbtoolsid)) executable must be available in the project root to populate toolchain details for the imported entries. Get a build on the [Releases](https://github.com/bbbbbr/gbtoolsid/releases/latest) page and extract the zip or run `make prepare-gbtid` from the root of the repository.

### 2. Pull the games database(s)

To populate the database, we'll need some sources. Here's how to pull all the 'official' databases (you need at least one):

```bash
# GB/GBC
git clone https://github.com/gbdev/database/ db-sources/database-gb
# GBA
git clone https://github.com/gbadev-org/games db-sources/database-gba
# NES
git clone https://github.com/nesdev-org/homebrew-db db-sources/database-nes

## or simply..
make init-db
```

### 3A. Docker based requirements

First, install Docker ([download link](https://docs.docker.com/get-docker/)).

After that, follow the steps below to get started running the project using containers:

```bash
# Start up backing services (web server, database and database admin)
# NOTE: This command will also take care of synchronising the database (including migrations)
docker-compose up --build

# Once that's finished, in another terminal, query the /api/all route to see if everything's there
curl https://localhost:8000/api/all
```

### 3B. Manual requirements

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

### 4. Synchronising the database

The Homebrew Hub "source" database is simply a collection of folders, hosted as a git repository, each one containing an homebrew entry (ROM, screenshots, ..) and a "game.json" manifest file providing more details and metadata in a _consistent_ way (see the game.json JSON schema).

For more information check the ["database" repository](https://github.com/gbdev/database) documentation.

This enables the database to be "community-maintained", allowing everyone to add new entries (manually or by writing scrapers) or improve existing ones simply by opening Pull Requests.

The "real" database needs to be built (and updated when a commit gets pushed) from this collection of folders. This job is done by the **sync_db.py** script.

> Keep in mind that the two are not equivalent, as the Django database will keep additional values about each entry (e.g. simple analytics).

Every time you want to trigger a database sync (e.g. you pulled some updates on the games database):

```bash
python3 manage.py runscript sync_db
```

### 5. Get the frontend running

Now that you have your Homebrew Hub backend up and running, you can check [Virens](https://github.com/gbdev/virens), our VueJS based frontend shipping web assembly builds of mGBA and binjgb to actually play all these entries directly on a browser :D

### Legacy

If you were looking for old version written in Node/Express, check [homebrewhub-legacy](https://github.com/gb-archive/homebrewhub-legacy).
