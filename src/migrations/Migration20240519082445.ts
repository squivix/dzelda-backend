import {Migration} from '@mikro-orm/migrations';

export class Migration20240519082445 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "collection" add column "is_public" boolean not null default true;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "collection" drop column "is_public";');
  }

}
