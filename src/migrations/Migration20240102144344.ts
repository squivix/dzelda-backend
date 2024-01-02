import { Migration } from '@mikro-orm/migrations';

export class Migration20240102144344 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "map_learner_language" rename column "added_on" to "started_learning_on";');
  }

  async down(): Promise<void> {
    this.addSql('alter table "map_learner_language" rename column "started_learning_on" to "added_on";');
  }

}
