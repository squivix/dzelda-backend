#!/bin/bash
pwd
psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -a -f scripts/drop-db.sql