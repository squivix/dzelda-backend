import { Migration } from '@mikro-orm/migrations';

export class Migration20240520200735 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "notification" ("id" serial primary key, "text" varchar(255) not null, "created_date" timestamptz not null default now(), "recipient_id" int not null);');
    this.addSql('create index "notification_recipient_id_index" on "notification" ("recipient_id");');

    this.addSql('alter table "notification" add constraint "notification_recipient_id_foreign" foreign key ("recipient_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "text" add column "is_processing" boolean not null default false;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "notification" cascade;');

    this.addSql('alter table "text" drop column "is_processing";');
  }

}
