

__WEB__: ## ____

web_deps:
	@cd web/ && \
	mix deps.get && \
	cd assets && npm install

web_db:
	@cd web/ && \
	docker compose up -d db --wait && \
	mix ecto.migrate

web_migrate:
	@cd web/ && \
	mix ecto.migrate

web_run: web_deps web_db
	@cd web/ && \
	iex -S mix phx.server

web_remove_db_container:
	@cd web && \
		docker stop zk_arcade_db || true  && \
		docker rm zk_arcade_db || true

web_clean_db: web_remove_db_container
	@cd web && \
		docker volume rm zkarcade-postgres-data || true
