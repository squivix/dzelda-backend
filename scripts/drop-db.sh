#!/bin/bash
export $(cat .env | xargs)
psql -U "$DB_USER" -d "$DB_NAME" -a -f scripts/drop-db.sql
