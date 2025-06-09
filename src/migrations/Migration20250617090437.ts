import { Migration } from '@mikro-orm/migrations';

export class Migration20250617090437 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "vocab_variant" ("id" serial primary key, "text" varchar(1024) not null, "vocab_id" int not null);');
    this.addSql('create index "vocab_variant_vocab_id_index" on "vocab_variant" ("vocab_id");');
    this.addSql('alter table "vocab_variant" add constraint "vocab_variant_text_vocab_id_unique" unique ("text", "vocab_id");');

    this.addSql('create table "map_vocab_variant_tag" ("id" serial primary key, "tag_id" int not null, "vocab_variant_id" int not null);');
    this.addSql('create index "map_vocab_variant_tag_vocab_variant_id_index" on "map_vocab_variant_tag" ("vocab_variant_id");');
    this.addSql('create index "map_vocab_variant_tag_tag_id_index" on "map_vocab_variant_tag" ("tag_id");');
    this.addSql('alter table "map_vocab_variant_tag" add constraint "map_vocab_variant_tag_tag_id_vocab_variant_id_unique" unique ("tag_id", "vocab_variant_id");');

    this.addSql('alter table "vocab_variant" add constraint "vocab_variant_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_vocab_variant_tag" add constraint "map_vocab_variant_tag_tag_id_foreign" foreign key ("tag_id") references "vocab_tag" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_vocab_variant_tag" add constraint "map_vocab_variant_tag_vocab_variant_id_foreign" foreign key ("vocab_variant_id") references "vocab_variant" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "session" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');
    this.addSql('alter table "session" alter column "expires_on" set default now() + interval \'1 month\';');

    this.addSql('alter table "password_reset_token" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');
    this.addSql('alter table "password_reset_token" alter column "expires_on" set default now() + interval \'1 hour\';');

    this.addSql('alter table "file_upload_request" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');
    this.addSql('alter table "file_upload_request" alter column "expires_on" set default now() + interval \'5 minutes\';');

    this.addSql('alter table "email_confirmation_token" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');
    this.addSql('alter table "email_confirmation_token" alter column "expires_on" set default now() + interval \'24 hours\';');

    this.addSql('alter table "tts_pronunciation" add column "vocab_variant_id" int null;');
    this.addSql('alter table "tts_pronunciation" add constraint "tts_pronunciation_vocab_variant_id_foreign" foreign key ("vocab_variant_id") references "vocab_variant" ("id") on update cascade on delete set null;');
    this.addSql('create index "tts_pronunciation_vocab_variant_id_index" on "tts_pronunciation" ("vocab_variant_id");');

    this.addSql('alter table "meaning" add column "vocab_variant_id" int null;');
    this.addSql('alter table "meaning" add constraint "meaning_vocab_variant_id_foreign" foreign key ("vocab_variant_id") references "vocab_variant" ("id") on update cascade on delete set null;');
    this.addSql('create index "meaning_vocab_variant_id_index" on "meaning" ("vocab_variant_id");');
  }

  async down(): Promise<void> {
    this.addSql('alter table "tts_pronunciation" drop constraint "tts_pronunciation_vocab_variant_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_vocab_variant_id_foreign";');

    this.addSql('alter table "map_vocab_variant_tag" drop constraint "map_vocab_variant_tag_vocab_variant_id_foreign";');

    this.addSql('drop table if exists "vocab_variant" cascade;');

    this.addSql('drop table if exists "map_vocab_variant_tag" cascade;');

    this.addSql('alter table "email_confirmation_token" alter column "expires_on" type timestamptz(6) using ("expires_on"::timestamptz(6));');
    this.addSql('alter table "email_confirmation_token" alter column "expires_on" set default (now() + \'24:00:00\'::interval);');

    this.addSql('alter table "file_upload_request" alter column "expires_on" type timestamptz(6) using ("expires_on"::timestamptz(6));');
    this.addSql('alter table "file_upload_request" alter column "expires_on" set default (now() + \'00:05:00\'::interval);');

    this.addSql('drop index "meaning_vocab_variant_id_index";');
    this.addSql('alter table "meaning" drop column "vocab_variant_id";');

    this.addSql('alter table "password_reset_token" alter column "expires_on" type timestamptz(6) using ("expires_on"::timestamptz(6));');
    this.addSql('alter table "password_reset_token" alter column "expires_on" set default (now() + \'01:00:00\'::interval);');

    this.addSql('alter table "session" alter column "expires_on" type timestamptz(6) using ("expires_on"::timestamptz(6));');
    this.addSql('alter table "session" alter column "expires_on" set default (now() + \'1 mon\'::interval);');

    this.addSql('drop index "tts_pronunciation_vocab_variant_id_index";');
    this.addSql('alter table "tts_pronunciation" drop column "vocab_variant_id";');
  }

}
