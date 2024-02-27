import { Migration } from '@mikro-orm/migrations';

export class Migration20240226171611 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "language" ("id" serial primary key, "code" varchar(255) not null, "name" varchar(255) not null, "greeting" varchar(255) not null, "second_speakers_count" int not null, "flag" varchar(500) null, "flag_circular" varchar(500) null, "flag_emoji" varchar(32) null, "color" varchar(32) not null, "level_thresholds" jsonb not null default \'{"beginner1": 0,"beginner2": 1000,"intermediate1": 5000,"intermediate2": 12000,"advanced1": 20000,"advanced2": 30000}\');');
    this.addSql('alter table "language" add constraint "language_code_unique" unique ("code");');

    this.addSql('create table "human_pronunciation" ("id" serial primary key, "url" varchar(500) not null default \'\', "text" varchar(255) not null, "parsed_text" varchar(255) not null, "language_id" int not null, "speaker_country_code" varchar(255) null, "speaker_region" varchar(255) null, "attribution" jsonb null);');
    this.addSql('create index "human_pronunciation_parsed_text_index" on "human_pronunciation" ("parsed_text");');

    this.addSql('create table "dictionary" ("id" serial primary key, "language_id" int not null, "name" varchar(255) not null, "lookup_link" varchar(500) not null, "dictionary_link" varchar(500) not null, "is_default" boolean not null default false, "is_pronunciation" boolean not null default false);');
    this.addSql('create index "dictionary_is_pronunciation_index" on "dictionary" ("is_pronunciation");');
    this.addSql('create index "dictionary_name_index" on "dictionary" ("name");');
    this.addSql('create index "dictionary_language_id_index" on "dictionary" ("language_id");');

    this.addSql('create table "translation_language" ("id" serial primary key, "code" varchar(255) not null, "name" varchar(255) not null, "is_default" boolean not null default false);');
    this.addSql('alter table "translation_language" add constraint "translation_language_code_unique" unique ("code");');

    this.addSql('create table "tts_voice" ("id" serial primary key, "code" varchar(255) not null, "name" varchar(255) not null, "gender" varchar(255) not null, "provider" text check ("provider" in (\'Google Cloud TTS\')) not null, "accent_country_code" varchar(255) not null, "is_default" boolean not null default false, "language_id" int not null, "synthesize_params" jsonb null);');
    this.addSql('alter table "tts_voice" add constraint "tts_voice_language_id_code_unique" unique ("language_id", "code");');

    this.addSql('create table "user" ("id" serial primary key, "username" varchar(20) not null, "email" varchar(255) not null, "is_email_confirmed" boolean not null default false, "password" varchar(255) not null, "is_staff" boolean not null default false, "is_admin" boolean not null default false, "account_created_at" timestamptz not null default now(), "last_login" timestamptz null);');
    this.addSql('alter table "user" add constraint "user_username_unique" unique ("username");');
    this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');

    this.addSql('create table "session" ("id" serial primary key, "token" varchar(255) not null, "user_id" int not null, "created_at" timestamptz not null default now(), "expires_on" timestamptz not null default now() + interval \'1 month\');');

    this.addSql('create table "profile" ("id" serial primary key, "user_id" int not null, "profile_picture" varchar(500) not null default \'\', "bio" text not null default \'\', "is_public" boolean not null default true);');
    this.addSql('alter table "profile" add constraint "profile_user_id_unique" unique ("user_id");');

    this.addSql('create table "map_learner_language" ("id" serial primary key, "language_id" int not null, "learner_id" int not null, "started_learning_on" timestamptz not null default now(), "last_opened" timestamptz not null default now(), "preferred_tts_voice_id" int null);');
    this.addSql('create index "map_learner_language_language_id_index" on "map_learner_language" ("language_id");');
    this.addSql('create index "map_learner_language_learner_id_index" on "map_learner_language" ("learner_id");');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_language_id_learner_id_unique" unique ("language_id", "learner_id");');

    this.addSql('create table "preferred_translation_language_entry" ("id" serial primary key, "translation_language_id" int not null, "learner_language_mapping_id" int not null, "precedence_order" int not null);');
    this.addSql('create index "preferred_translation_language_entry_learner_langua_c309c_index" on "preferred_translation_language_entry" ("learner_language_mapping_id");');
    this.addSql('create index "preferred_translation_language_entry_translation_la_a698b_index" on "preferred_translation_language_entry" ("translation_language_id");');
    this.addSql('alter table "preferred_translation_language_entry" add constraint "preferred_translation_language_entry_translation_l_a61a8_unique" unique ("translation_language_id", "learner_language_mapping_id");');

    this.addSql('create table "map_learner_dictionary" ("id" serial primary key, "dictionary_id" int not null, "learner_id" int not null, "order" int not null default 0);');
    this.addSql('create index "map_learner_dictionary_learner_id_index" on "map_learner_dictionary" ("learner_id");');
    this.addSql('create index "map_learner_dictionary_dictionary_id_index" on "map_learner_dictionary" ("dictionary_id");');
    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_dictionary_id_learner_id_unique" unique ("dictionary_id", "learner_id");');

    this.addSql('create table "collection" ("id" serial primary key, "title" varchar(255) not null, "description" varchar(500) not null default \'\', "language_id" int not null, "image" varchar(500) not null default \'\', "added_by_id" int not null, "added_on" timestamptz not null default now());');
    this.addSql('create index "collection_added_on_index" on "collection" ("added_on");');
    this.addSql('create index "collection_title_index" on "collection" ("title");');
    this.addSql('create index "collection_added_by_id_index" on "collection" ("added_by_id");');
    this.addSql('create index "collection_language_id_index" on "collection" ("language_id");');

    this.addSql('create table "text" ("id" serial primary key, "title" varchar(124) not null, "content" text not null, "parsed_title" varchar(248) null, "parsed_content" text null, "audio" varchar(500) not null default \'\', "image" varchar(500) not null default \'\', "language_id" int not null, "collection_id" int null, "is_public" boolean not null default true, "added_by_id" int not null, "level" text check ("level" in (\'beginner1\', \'beginner2\', \'intermediate1\', \'intermediate2\', \'advanced1\', \'advanced2\')) not null default \'advanced1\', "order_in_collection" int null, "added_on" timestamptz not null default now(), "is_hidden" boolean not null default false);');
    this.addSql('create index "text_added_on_index" on "text" ("added_on");');
    this.addSql('create index "text_title_index" on "text" ("title");');
    this.addSql('create index "text_collection_id_index" on "text" ("collection_id");');

    this.addSql('create table "text_history_entry" ("id" serial primary key, "text_id" int not null, "past_viewer_id" int null, "time_viewed" timestamptz not null default now());');
    this.addSql('create index "text_history_entry_past_viewer_id_index" on "text_history_entry" ("past_viewer_id");');
    this.addSql('create index "text_history_entry_text_id_index" on "text_history_entry" ("text_id");');
    this.addSql('create index "text_history_entry_text_id_past_viewer_id_index" on "text_history_entry" ("text_id", "past_viewer_id");');

    this.addSql('create table "text_bookmark" ("id" serial primary key, "text_id" int not null, "bookmarker_id" int not null);');
    this.addSql('create index "text_bookmark_bookmarker_id_index" on "text_bookmark" ("bookmarker_id");');
    this.addSql('create index "text_bookmark_text_id_index" on "text_bookmark" ("text_id");');
    this.addSql('alter table "text_bookmark" add constraint "text_bookmark_text_id_bookmarker_id_unique" unique ("text_id", "bookmarker_id");');

    this.addSql('create table "map_hider_text" ("id" serial primary key, "text_id" int not null, "hider_id" int not null);');
    this.addSql('create index "map_hider_text_hider_id_index" on "map_hider_text" ("hider_id");');
    this.addSql('create index "map_hider_text_text_id_index" on "map_hider_text" ("text_id");');
    this.addSql('alter table "map_hider_text" add constraint "map_hider_text_text_id_hider_id_unique" unique ("text_id", "hider_id");');

    this.addSql('create table "flagged_text_report" ("id" serial primary key, "text_id" int not null, "reporter_id" int null, "reason_for_reporting" varchar(512) not null, "report_text" text not null default \'\', "is_valid" boolean not null default true);');
    this.addSql('create index "flagged_text_report_reporter_id_index" on "flagged_text_report" ("reporter_id");');
    this.addSql('create index "flagged_text_report_text_id_index" on "flagged_text_report" ("text_id");');
    this.addSql('alter table "flagged_text_report" add constraint "flagged_text_report_text_id_reporter_id_unique" unique ("text_id", "reporter_id");');

    this.addSql('create table "collection_bookmark" ("id" serial primary key, "collection_id" int not null, "bookmarker_id" int not null);');
    this.addSql('create index "collection_bookmark_bookmarker_id_index" on "collection_bookmark" ("bookmarker_id");');
    this.addSql('create index "collection_bookmark_collection_id_index" on "collection_bookmark" ("collection_id");');
    this.addSql('alter table "collection_bookmark" add constraint "collection_bookmark_collection_id_bookmarker_id_unique" unique ("collection_id", "bookmarker_id");');

    this.addSql('create table "password_reset_token" ("id" serial primary key, "token" varchar(255) not null, "expires_on" timestamptz not null default now() + interval \'1 hour\', "user_id" int not null);');
    this.addSql('alter table "password_reset_token" add constraint "password_reset_token_user_id_unique" unique ("user_id");');

    this.addSql('create table "file_upload_request" ("id" serial primary key, "file_field" varchar(255) not null, "user_id" int not null, "file_url" varchar(255) not null, "object_key" varchar(255) not null, "expires_on" timestamptz not null default now() + interval \'5 minutes\');');

    this.addSql('create table "email_confirmation_token" ("id" serial primary key, "token" varchar(255) not null, "expires_on" timestamptz not null default now() + interval \'24 hours\', "user_id" int not null, "email" varchar(255) not null);');
    this.addSql('alter table "email_confirmation_token" add constraint "email_confirmation_token_user_id_unique" unique ("user_id");');

    this.addSql('create table "vocab" ("id" serial primary key, "text" varchar(255) not null, "language_id" int not null, "is_phrase" boolean not null default false);');
    this.addSql('create index "vocab_language_id_index" on "vocab" ("language_id");');
    this.addSql('alter table "vocab" add constraint "vocab_language_id_text_unique" unique ("language_id", "text");');

    this.addSql('create table "tts_pronunciation" ("id" serial primary key, "url" varchar(500) not null default \'\', "added_on" timestamptz not null default now(), "voice_id" int not null, "vocab_id" int not null);');

    this.addSql('create table "meaning" ("id" serial primary key, "text" varchar(500) not null, "vocab_id" int not null, "added_by_id" int null, "added_on" timestamptz not null default now(), "attribution" jsonb null, "language_id" int not null);');
    this.addSql('create index "meaning_added_by_id_index" on "meaning" ("added_by_id");');
    this.addSql('create index "meaning_language_id_index" on "meaning" ("language_id");');
    this.addSql('create index "meaning_vocab_id_index" on "meaning" ("vocab_id");');
    this.addSql('alter table "meaning" add constraint "meaning_vocab_id_text_language_id_unique" unique ("vocab_id", "text", "language_id");');

    this.addSql('create table "map_learner_meaning" ("id" serial primary key, "meaning_id" int not null, "learner_id" int not null);');
    this.addSql('create index "map_learner_meaning_learner_id_index" on "map_learner_meaning" ("learner_id");');
    this.addSql('create index "map_learner_meaning_meaning_id_index" on "map_learner_meaning" ("meaning_id");');
    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_meaning_id_learner_id_unique" unique ("meaning_id", "learner_id");');

    this.addSql('create table "map_text_vocab" ("id" serial primary key, "vocab_id" int not null, "text_id" int not null);');
    this.addSql('create index "map_text_vocab_vocab_id_index" on "map_text_vocab" ("vocab_id");');
    this.addSql('create index "map_text_vocab_text_id_index" on "map_text_vocab" ("text_id");');
    this.addSql('alter table "map_text_vocab" add constraint "map_text_vocab_vocab_id_text_id_unique" unique ("vocab_id", "text_id");');

    this.addSql('create table "map_learner_vocab" ("id" serial primary key, "vocab_id" int not null, "learner_id" int not null, "level" smallint not null default 1, "notes" varchar(2048) not null default \'\', "saved_on" timestamptz not null default now());');
    this.addSql('create index "map_learner_vocab_learner_id_index" on "map_learner_vocab" ("learner_id");');
    this.addSql('create index "map_learner_vocab_vocab_id_index" on "map_learner_vocab" ("vocab_id");');
    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_vocab_id_learner_id_unique" unique ("vocab_id", "learner_id");');

    this.addSql('alter table "human_pronunciation" add constraint "human_pronunciation_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "dictionary" add constraint "dictionary_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "tts_voice" add constraint "tts_voice_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "session" add constraint "session_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "profile" add constraint "profile_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_preferred_tts_voice_id_foreign" foreign key ("preferred_tts_voice_id") references "tts_voice" ("id") on update cascade on delete set null;');

    this.addSql('alter table "preferred_translation_language_entry" add constraint "preferred_translation_language_entry_translation__4106e_foreign" foreign key ("translation_language_id") references "translation_language" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "preferred_translation_language_entry" add constraint "preferred_translation_language_entry_learner_lang_664ab_foreign" foreign key ("learner_language_mapping_id") references "map_learner_language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_dictionary_id_foreign" foreign key ("dictionary_id") references "dictionary" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "collection" add constraint "collection_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "collection" add constraint "collection_added_by_id_foreign" foreign key ("added_by_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "text" add constraint "text_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "text" add constraint "text_collection_id_foreign" foreign key ("collection_id") references "collection" ("id") on update cascade on delete set null;');
    this.addSql('alter table "text" add constraint "text_added_by_id_foreign" foreign key ("added_by_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "text_history_entry" add constraint "text_history_entry_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "text_history_entry" add constraint "text_history_entry_past_viewer_id_foreign" foreign key ("past_viewer_id") references "profile" ("id") on update cascade on delete set null;');

    this.addSql('alter table "text_bookmark" add constraint "text_bookmark_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "text_bookmark" add constraint "text_bookmark_bookmarker_id_foreign" foreign key ("bookmarker_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_hider_text" add constraint "map_hider_text_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_hider_text" add constraint "map_hider_text_hider_id_foreign" foreign key ("hider_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "flagged_text_report" add constraint "flagged_text_report_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "flagged_text_report" add constraint "flagged_text_report_reporter_id_foreign" foreign key ("reporter_id") references "profile" ("id") on update cascade on delete set null;');

    this.addSql('alter table "collection_bookmark" add constraint "collection_bookmark_collection_id_foreign" foreign key ("collection_id") references "collection" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "collection_bookmark" add constraint "collection_bookmark_bookmarker_id_foreign" foreign key ("bookmarker_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "password_reset_token" add constraint "password_reset_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "file_upload_request" add constraint "file_upload_request_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "email_confirmation_token" add constraint "email_confirmation_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "vocab" add constraint "vocab_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "tts_pronunciation" add constraint "tts_pronunciation_voice_id_foreign" foreign key ("voice_id") references "tts_voice" ("id") on update cascade on delete restrict;');
    this.addSql('alter table "tts_pronunciation" add constraint "tts_pronunciation_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "meaning" add constraint "meaning_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "meaning" add constraint "meaning_added_by_id_foreign" foreign key ("added_by_id") references "profile" ("id") on update cascade on delete set null;');
    this.addSql('alter table "meaning" add constraint "meaning_language_id_foreign" foreign key ("language_id") references "translation_language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_meaning_id_foreign" foreign key ("meaning_id") references "meaning" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_text_vocab" add constraint "map_text_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_text_vocab" add constraint "map_text_vocab_text_id_foreign" foreign key ("text_id") references "text" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "human_pronunciation" drop constraint "human_pronunciation_language_id_foreign";');

    this.addSql('alter table "dictionary" drop constraint "dictionary_language_id_foreign";');

    this.addSql('alter table "tts_voice" drop constraint "tts_voice_language_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_language_id_foreign";');

    this.addSql('alter table "collection" drop constraint "collection_language_id_foreign";');

    this.addSql('alter table "text" drop constraint "text_language_id_foreign";');

    this.addSql('alter table "vocab" drop constraint "vocab_language_id_foreign";');

    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_dictionary_id_foreign";');

    this.addSql('alter table "preferred_translation_language_entry" drop constraint "preferred_translation_language_entry_translation__4106e_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_language_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_preferred_tts_voice_id_foreign";');

    this.addSql('alter table "tts_pronunciation" drop constraint "tts_pronunciation_voice_id_foreign";');

    this.addSql('alter table "session" drop constraint "session_user_id_foreign";');

    this.addSql('alter table "profile" drop constraint "profile_user_id_foreign";');

    this.addSql('alter table "password_reset_token" drop constraint "password_reset_token_user_id_foreign";');

    this.addSql('alter table "file_upload_request" drop constraint "file_upload_request_user_id_foreign";');

    this.addSql('alter table "email_confirmation_token" drop constraint "email_confirmation_token_user_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_learner_id_foreign";');

    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_learner_id_foreign";');

    this.addSql('alter table "collection" drop constraint "collection_added_by_id_foreign";');

    this.addSql('alter table "text" drop constraint "text_added_by_id_foreign";');

    this.addSql('alter table "text_history_entry" drop constraint "text_history_entry_past_viewer_id_foreign";');

    this.addSql('alter table "text_bookmark" drop constraint "text_bookmark_bookmarker_id_foreign";');

    this.addSql('alter table "map_hider_text" drop constraint "map_hider_text_hider_id_foreign";');

    this.addSql('alter table "flagged_text_report" drop constraint "flagged_text_report_reporter_id_foreign";');

    this.addSql('alter table "collection_bookmark" drop constraint "collection_bookmark_bookmarker_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_added_by_id_foreign";');

    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_learner_id_foreign";');

    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_learner_id_foreign";');

    this.addSql('alter table "preferred_translation_language_entry" drop constraint "preferred_translation_language_entry_learner_lang_664ab_foreign";');

    this.addSql('alter table "text" drop constraint "text_collection_id_foreign";');

    this.addSql('alter table "collection_bookmark" drop constraint "collection_bookmark_collection_id_foreign";');

    this.addSql('alter table "text_history_entry" drop constraint "text_history_entry_text_id_foreign";');

    this.addSql('alter table "text_bookmark" drop constraint "text_bookmark_text_id_foreign";');

    this.addSql('alter table "map_hider_text" drop constraint "map_hider_text_text_id_foreign";');

    this.addSql('alter table "flagged_text_report" drop constraint "flagged_text_report_text_id_foreign";');

    this.addSql('alter table "map_text_vocab" drop constraint "map_text_vocab_text_id_foreign";');

    this.addSql('alter table "tts_pronunciation" drop constraint "tts_pronunciation_vocab_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_vocab_id_foreign";');

    this.addSql('alter table "map_text_vocab" drop constraint "map_text_vocab_vocab_id_foreign";');

    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_vocab_id_foreign";');

    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_meaning_id_foreign";');

    this.addSql('drop table if exists "language" cascade;');

    this.addSql('drop table if exists "human_pronunciation" cascade;');

    this.addSql('drop table if exists "dictionary" cascade;');

    this.addSql('drop table if exists "translation_language" cascade;');

    this.addSql('drop table if exists "tts_voice" cascade;');

    this.addSql('drop table if exists "user" cascade;');

    this.addSql('drop table if exists "session" cascade;');

    this.addSql('drop table if exists "profile" cascade;');

    this.addSql('drop table if exists "map_learner_language" cascade;');

    this.addSql('drop table if exists "preferred_translation_language_entry" cascade;');

    this.addSql('drop table if exists "map_learner_dictionary" cascade;');

    this.addSql('drop table if exists "collection" cascade;');

    this.addSql('drop table if exists "text" cascade;');

    this.addSql('drop table if exists "text_history_entry" cascade;');

    this.addSql('drop table if exists "text_bookmark" cascade;');

    this.addSql('drop table if exists "map_hider_text" cascade;');

    this.addSql('drop table if exists "flagged_text_report" cascade;');

    this.addSql('drop table if exists "collection_bookmark" cascade;');

    this.addSql('drop table if exists "password_reset_token" cascade;');

    this.addSql('drop table if exists "file_upload_request" cascade;');

    this.addSql('drop table if exists "email_confirmation_token" cascade;');

    this.addSql('drop table if exists "vocab" cascade;');

    this.addSql('drop table if exists "tts_pronunciation" cascade;');

    this.addSql('drop table if exists "meaning" cascade;');

    this.addSql('drop table if exists "map_learner_meaning" cascade;');

    this.addSql('drop table if exists "map_text_vocab" cascade;');

    this.addSql('drop table if exists "map_learner_vocab" cascade;');
  }

}
