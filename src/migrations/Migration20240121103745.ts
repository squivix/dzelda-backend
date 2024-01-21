import { Migration } from '@mikro-orm/migrations';

export class Migration20240121103745 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "language" alter column "color" type varchar(32) using ("color"::varchar(32));');
    this.addSql('alter table "language" alter column "color" set not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "language" alter column "color" type varchar(32) using ("color"::varchar(32));');
    this.addSql('alter table "language" alter column "color" drop not null;');
  }

}
