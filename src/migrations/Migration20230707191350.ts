import { Migration } from '@mikro-orm/migrations';

export class Migration20230707191350 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "language" alter column "code" type varchar(255) using ("code"::varchar(255));');
  }

  async down(): Promise<void> {
    this.addSql('alter table "language" alter column "code" type varchar(4) using ("code"::varchar(4));');
  }

}
