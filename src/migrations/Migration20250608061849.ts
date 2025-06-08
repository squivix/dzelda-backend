import { Migration } from '@mikro-orm/migrations';

export class Migration20250608061849 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "human_pronunciation" alter column "text" type varchar(512) using ("text"::varchar(512));');
    this.addSql('alter table "human_pronunciation" alter column "parsed_text" type varchar(512) using ("parsed_text"::varchar(512));');

    this.addSql('alter table "text" rename column "is_hidden" to "is_removed_by_mods";');
  }

  async down(): Promise<void> {
    this.addSql('alter table "human_pronunciation" alter column "text" type varchar(255) using ("text"::varchar(255));');
    this.addSql('alter table "human_pronunciation" alter column "parsed_text" type varchar(255) using ("parsed_text"::varchar(255));');

    this.addSql('alter table "text" rename column "is_removed_by_mods" to "is_hidden";');
  }

}
