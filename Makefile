# Reset the database, restarting all the containers and bringing the instance back up
reset-psql:
	docker compose stop
	docker compose down
	docker volume rm homebrewhub_postgres -f
	docker compose up

update-db:
	cd database && git pull
	cd gba-database && git pull

sync-db:
	docker exec hh_api python manage.py runscript sync_db

init-db:
	rm -rf database
	rm -rf gba-database
	git clone https://github.com/gbdev/database.git database
	git clone https://github.com/gbadev-org/games.git database-gba

shell:
	docker exec -it hh_api bash
