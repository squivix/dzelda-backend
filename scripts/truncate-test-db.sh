#!/bin/bash
export "$(cat .env | xargs)"
psql -U "$DB_USER" -d "$DB_NAME-test" -a -f scripts/truncate-db.sql