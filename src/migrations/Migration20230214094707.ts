import { Migration } from '@mikro-orm/migrations';

export class Migration20230214094707 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "session" drop constraint "session_token_unique";');

    this.addSql('alter table "map_learner_language" add column "added_on" timestamptz(0) not null default now(), add column "last_opened" timestamptz(0) not null default now();');

    this.addSql('alter table "map_learner_vocab" alter column "notes" type varchar(255) using ("notes"::varchar(255));');
    this.addSql('alter table "map_learner_vocab" alter column "notes" set default \'\';');
    this.addSql('alter table "map_learner_vocab" alter column "notes" set not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "session" add constraint "session_token_unique" unique ("token");');

    this.addSql('alter table "map_learner_language" drop column "added_on";');
    this.addSql('alter table "map_learner_language" drop column "last_opened";');

    this.addSql('alter table "map_learner_vocab" alter column "notes" drop default;');
    this.addSql('alter table "map_learner_vocab" alter column "notes" type varchar(255) using ("notes"::varchar(255));');
    this.addSql('alter table "map_learner_vocab" alter column "notes" drop not null;');
  }

}
