import {Migration} from "@mikro-orm/migrations";

export class Migration20230824204402 extends Migration {

    async up(): Promise<void> {
        this.addSql("create table \"password_reset_token\" (\"id\" serial primary key, \"token\" varchar(255) not null, \"expires_on\" timestamptz(0) not null default now() + interval '1 hour', \"user_id\" int not null);");
        this.addSql("alter table \"password_reset_token\" add constraint \"password_reset_token_user_id_unique\" unique (\"user_id\");");

        this.addSql("alter table \"password_reset_token\" add constraint \"password_reset_token_user_id_foreign\" foreign key (\"user_id\") references \"user\" (\"id\") on update cascade;");

        this.addSql("alter table \"meaning\" drop constraint \"meaning_added_by_id_foreign\";");

        this.addSql("alter table \"meaning\" add constraint \"meaning_added_by_id_foreign\" foreign key (\"added_by_id\") references \"profile\" (\"id\") on update cascade on delete set null;");
    }

    async down(): Promise<void> {
        this.addSql("drop table if exists \"password_reset_token\" cascade;");

        this.addSql("alter table \"meaning\" drop constraint \"meaning_added_by_id_foreign\";");

        this.addSql("alter table \"meaning\" add constraint \"meaning_added_by_id_foreign\" foreign key (\"added_by_id\") references \"profile\" (\"id\") on update cascade;");
    }

}
