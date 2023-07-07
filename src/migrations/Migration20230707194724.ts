import { Migration } from '@mikro-orm/migrations';

export class Migration20230707194724 extends Migration {

  async up(): Promise<void> {
    this.addSql('create index "dictionary_name_index" on "dictionary" ("name");');

    this.addSql('create index "course_added_on_index" on "course" ("added_on");');
    this.addSql('create index "course_title_index" on "course" ("title");');

    this.addSql('create index "lesson_added_on_index" on "lesson" ("added_on");');
    this.addSql('create index "lesson_title_index" on "lesson" ("title");');
  }

  async down(): Promise<void> {
    this.addSql('drop index "dictionary_name_index";');

    this.addSql('drop index "course_added_on_index";');
    this.addSql('drop index "course_title_index";');

    this.addSql('drop index "lesson_added_on_index";');
    this.addSql('drop index "lesson_title_index";');
  }

}
