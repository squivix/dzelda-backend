import { Migration } from '@mikro-orm/migrations';

export class Migration20240128130043 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "map_learner_dictionary" add column "order" int not null default 0;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "map_learner_dictionary" drop column "order";');
  }

}
