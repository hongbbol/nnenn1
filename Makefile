.PHONY: install lint test seed import-sample supabase-up supabase-down

install:
	pip install -e ".[dev]"

lint:
	ruff check .

test:
	pytest -q

seed:
	@echo "Run: supabase db reset --linked   (then db push, then psql -f supabase/seed.sql)"

import-sample:
	python scripts/import_opff.py --sample 10 --skip-download

supabase-up:
	supabase start

supabase-down:
	supabase stop
