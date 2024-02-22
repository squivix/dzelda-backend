import { Migration } from '@mikro-orm/migrations';

export class Migration20240222065402 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "map_hider_text" ("id" serial primary key, "text_id" int not null, "hider_id" int not null);');
    this.addSql('create index "map_hider_text_hider_id_index" on "map_hider_text" ("hider_id");');
    this.addSql('create index "map_hider_text_text_id_index" on "map_hider_text" ("text_id");');
    this.addSql('alter table "map_hider_text" add constraint "map_hider_text_text_id_hider_id_unique" unique ("text_id", "hider_id");');

    this.addSql('create table "flagged_text_report" ("id" serial primary key, "text_id" int not null, "reporter_id" int null, "reason_for_reporting" varchar(512) not null, "report_text" text not null);');
    this.addSql('create index "flagged_text_report_reporter_id_index" on "flagged_text_report" ("reporter_id");');
    this.addSql('create index "flagged_text_report_text_id_index" on "flagged_text_report" ("text_id");');
    this.addSql('alter table "flagged_text_report" add constraint "flagged_text_report_text_id_reporter_id_unique" unique ("text_id", "reporter_id");');

    this.addSql('alter table "map_hider_text" add constraint "map_hider_text_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_hider_text" add constraint "map_hider_text_hider_id_foreign" foreign key ("hider_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "flagged_text_report" add constraint "flagged_text_report_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "flagged_text_report" add constraint "flagged_text_report_reporter_id_foreign" foreign key ("reporter_id") references "profile" ("id") on update cascade on delete set null;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "map_hider_text" cascade;');

    this.addSql('drop table if exists "flagged_text_report" cascade;');
  }

}
