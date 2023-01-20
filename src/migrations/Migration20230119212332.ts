import { Migration } from '@mikro-orm/migrations';

export class Migration20230119212332 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "map_learner_vocab" add column "level" smallint not null, add column "notes" varchar(255) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "map_learner_vocab" drop column "level";');
    this.addSql('alter table "map_learner_vocab" drop column "notes";');
  }

}
