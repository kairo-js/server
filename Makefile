.PHONY: up down build logs ps restart clean

up:
	docker compose up -d --build --wait --wait-timeout 60

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

ps:
	docker compose ps

restart: down up

clean:
	docker compose down -v
