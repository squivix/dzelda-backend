import { Migration } from '@mikro-orm/migrations';

export class Migration20240217122303 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "text_bookmark" ("id" serial primary key, "text_id" int not null, "bookmarker_id" int not null);');
    this.addSql('create index "text_bookmark_bookmarker_id_index" on "text_bookmark" ("bookmarker_id");');
    this.addSql('create index "text_bookmark_text_id_index" on "text_bookmark" ("text_id");');
    this.addSql('alter table "text_bookmark" add constraint "text_bookmark_text_id_bookmarker_id_unique" unique ("text_id", "bookmarker_id");');

    this.addSql('alter table "text_bookmark" add constraint "text_bookmark_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "text_bookmark" add constraint "text_bookmark_bookmarker_id_foreign" foreign key ("bookmarker_id") references "profile" ("id") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "text_bookmark" cascade;');
  }

}
