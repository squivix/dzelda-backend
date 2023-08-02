import { Migration } from '@mikro-orm/migrations';

export class Migration20230725092023 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "language" ("id" serial primary key, "code" varchar(255) not null, "name" varchar(255) not null, "greeting" varchar(255) not null, "flag" varchar(500) null default null, "flag_circular" varchar(500) null default null, "flag_emoji" varchar(32) null default null, "is_supported" boolean not null default false, "level_thresholds" jsonb not null default \'{"beginner1": 0,"beginner2": 1000,"intermediate1": 5000,"intermediate2": 12000,"advanced1": 20000,"advanced2": 30000}\');');
    this.addSql('alter table "language" add constraint "language_code_unique" unique ("code");');

    this.addSql('create table "dictionary" ("id" serial primary key, "language_id" int not null, "name" varchar(255) not null, "lookup_link" varchar(500) not null, "dictionary_link" varchar(500) not null, "is_default" boolean not null default false);');
    this.addSql('create index "dictionary_name_index" on "dictionary" ("name");');
    this.addSql('create index "dictionary_language_id_index" on "dictionary" ("language_id");');

    this.addSql('create table "user" ("id" serial primary key, "username" varchar(20) not null, "email" varchar(255) not null, "password" varchar(255) not null, "is_staff" boolean not null default false, "is_admin" boolean not null default false, "account_created_at" timestamptz(0) not null default now(), "last_login" timestamptz(0) not null default now());');
    this.addSql('alter table "user" add constraint "user_username_unique" unique ("username");');
    this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');

    this.addSql('create table "session" ("id" serial primary key, "token" varchar(255) not null, "user_id" int not null, "created_at" timestamptz(0) not null default now());');
    this.addSql('alter table "session" add constraint "session_user_id_unique" unique ("user_id");');

    this.addSql('create table "profile" ("id" serial primary key, "user_id" int not null, "profile_picture" varchar(500) not null default \'\', "bio" text not null default \'\', "is_public" boolean not null default true);');
    this.addSql('alter table "profile" add constraint "profile_user_id_unique" unique ("user_id");');

    this.addSql('create table "map_learner_language" ("id" serial primary key, "language_id" int not null, "learner_id" int not null, "added_on" timestamptz(0) not null default now(), "last_opened" timestamptz(0) not null default now());');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_language_id_learner_id_unique" unique ("language_id", "learner_id");');

    this.addSql('create table "map_learner_dictionary" ("id" serial primary key, "dictionary_id" int not null, "learner_id" int not null);');
    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_dictionary_id_learner_id_unique" unique ("dictionary_id", "learner_id");');

    this.addSql('create table "course" ("id" serial primary key, "title" varchar(255) not null, "description" varchar(500) not null default \'\', "language_id" int not null, "image" varchar(500) not null default \'\', "is_public" boolean not null default true, "added_by_id" int not null, "added_on" timestamptz(0) not null default now());');
    this.addSql('create index "course_added_on_index" on "course" ("added_on");');
    this.addSql('create index "course_title_index" on "course" ("title");');
    this.addSql('create index "course_added_by_id_index" on "course" ("added_by_id");');
    this.addSql('create index "course_language_id_index" on "course" ("language_id");');

    this.addSql('create table "lesson" ("id" serial primary key, "title" varchar(124) not null, "text" text not null, "audio" varchar(500) not null default \'\', "image" varchar(500) not null default \'\', "course_id" int not null, "order_in_course" int not null default 0, "level" text check ("level" in (\'beginner1\', \'beginner2\', \'intermediate1\', \'intermediate2\', \'advanced1\', \'advanced2\')) not null default \'advanced1\', "added_on" timestamptz(0) not null default now());');
    this.addSql('create index "lesson_added_on_index" on "lesson" ("added_on");');
    this.addSql('create index "lesson_title_index" on "lesson" ("title");');
    this.addSql('create index "lesson_course_id_index" on "lesson" ("course_id");');

    this.addSql('create table "map_learner_lesson" ("id" serial primary key, "lesson_id" int not null, "learner_id" int not null);');
    this.addSql('alter table "map_learner_lesson" add constraint "map_learner_lesson_lesson_id_learner_id_unique" unique ("lesson_id", "learner_id");');

    this.addSql('create table "vocab" ("id" serial primary key, "text" varchar(255) not null, "language_id" int not null, "is_phrase" boolean not null default false);');
    this.addSql('create index "vocab_language_id_index" on "vocab" ("language_id");');
    this.addSql('alter table "vocab" add constraint "vocab_language_id_text_unique" unique ("language_id", "text");');

    this.addSql('create table "meaning" ("id" serial primary key, "text" varchar(1000) not null, "vocab_id" int not null, "added_by_id" int, "added_on" timestamptz(0) not null default now(), "language_id" int not null);');
    this.addSql('create index "meaning_added_by_id_index" on "meaning" ("added_by_id");');
    this.addSql('create index "meaning_language_id_index" on "meaning" ("language_id");');
    this.addSql('create index "meaning_vocab_id_index" on "meaning" ("vocab_id");');
    this.addSql('alter table "meaning" add constraint "meaning_vocab_id_text_language_id_unique" unique ("vocab_id", "text", "language_id");');

    this.addSql('create table "map_learner_meaning" ("id" serial primary key, "meaning_id" int not null, "learner_id" int not null);');
    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_meaning_id_learner_id_unique" unique ("meaning_id", "learner_id");');

    this.addSql('create table "map_lesson_vocab" ("id" serial primary key, "vocab_id" int not null, "lesson_id" int not null);');
    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_vocab_id_lesson_id_unique" unique ("vocab_id", "lesson_id");');

    this.addSql('create table "map_learner_vocab" ("id" serial primary key, "vocab_id" int not null, "learner_id" int not null, "level" smallint not null default 1, "notes" varchar(2048) not null default \'\');');
    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_vocab_id_learner_id_unique" unique ("vocab_id", "learner_id");');

    this.addSql('alter table "dictionary" add constraint "dictionary_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');

    this.addSql('alter table "session" add constraint "session_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');

    this.addSql('alter table "profile" add constraint "profile_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');

    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');

    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_dictionary_id_foreign" foreign key ("dictionary_id") references "dictionary" ("id") on update cascade;');
    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');

    this.addSql('alter table "course" add constraint "course_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');
    this.addSql('alter table "course" add constraint "course_added_by_id_foreign" foreign key ("added_by_id") references "profile" ("id") on update cascade;');

    this.addSql('alter table "lesson" add constraint "lesson_course_id_foreign" foreign key ("course_id") references "course" ("id") on update cascade;');

    this.addSql('alter table "map_learner_lesson" add constraint "map_learner_lesson_lesson_id_foreign" foreign key ("lesson_id") references "lesson" ("id") on update cascade;');
    this.addSql('alter table "map_learner_lesson" add constraint "map_learner_lesson_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');

    this.addSql('alter table "vocab" add constraint "vocab_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');

    this.addSql('alter table "meaning" add constraint "meaning_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade;');
    this.addSql('alter table "meaning" add constraint "meaning_added_by_id_foreign" foreign key ("added_by_id") references "profile" ("id") on update cascade;');
    this.addSql('alter table "meaning" add constraint "meaning_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');

    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_meaning_id_foreign" foreign key ("meaning_id") references "meaning" ("id") on update cascade;');
    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');

    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade;');
    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_lesson_id_foreign" foreign key ("lesson_id") references "lesson" ("id") on update cascade;');

    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade;');
    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "dictionary" drop constraint "dictionary_language_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_language_id_foreign";');

    this.addSql('alter table "course" drop constraint "course_language_id_foreign";');

    this.addSql('alter table "vocab" drop constraint "vocab_language_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_language_id_foreign";');

    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_dictionary_id_foreign";');

    this.addSql('alter table "session" drop constraint "session_user_id_foreign";');

    this.addSql('alter table "profile" drop constraint "profile_user_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_learner_id_foreign";');

    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_learner_id_foreign";');

    this.addSql('alter table "course" drop constraint "course_added_by_id_foreign";');

    this.addSql('alter table "map_learner_lesson" drop constraint "map_learner_lesson_learner_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_added_by_id_foreign";');

    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_learner_id_foreign";');

    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_learner_id_foreign";');

    this.addSql('alter table "lesson" drop constraint "lesson_course_id_foreign";');

    this.addSql('alter table "map_learner_lesson" drop constraint "map_learner_lesson_lesson_id_foreign";');

    this.addSql('alter table "map_lesson_vocab" drop constraint "map_lesson_vocab_lesson_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_vocab_id_foreign";');

    this.addSql('alter table "map_lesson_vocab" drop constraint "map_lesson_vocab_vocab_id_foreign";');

    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_vocab_id_foreign";');

    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_meaning_id_foreign";');

    this.addSql('drop table if exists "language" cascade;');

    this.addSql('drop table if exists "dictionary" cascade;');

    this.addSql('drop table if exists "user" cascade;');

    this.addSql('drop table if exists "session" cascade;');

    this.addSql('drop table if exists "profile" cascade;');

    this.addSql('drop table if exists "map_learner_language" cascade;');

    this.addSql('drop table if exists "map_learner_dictionary" cascade;');

    this.addSql('drop table if exists "course" cascade;');

    this.addSql('drop table if exists "lesson" cascade;');

    this.addSql('drop table if exists "map_learner_lesson" cascade;');

    this.addSql('drop table if exists "vocab" cascade;');

    this.addSql('drop table if exists "meaning" cascade;');

    this.addSql('drop table if exists "map_learner_meaning" cascade;');

    this.addSql('drop table if exists "map_lesson_vocab" cascade;');

    this.addSql('drop table if exists "map_learner_vocab" cascade;');
  }

}
