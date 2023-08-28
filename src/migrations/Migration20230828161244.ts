import {Migration} from "@mikro-orm/migrations";

export class Migration20230828161244 extends Migration {

    async up(): Promise<void> {
        this.addSql("alter table \"session\" drop constraint \"session_user_id_unique\";");
    }

    async down(): Promise<void> {
        this.addSql("alter table \"session\" add constraint \"session_user_id_unique\" unique (\"user_id\");");
    }

}
