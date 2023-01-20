import { Migration } from '@mikro-orm/migrations';

export class Migration20230119212443 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "map_learner_vocab" drop constraint if exists "map_learner_vocab_level_check";');

    this.addSql('alter table "map_learner_vocab" alter column "level" type smallint using ("level"::smallint);');
    this.addSql('alter table "map_learner_vocab" alter column "level" set default 1;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "map_learner_vocab" drop constraint if exists "map_learner_vocab_level_check";');

    this.addSql('alter table "map_learner_vocab" alter column "level" drop default;');
    this.addSql('alter table "map_learner_vocab" alter column "level" type smallint using ("level"::smallint);');
  }

}
