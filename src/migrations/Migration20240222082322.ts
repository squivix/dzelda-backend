import { Migration } from '@mikro-orm/migrations';

export class Migration20240222082322 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" alter column "account_created_at" type timestamptz using ("account_created_at"::timestamptz);');
    this.addSql('alter table "user" alter column "last_login" type timestamptz using ("last_login"::timestamptz);');

    this.addSql('alter table "session" alter column "created_at" type timestamptz using ("created_at"::timestamptz);');
    this.addSql('alter table "session" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');

    this.addSql('alter table "map_learner_language" alter column "started_learning_on" type timestamptz using ("started_learning_on"::timestamptz);');
    this.addSql('alter table "map_learner_language" alter column "last_opened" type timestamptz using ("last_opened"::timestamptz);');

    this.addSql('alter table "collection" alter column "added_on" type timestamptz using ("added_on"::timestamptz);');

    this.addSql('alter table "text" add column "is_hidden" boolean not null default false;');
    this.addSql('alter table "text" alter column "added_on" type timestamptz using ("added_on"::timestamptz);');

    this.addSql('alter table "text_history_entry" alter column "time_viewed" type timestamptz using ("time_viewed"::timestamptz);');

    this.addSql('alter table "flagged_text_report" alter column "report_text" type text using ("report_text"::text);');
    this.addSql('alter table "flagged_text_report" alter column "report_text" set default \'\';');

    this.addSql('alter table "password_reset_token" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');

    this.addSql('alter table "file_upload_request" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');

    this.addSql('alter table "email_confirmation_token" alter column "expires_on" type timestamptz using ("expires_on"::timestamptz);');

    this.addSql('alter table "tts_pronunciation" alter column "added_on" type timestamptz using ("added_on"::timestamptz);');

    this.addSql('alter table "meaning" alter column "added_on" type timestamptz using ("added_on"::timestamptz);');

    this.addSql('alter table "map_learner_vocab" alter column "saved_on" type timestamptz using ("saved_on"::timestamptz);');
  }

  async down(): Promise<void> {
    this.addSql('alter table "user" alter column "account_created_at" type timestamptz(0) using ("account_created_at"::timestamptz(0));');
    this.addSql('alter table "user" alter column "last_login" type timestamptz(0) using ("last_login"::timestamptz(0));');

    this.addSql('alter table "session" alter column "created_at" type timestamptz(0) using ("created_at"::timestamptz(0));');
    this.addSql('alter table "session" alter column "expires_on" type timestamptz(0) using ("expires_on"::timestamptz(0));');

    this.addSql('alter table "map_learner_language" alter column "started_learning_on" type timestamptz(0) using ("started_learning_on"::timestamptz(0));');
    this.addSql('alter table "map_learner_language" alter column "last_opened" type timestamptz(0) using ("last_opened"::timestamptz(0));');

    this.addSql('alter table "collection" alter column "added_on" type timestamptz(0) using ("added_on"::timestamptz(0));');

    this.addSql('alter table "text" drop column "is_hidden";');

    this.addSql('alter table "text" alter column "added_on" type timestamptz(0) using ("added_on"::timestamptz(0));');

    this.addSql('alter table "text_history_entry" alter column "time_viewed" type timestamptz(0) using ("time_viewed"::timestamptz(0));');

    this.addSql('alter table "flagged_text_report" alter column "report_text" drop default;');
    this.addSql('alter table "flagged_text_report" alter column "report_text" type text using ("report_text"::text);');

    this.addSql('alter table "password_reset_token" alter column "expires_on" type timestamptz(0) using ("expires_on"::timestamptz(0));');

    this.addSql('alter table "file_upload_request" alter column "expires_on" type timestamptz(0) using ("expires_on"::timestamptz(0));');

    this.addSql('alter table "email_confirmation_token" alter column "expires_on" type timestamptz(0) using ("expires_on"::timestamptz(0));');

    this.addSql('alter table "tts_pronunciation" alter column "added_on" type timestamptz(0) using ("added_on"::timestamptz(0));');

    this.addSql('alter table "meaning" alter column "added_on" type timestamptz(0) using ("added_on"::timestamptz(0));');

    this.addSql('alter table "map_learner_vocab" alter column "saved_on" type timestamptz(0) using ("saved_on"::timestamptz(0));');
  }

}
