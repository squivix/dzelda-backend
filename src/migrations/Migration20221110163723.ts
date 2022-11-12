import { Migration } from '@mikro-orm/migrations';

export class Migration20221110163723 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "language" alter column "flag_emoji" type varchar(32) using ("code"::varchar(32));');
  }

  async down(): Promise<void> {
    this.addSql('alter table "language" alter column "flag_emoji" type varchar(4) using ("code"::varchar(4));');
  }

}
