import {beforeEach, describe, expect, test} from "vitest";
import {orm} from "@/src/server.js";
import {buildQueryString, fetchRequest} from "@/tests/api/utils.js";
import {UserFactory} from "@/src/seeders/factories/UserFactory.js";
import {SessionFactory} from "@/src/seeders/factories/SessionFactory.js";
import {ProfileFactory} from "@/src/seeders/factories/ProfileFactory.js";
import {CourseFactory} from "@/src/seeders/factories/CourseFactory.js";
import {Course} from "@/src/models/entities/Course.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {InjectOptions} from "light-my-request";
import {LanguageFactory} from "@/src/seeders/factories/LanguageFactory.js";
import {faker} from "@faker-js/faker";
import {randomCase} from "@/tests/utils.js";

// beforeEach(truncateDb);

interface LocalTestContext {
    userFactory: UserFactory;
    profileFactory: ProfileFactory;
    sessionFactory: SessionFactory;
    courseRepo: CourseRepo;
    langaugeFactory: LanguageFactory;
    courseFactory: CourseFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.langaugeFactory = new LanguageFactory(context.em);
    context.courseRepo = context.em.getRepository(Course) as CourseRepo;
});

/**@link CourseController#getCourses*/
describe("GET /courses/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${buildQueryString(queryParams)}`,
        };
        if (authToken)
            options.headers = {authorization: `Bearer ${authToken}`};
        return await fetchRequest(options);
    };

    test<LocalTestContext>("If there are no filters return all public courses", async (context) => {
        await context.courseFactory.create(10);

        const response = await makeRequest();
        const courses = await context.courseRepo.find({isPublic: true}, {populate: ["addedBy.user"]});
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    })
    describe("test languageCode filter", () => {
        test<LocalTestContext>("If language filter is valid and language exists only return public courses in that language", async (context) => {
            const language = await context.langaugeFactory.createOne();
            await context.courseFactory.create(5, {language: language});
            await context.courseFactory.create(5);

            const response = await makeRequest({languageCode: language.code});
            const courses = await context.courseRepo.find({
                isPublic: true,
                language: language
            }, {populate: ["addedBy.user"], refresh: true});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });
        test<LocalTestContext>("If language does not exist return empty course list", async (context) => {
            await context.courseFactory.create(10);

            const response = await makeRequest({languageCode: faker.random.alpha({count: 4})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });

        test<LocalTestContext>("If language filter is invalid return 400", async (context) => {
            await context.courseFactory.create(10);

            const response = await makeRequest({languageCode: 12345});
            expect(response.statusCode).to.equal(400)
        });
    });

    describe("test addedBy filter", () => {
        test<LocalTestContext>("If addedBy filter is valid and user exists only return public courses added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            await context.courseFactory.create(5, {addedBy: user.profile});
            await context.courseFactory.create(5);

            const response = await makeRequest({addedBy: user.username});
            const courses = await context.courseRepo.find({
                isPublic: true,
                addedBy: user.profile
            }, {populate: ["addedBy.user"], refresh: true});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });

        test<LocalTestContext>("If addedBy is me and signed in return courses added by that user", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            await context.courseFactory.create(5, {addedBy: user.profile});
            await context.courseFactory.create(5);

            const response = await makeRequest({addedBy: "me"}, session.token);
            let courses = await context.courseRepo.find({
                addedBy: user.profile
            }, {populate: ["addedBy.user"], refresh: true});
            courses = await context.courseRepo.annotateVocabsByLevel(courses, user.id)

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        });


        test<LocalTestContext>("If addedBy is me and not signed in return 401", async (context) => {
            await context.courseFactory.create(10);

            const response = await makeRequest({addedBy: "me"});
            expect(response.statusCode).to.equal(401);
        });
        test<LocalTestContext>("If user does not exist return empty course list", async (context) => {
            await context.courseFactory.create(10);

            const response = await makeRequest({addedBy: faker.random.alpha({count: 20})});
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        });

        test<LocalTestContext>("If addedBy filter is invalid return 400", async (context) => {
            await context.courseFactory.create(10);

            const response = await makeRequest({addedBy: "!@#%#%^#^!"});
            expect(response.statusCode).to.equal(400)
        });
    });
    describe("test searchQuery filter", () => {
        test<LocalTestContext>("If searchQuery is valid return courses with query in title or description", async (context) => {
            const searchQuery = "search query";
            for (let i = 0; i < 10; i++) {
                if (i % 2 == 0)
                    await context.courseFactory.createOne({title: `title ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`});
                else
                    await context.courseFactory.createOne({description: `description ${randomCase(searchQuery)} ${faker.random.alphaNumeric(10)}`});
            }
            await context.courseFactory.create(5)

            const response = await makeRequest({searchQuery: searchQuery});

            const courses = await context.courseRepo.find({
                isPublic: true,
                $or: [{title: {$ilike: `%${searchQuery}5`}}, {description: {$ilike: `%${searchQuery}5`}}]
            })
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serializeList(courses));
        })
        test<LocalTestContext>("If searchQuery is invalid return 400", async (context) => {
            await context.courseFactory.create(10)

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 300})});

            expect(response.statusCode).to.equal(400);
        })
        test<LocalTestContext>("If no courses match search query return empty list", async (context) => {
            await context.courseFactory.create(10)

            const response = await makeRequest({searchQuery: faker.random.alpha({count: 200})});

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual([]);
        })
    })
    test<LocalTestContext>("If logged in return courses with vocab levels for user", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        await context.courseFactory.create(10);

        const response = await makeRequest({}, session.token);

        let courses = await context.courseRepo.find({isPublic: true}, {populate: ["addedBy.user"]});
        courses = await context.courseRepo.annotateVocabsByLevel(courses, user.id)
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    })
    test<LocalTestContext>("If logged in as author of courses return private courses", async (context) => {
        const user = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: user});
        await context.courseFactory.create(10, {addedBy: user.profile});

        const response = await makeRequest({}, session.token);

        let courses = await context.courseRepo.find({$or: [{isPublic: true}, {addedBy: user.profile}]}, {populate: ["addedBy.user"]});
        courses = await context.courseRepo.annotateVocabsByLevel(courses, user.id)
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serializeList(courses));
    });

});
