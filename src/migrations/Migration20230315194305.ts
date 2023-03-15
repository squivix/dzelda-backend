import { Migration } from '@mikro-orm/migrations';

export class Migration20230315194305 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "course" add column "added_on" timestamptz(0) not null default now();');

    this.addSql('alter table "map_learner_vocab" alter column "notes" type varchar(2048) using ("notes"::varchar(2048));');
  }

  async down(): Promise<void> {
    this.addSql('alter table "course" drop column "added_on";');

    this.addSql('alter table "map_learner_vocab" alter column "notes" type varchar(255) using ("notes"::varchar(255));');
  }

}
