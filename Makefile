# Reset the database, restarting all the containers and bringing the instance back up
reset-psql:
	docker compose stop
	docker compose down
	docker volume rm homebrewhub_postgres -f
	docker compose up

update-db:
	cd db-sources/database-gb && git pull
	cd db-sources/database-gba && git pull
	cd db-sources/database-nes && git pull

sync-db:
	docker exec hh_api python manage.py runscript sync_db

init-db:
	rm -rf db-sources
	mkdir db-sources
	git clone https://github.com/gbdev/database.git db-sources/database-gb
	git clone https://github.com/gbadev-org/games.git db-sources/database-gba
	git clone https://github.com/nesdev-org/homebrew-db.git db-sources/database-nes

shell:
	docker exec -it hh_api bash

prepare-gbtid:
	cd scripts && wget https://github.com/bbbbbr/gbtoolsid/releases/download/v1.5.0/gbtoolsid_linux.zip && unzip gbtoolsid_linux.zip