import { Migration } from '@mikro-orm/migrations';

export class Migration20240202173657 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "dictionary" add column "is_pronunciation" boolean not null default false;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "dictionary" drop column "is_pronunciation";');
  }

}
