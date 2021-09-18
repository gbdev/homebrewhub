# hhub

This repository provides the source code of the new [HHub API](), which powers [Homebres Hub](https://hh.gbdev.io), the largest digital collection of Game Boy and Game Boy Color homebrews, playable natively in your browser.

To learn how to use the HHub API in your project, check the [HHub API documentation]().

### Synchronising the database

The Homebrew Hub "source" database is a simple collection of folders, hosted as a git repository, each one containing an homebrew entry (ROM, screenshots, ..) and a "game.json" manifest file providing more details and metadata in a consisting way.

For more information check the ["database" repository](https://github.com/gbdev/database) documentation.

This enables the database to be "community-maintained", allowing everyone to add new entries (manually or by writing scrapers) or improve existing ones simply by opening Pull Requests.

The actual psql database needs to be built (and updated when a commit gets pushed) from this collection of folders. This job is done by the **sync_db** script.

The scripts expects every entry to be compliant with the [game.json schema DRAFT 3]() specification.

Keep in mind that the two are not equivalent, as the psql database saves additional values about each entry (e.g. simple analytics).

Fire up a Postgresql instance. E.g. with Docker and docker-compose:

```bash

```

Run the sync script:

```bash
# Set up a virtual env and install requirements
python -m venv env
source env/bin/activate
pip install -r requirements.txt

python sync_db.py
```

### Legacy

If you were looking for old version written in Node/Express, check [homebrewhub-legacy](https://github.com/gb-archive/homebrewhub-legacy).
