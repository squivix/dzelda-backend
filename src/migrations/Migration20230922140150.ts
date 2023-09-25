import { Migration } from '@mikro-orm/migrations';

export class Migration20230922140150 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "email_confirmation_token" add column "email" varchar(255) not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "email_confirmation_token" drop column "email";');
  }

}
