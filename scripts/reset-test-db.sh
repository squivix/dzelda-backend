export $(cat .env | xargs)
dropdb -U "$DB_USER" --if-exists "$DB_NAME-test"
createdb -U "$DB_USER" -O "$DB_USER" -w "$DB_NAME-test"
MIKRO_ORM_DB_NAME="$DB_NAME-test" npm run migrate