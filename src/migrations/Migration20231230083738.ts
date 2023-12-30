import { Migration } from '@mikro-orm/migrations';

export class Migration20231230083738 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "lesson" add column "parsed_title" varchar(248) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "lesson" drop column "parsed_title";');
  }

}
