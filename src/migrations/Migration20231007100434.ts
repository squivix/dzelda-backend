import { Migration } from '@mikro-orm/migrations';

export class Migration20231007100434 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "map_bookmarker_course" ("id" serial primary key, "course_id" int not null, "bookmarker_id" int not null);');
    this.addSql('alter table "map_bookmarker_course" add constraint "map_bookmarker_course_course_id_bookmarker_id_unique" unique ("course_id", "bookmarker_id");');

    this.addSql('alter table "map_bookmarker_course" add constraint "map_bookmarker_course_course_id_foreign" foreign key ("course_id") references "course" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_bookmarker_course" add constraint "map_bookmarker_course_bookmarker_id_foreign" foreign key ("bookmarker_id") references "profile" ("id") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "map_bookmarker_course" cascade;');
  }

}
