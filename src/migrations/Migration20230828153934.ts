import {Migration} from "@mikro-orm/migrations";

export class Migration20230828153934 extends Migration {

  async up(): Promise<void> {
    this.addSql("alter table \"session\" add column \"expires_on\" timestamptz(0) not null default now() + interval '1 month';");
  }

  async down(): Promise<void> {
    this.addSql("alter table \"session\" drop column \"expires_on\";");
  }

}
