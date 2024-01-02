import { Migration } from '@mikro-orm/migrations';

export class Migration20240102095228 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "language" add column "color" varchar(32) null default null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "language" drop column "color";');
  }

}
