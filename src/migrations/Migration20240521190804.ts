import { Migration } from '@mikro-orm/migrations';

export class Migration20240521190804 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "pending_job" ("id" serial primary key, "job_type" varchar(255) not null, "created_date" timestamptz not null default now(), "job_params" jsonb not null, "initiator_id" int null);');
    this.addSql('create index "pending_job_initiator_id_index" on "pending_job" ("initiator_id");');

    this.addSql('alter table "pending_job" add constraint "pending_job_initiator_id_foreign" foreign key ("initiator_id") references "profile" ("id") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "pending_job" cascade;');
  }

}
