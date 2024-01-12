import { Migration } from '@mikro-orm/migrations';

export class Migration20240112135249 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "file_upload_request" ("id" serial primary key, "file_field" varchar(255) not null, "user_id" int not null, "file_url" varchar(255) not null, "object_key" varchar(255) not null, "expires_on" timestamptz(0) not null default now() + interval \'5 minutes\');');

    this.addSql('alter table "file_upload_request" add constraint "file_upload_request_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "file_upload_request" cascade;');
  }

}
