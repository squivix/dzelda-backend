import { Migration } from '@mikro-orm/migrations';

export class Migration20231002101535 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "dictionary" drop constraint "dictionary_language_id_foreign";');

    this.addSql('alter table "session" drop constraint "session_user_id_foreign";');

    this.addSql('alter table "profile" drop constraint "profile_user_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_language_id_foreign";');
    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_learner_id_foreign";');

    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_dictionary_id_foreign";');
    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_learner_id_foreign";');

    this.addSql('alter table "course" drop constraint "course_language_id_foreign";');
    this.addSql('alter table "course" drop constraint "course_added_by_id_foreign";');

    this.addSql('alter table "lesson" drop constraint "lesson_course_id_foreign";');

    this.addSql('alter table "map_learner_lesson" drop constraint "map_learner_lesson_lesson_id_foreign";');
    this.addSql('alter table "map_learner_lesson" drop constraint "map_learner_lesson_learner_id_foreign";');

    this.addSql('alter table "password_reset_token" drop constraint "password_reset_token_user_id_foreign";');

    this.addSql('alter table "email_confirmation_token" drop constraint "email_confirmation_token_user_id_foreign";');

    this.addSql('alter table "vocab" drop constraint "vocab_language_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_vocab_id_foreign";');
    this.addSql('alter table "meaning" drop constraint "meaning_language_id_foreign";');

    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_meaning_id_foreign";');
    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_learner_id_foreign";');

    this.addSql('alter table "map_lesson_vocab" drop constraint "map_lesson_vocab_vocab_id_foreign";');
    this.addSql('alter table "map_lesson_vocab" drop constraint "map_lesson_vocab_lesson_id_foreign";');

    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_vocab_id_foreign";');
    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_learner_id_foreign";');

    this.addSql('alter table "dictionary" add constraint "dictionary_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "session" add constraint "session_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "profile" add constraint "profile_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_language" add constraint "map_learner_language_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_dictionary_id_foreign" foreign key ("dictionary_id") references "dictionary" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_dictionary" add constraint "map_learner_dictionary_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "course" add constraint "course_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "course" add constraint "course_added_by_id_foreign" foreign key ("added_by_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "lesson" add constraint "lesson_course_id_foreign" foreign key ("course_id") references "course" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_lesson" add constraint "map_learner_lesson_lesson_id_foreign" foreign key ("lesson_id") references "lesson" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_lesson" add constraint "map_learner_lesson_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "password_reset_token" add constraint "password_reset_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "email_confirmation_token" add constraint "email_confirmation_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "vocab" add constraint "vocab_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "meaning" add constraint "meaning_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "meaning" add constraint "meaning_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_meaning_id_foreign" foreign key ("meaning_id") references "meaning" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_lesson_id_foreign" foreign key ("lesson_id") references "lesson" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "dictionary" drop constraint "dictionary_language_id_foreign";');

    this.addSql('alter table "session" drop constraint "session_user_id_foreign";');

    this.addSql('alter table "profile" drop constraint "profile_user_id_foreign";');

    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_language_id_foreign";');
    this.addSql('alter table "map_learner_language" drop constraint "map_learner_language_learner_id_foreign";');

    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_dictionary_id_foreign";');
    this.addSql('alter table "map_learner_dictionary" drop constraint "map_learner_dictionary_learner_id_foreign";');

    this.addSql('alter table "course" drop constraint "course_language_id_foreign";');
    this.addSql('alter table "course" drop constraint "course_added_by_id_foreign";');

    this.addSql('alter table "lesson" drop constraint "lesson_course_id_foreign";');

    this.addSql('alter table "map_learner_lesson" drop constraint "map_learner_lesson_lesson_id_foreign";');
    this.addSql('alter table "map_learner_lesson" drop constraint "map_learner_lesson_learner_id_foreign";');

    this.addSql('alter table "password_reset_token" drop constraint "password_reset_token_user_id_foreign";');

    this.addSql('alter table "email_confirmation_token" drop constraint "email_confirmation_token_user_id_foreign";');

    this.addSql('alter table "vocab" drop constraint "vocab_language_id_foreign";');

    this.addSql('alter table "meaning" drop constraint "meaning_vocab_id_foreign";');
    this.addSql('alter table "meaning" drop constraint "meaning_language_id_foreign";');

    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_meaning_id_foreign";');
    this.addSql('alter table "map_learner_meaning" drop constraint "map_learner_meaning_learner_id_foreign";');

    this.addSql('alter table "map_lesson_vocab" drop constraint "map_lesson_vocab_vocab_id_foreign";');
    this.addSql('alter table "map_lesson_vocab" drop constraint "map_lesson_vocab_lesson_id_foreign";');

    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_vocab_id_foreign";');
    this.addSql('alter table "map_learner_vocab" drop constraint "map_learner_vocab_learner_id_foreign";');

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

    this.addSql('alter table "password_reset_token" add constraint "password_reset_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');

    this.addSql('alter table "email_confirmation_token" add constraint "email_confirmation_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');

    this.addSql('alter table "vocab" add constraint "vocab_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');

    this.addSql('alter table "meaning" add constraint "meaning_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade;');
    this.addSql('alter table "meaning" add constraint "meaning_language_id_foreign" foreign key ("language_id") references "language" ("id") on update cascade;');

    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_meaning_id_foreign" foreign key ("meaning_id") references "meaning" ("id") on update cascade;');
    this.addSql('alter table "map_learner_meaning" add constraint "map_learner_meaning_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');

    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade;');
    this.addSql('alter table "map_lesson_vocab" add constraint "map_lesson_vocab_lesson_id_foreign" foreign key ("lesson_id") references "lesson" ("id") on update cascade;');

    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_vocab_id_foreign" foreign key ("vocab_id") references "vocab" ("id") on update cascade;');
    this.addSql('alter table "map_learner_vocab" add constraint "map_learner_vocab_learner_id_foreign" foreign key ("learner_id") references "profile" ("id") on update cascade;');
  }

}
