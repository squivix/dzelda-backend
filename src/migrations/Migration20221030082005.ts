import { Migration } from '@mikro-orm/migrations';

export class Migration20221030082005 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "map_learner_language" ("id" serial primary key, "language_id" int not null, "learner_id" int not null);');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_learner_id_language_id_unique" unique ("learner_id", "language_id");');

    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "map_learner_language" cascade;');
  }

}
