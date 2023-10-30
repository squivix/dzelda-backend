import { Migration } from '@mikro-orm/migrations';

export class Migration20231030162113 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "map_learner_vocab" add column "saved_on" timestamptz(0) not null default now();');
  }

  async down(): Promise<void> {
    this.addSql('alter table "map_learner_vocab" drop column "saved_on";');
  }

}
