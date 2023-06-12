import { Migration } from '@mikro-orm/migrations';

export class Migration20230612082108 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "course" drop column "level";');

    this.addSql('alter table "lesson" add column "level" text check ("level" in (\'beginner1\', \'beginner2\', \'intermediate1\', \'intermediate2\', \'advanced1\', \'advanced2\')) not null default \'advanced1\';');
  }

  async down(): Promise<void> {
    this.addSql('alter table "course" add column "level" text check ("level" in (\'beginner1\', \'beginner2\', \'intermediate1\', \'intermediate2\', \'advanced1\', \'advanced2\')) not null default \'advanced1\';');

    this.addSql('alter table "lesson" drop column "level";');
  }

}
