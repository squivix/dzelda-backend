import {Migration} from '@mikro-orm/migrations';

export class Migration20250502193220 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "vocab" alter column "text" type varchar(1024) using ("text"::varchar(1024));');
  }

  async down(): Promise<void> {
    this.addSql('alter table "vocab" alter column "text" type varchar(255) using ("text"::varchar(255));');
  }

}
