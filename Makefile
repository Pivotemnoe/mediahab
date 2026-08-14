PNPM ?= pnpm
PYTHON ?= python3
VENV ?= .venv
PY := $(VENV)/bin/python
PIP := $(PY) -m pip
PHASE00_PYTHONPATH ?= /private/tmp/phase00-python-deps
COMPOSE ?= docker compose
MIGRATE_DATABASE_URL ?= postgresql+asyncpg://media_hub:media_hub@localhost:55434/media_hub
EVAL_CONTENT_IDEAS_ENV_FILE ?= .env.local
EVAL_CONTENT_IDEAS_ARGS ?=
EVAL_CONTENT_IDEAS_RAW_RESULTS ?=
EVAL_CONTENT_IDEAS_HUMAN_REVIEW ?=

.PHONY: deps dev down lint typecheck test test-e2e test-ui-hardening test-ui-contracts eval-content-ideas-validate eval-content-ideas eval-content-ideas-gate eval-standalone-ideas-validate migrate seed openapi validate-spec phase00-spikes deps-phase00 clean

deps: node_modules/.pnpm $(VENV)/.deps-installed

node_modules/.pnpm: package.json pnpm-workspace.yaml apps/web/package.json
	$(PNPM) install

$(VENV)/.deps-installed: requirements-dev.txt requirements-phase00.txt services/api/requirements.txt services/worker/requirements.txt
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements-dev.txt
	touch $(VENV)/.deps-installed

dev: deps
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

lint: deps
	$(PNPM) --filter @temichev/web lint
	$(PY) -m compileall -q tools tests services packages connectors

typecheck: deps
	$(PNPM) --filter @temichev/web typecheck
	$(PY) -m compileall -q tools tests services packages connectors

test: deps test-ui-hardening
	$(PY) -m unittest discover -s tests
	$(PY) -m unittest discover -s services/api/tests

test-e2e: deps
	$(PY) tools/e2e_smoke.py

test-ui-hardening: deps test-ui-contracts

test-ui-contracts:
	node tools/check_sw_capabilities.mjs
	node tools/check_offline_notebook_contract.mjs
	node tools/check_examples_first_contract.mjs
	node tools/check_idea_generator_contract.mjs
	node tools/check_standalone_ideas_contract.mjs
	node tools/check_content_idea_eval_fixture.mjs
	node tools/check_standalone_idea_eval_fixture.mjs
	node tools/check_phase12k_recording_rubric_contract.mjs
	node tools/check_phase12l_source_rebuild_links_contract.mjs
	node tools/check_phase12m_pilot_ui_contract.mjs
	node tools/check_phase12n_closed_pilot_contract.mjs
	node tools/check_guided_queue_contract.mjs
	node tools/check_guided_queue_store.mjs
	node tools/check_guided_queue_diagnostics.mjs
	node tools/check_guided_queue_replay.mjs
	node tools/check_guided_queue_replay_preflight.mjs
	node tools/check_guided_repeatable_queue_ui.mjs
	node tools/check_guided_action_errors.mjs
	node tools/check_guided_action_payloads.mjs
	node tools/check_api_request_headers.mjs
	$(PY) tools/check_guided_form_api_mode.py

eval-content-ideas-validate: deps
	PYTHONPATH="$(CURDIR)/services/api" $(PY) tools/eval_content_ideas.py validate

eval-content-ideas: deps
	PYTHONPATH="$(CURDIR)/services/api" $(PY) tools/eval_content_ideas.py run --env-file "$(EVAL_CONTENT_IDEAS_ENV_FILE)" --confirm-live $(EVAL_CONTENT_IDEAS_ARGS)

eval-content-ideas-gate: deps
	PYTHONPATH="$(CURDIR)/services/api" $(PY) tools/eval_content_ideas.py gate --raw-results "$(EVAL_CONTENT_IDEAS_RAW_RESULTS)" --human-review "$(EVAL_CONTENT_IDEAS_HUMAN_REVIEW)"

eval-standalone-ideas-validate:
	node tools/check_standalone_idea_eval_fixture.mjs

migrate: deps
	cd services/api && DATABASE_URL="$(MIGRATE_DATABASE_URL)" ../../$(PY) -m alembic -c alembic.ini upgrade head

seed: deps
	DATABASE_URL="$(MIGRATE_DATABASE_URL)" $(PY) tools/seed_baseline.py

openapi: deps
	$(PY) tools/export_openapi.py

validate-spec:
	PYTHONPATH="$(PHASE00_PYTHONPATH)" $(PYTHON) tools/validate_spec.py

phase00-spikes:
	$(PYTHON) tools/phase00_spikes.py --write-snapshots

deps-phase00:
	$(PYTHON) -m pip install --target "$(PHASE00_PYTHONPATH)" -r requirements-phase00.txt

clean:
	rm -rf node_modules .venv apps/web/.next
