import { Migration } from '@mikro-orm/migrations';

export class Migration20221029192615 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "profile" alter column "profile_picture" type varchar(500) using ("profile_picture"::varchar(500));');
    this.addSql('alter table "profile" alter column "profile_picture" set default \'\';');
  }

  async down(): Promise<void> {
    this.addSql('alter table "profile" alter column "profile_picture" drop default;');
    this.addSql('alter table "profile" alter column "profile_picture" type varchar(500) using ("profile_picture"::varchar(500));');
  }

}
