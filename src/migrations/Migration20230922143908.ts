import { Migration } from '@mikro-orm/migrations';

export class Migration20230922143908 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" alter column "last_login" type timestamptz(0) using ("last_login"::timestamptz(0));');
    this.addSql('alter table "user" alter column "last_login" set default null;');
    this.addSql('alter table "user" alter column "last_login" drop not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "user" alter column "last_login" type timestamptz(0) using ("last_login"::timestamptz(0));');
    this.addSql('alter table "user" alter column "last_login" set default now();');
    this.addSql('alter table "user" alter column "last_login" set not null;');
  }

}
