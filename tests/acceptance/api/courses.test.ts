import {beforeEach, describe, expect, test} from "vitest";
import {orm} from "@/src/server.js";
import {buildQueryString, fetchRequest} from "@/tests/acceptance/api/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {EntityRepository} from "@mikro-orm/core";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory";
import {Course} from "@/src/models/entities/Course";

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
        const courses = await context.courseRepo.find({}, {populate: ["addedBy"]});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courses.map(c => ({...c.toObject(["lessons"]), language: c.language.id})));
    });

});
