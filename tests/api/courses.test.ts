import {beforeEach, describe, expect, test} from "vitest";
import {orm} from "@/src/server.js";
import {buildQueryString, fetchRequest} from "@/tests/api/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {EntityRepository} from "@mikro-orm/core";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {Course} from "@/src/models/entities/Course.js";
import {courseSerializer} from "@/src/schemas/serializers/CourseSerializer.js";

// beforeEach(truncateDb);

interface LocalTestContext {
    userFactory: UserFactory;
    profileFactory: ProfileFactory;
    sessionFactory: SessionFactory;
    courseRepo: EntityRepository<Course>;
    courseFactory: CourseFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.courseRepo = context.em.getRepository(Course);
});

/**@link CourseController#getCourses*/
describe("GET /courses/", function () {
    const makeRequest = async (queryParams: object = {}) => {
        return await fetchRequest({
            method: "GET",
            url: `courses/${buildQueryString(queryParams)}`,
        });
    };

    test<LocalTestContext>("If there are no filters return all courses", async (context) => {
        await context.courseFactory.create(10);

        const response = await makeRequest();
        const courses = await context.courseRepo.find({}, {populate: ["addedBy.user", "lessons", "lessons.vocabs"]});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    })

});
