import {beforeEach, describe, expect, test} from "vitest";
import {orm} from "@/src/server.js";
import {buildQueryString, fetchRequest, fetchWithFiles} from "@/tests/api/utils.js";
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
import {randomCase, randomImage, shuffleArray} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {defaultVocabsByLevel} from "@/src/models/enums/VocabLevel.js";
// @ts-ignore
import formAutoContent from "form-auto-content";
import fs from "fs-extra";
import {LessonFactory} from "@/src/seeders/factories/LessonFactory.js";
import courseService from "@/src/services/CourseService.js";

// beforeEach(truncateDb);


interface LocalTestContext {
    userFactory: UserFactory;
    profileFactory: ProfileFactory;
    sessionFactory: SessionFactory;
    courseRepo: CourseRepo;
    languageFactory: LanguageFactory;
    courseFactory: CourseFactory;
    lessonFactory: LessonFactory;
}

beforeEach<LocalTestContext>((context) => {
    context.em = orm.em.fork();

    context.userFactory = new UserFactory(context.em);
    context.profileFactory = new ProfileFactory(context.em);
    context.sessionFactory = new SessionFactory(context.em);
    context.courseFactory = new CourseFactory(context.em);
    context.lessonFactory = new LessonFactory(context.em);
    context.languageFactory = new LanguageFactory(context.em);
    context.courseRepo = context.em.getRepository(Course) as CourseRepo;
});

/**@link CourseController#getCourses*/
describe("GET courses/", function () {
    const makeRequest = async (queryParams: object = {}, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${buildQueryString(queryParams)}`,
        };
        return await fetchRequest(options, authToken);
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
            const language = await context.languageFactory.createOne();
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


/**@link CourseController#createCourse*/
describe("POST courses/", function () {
    const makeRequest = async ({data, files = {}}: {
        data: object; files?: { [key: string]: { value: string | Buffer; fileName: string, mimeType?: string, fallbackType?: "image" | "audio" } | "" }
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "POST",
                url: "courses/",
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        })
    };

    describe("If all fields are valid a new course should be created and return 201", () => {
        test<LocalTestContext>("If optional fields are missing use default values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne()


            const newCourse = context.courseFactory.makeOne({
                description: "",
                isPublic: true,
                lessons: [],
                addedBy: user.profile,
                language: language,
                level: LanguageLevel.ADVANCED_1,
                image: "",
                vocabsByLevel: defaultVocabsByLevel()
            });

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    language: language.code,
                },
                files: {image: ""}
            }, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(courseSerializer.serialize(newCourse)));
        });
        test<LocalTestContext>("If optional fields are provided use provided values", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne()

            const newCourse = context.courseFactory.makeOne({
                addedBy: user.profile,
                language: language,
                lessons: [],
                vocabsByLevel: defaultVocabsByLevel()
            });
            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    description: newCourse.description,
                    language: language.code,
                    isPublic: newCourse.isPublic,
                    level: newCourse.level,
                },
                files: {image: {value: newCourse.image, fallbackType: "image", fileName: "course-image"}}
            }, session.token);

            expect(response.statusCode).to.equal(201);
            expect(response.json()).toEqual(expect.objectContaining(courseSerializer.serialize(newCourse, {hiddenFields: ["image"]})));
            expect(fs.existsSync(response.json().image))
        });
    })

    test<LocalTestContext>("If user not logged in return 401", async (context) => {
        const language = await context.languageFactory.createOne()
        const newCourse = context.courseFactory.makeOne({language: language});

        const response = await makeRequest({
            data: {
                title: newCourse.title,
                language: language.code,
            },
            files: {image: ""}
        });

        expect(response.statusCode).to.equal(401);
    });
    describe("If required fields are missing return 400", async () => {
        test<LocalTestContext>("If title is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne()

            const response = await makeRequest({
                data: {language: language.code},
                files: {image: ""}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });

        test<LocalTestContext>("If language is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});

            const newCourse = context.courseFactory.makeOne();
            const response = await makeRequest({
                data: {title: newCourse.title},
                files: {image: ""}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });

    describe("If fields are invalid return 4xx code", async () => {
        test<LocalTestContext>("If title is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();

            const response = await makeRequest({
                data: {
                    title: faker.random.alpha(300),
                    language: language.code,
                },
                files: {image: ""}
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });

        test<LocalTestContext>("If language is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language})

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    language: faker.random.alphaNumeric(10),
                },
                files: {image: ""}
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });

        test<LocalTestContext>("If language is not found return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language})

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    language: faker.random.alpha(4),
                },
                files: {image: ""}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });


        test<LocalTestContext>("If description is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language})

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    language: language.code,
                    description: faker.random.alpha(600)
                },
                files: {image: ""}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });

        test<LocalTestContext>("If isPublic is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language})

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    language: language.code,
                    isPublic: "kinda?"
                },
                files: {image: ""}
            }, session.token);
            expect(response.statusCode).to.equal(400);
        });


        test<LocalTestContext>("If level is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user});
            const language = await context.languageFactory.createOne();
            const newCourse = context.courseFactory.makeOne({language: language})

            const response = await makeRequest({
                data: {
                    title: newCourse.title,
                    language: language.code,
                    level: "high"
                },
                files: {image: ""}
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });

        describe("If image is invalid return 4xx", () => {
            test<LocalTestContext>("If image is not a jpeg or png return 415", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language})

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        language: language.code,
                    },
                    files: {
                        image: {
                            value: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg",
                            fallbackType: "audio",
                            fileName: "course-image"
                        }
                    }
                }, session.token);
                expect(response.statusCode).to.equal(415);
            });
            test<LocalTestContext>("If image is in the right format but is malformed return 415", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language})

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        language: language.code,
                    },
                    files: {
                        image: {
                            //audio base 64 but with image mimetype
                            value: Buffer.from("UklGRiwAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YQgAAACwNvFldza4ZQ", "base64"),
                            mimeType: "image/png",
                            fileName: "course-image"
                        }
                    }
                }, session.token);
                expect(response.statusCode).to.equal(415);
            });

            test<LocalTestContext>("If the image file is more than 500KB return 413", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language})

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        language: language.code,
                    },
                    files: {
                        image: {
                            value: randomImage(1000, 1000),
                            mimeType: "image/png",
                            fileName: "course-image"
                        }
                    }
                }, session.token);

                expect(response.statusCode).to.equal(413);
            });

            test<LocalTestContext>("If the image is not square return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user: user});
                const language = await context.languageFactory.createOne();
                const newCourse = context.courseFactory.makeOne({language: language})

                const response = await makeRequest({
                    data: {
                        title: newCourse.title,
                        language: language.code,
                    },
                    files: {
                        image: {
                            value: randomImage(256, 128),
                            mimeType: "image/png",
                            fileName: "course-image"
                        }
                    }
                }, session.token);

                expect(response.statusCode).to.equal(400);
            });
        })

    });
});


/**@link CourseController#getCourse*/
describe("GET courses/:courseId", function () {
    const makeRequest = async (courseId: number | string, authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `courses/${courseId}`,
        };
        return await fetchRequest(options, authToken);
    };
    describe("If the course exists and is public return the course", () => {
        test<LocalTestContext>("If the user is not logged in return course and lessons without vocab levels", async (context) => {
            const course = await context.courseFactory.createOne({isPublic: true});

            const response = await makeRequest(course.id);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
        });
        test<LocalTestContext>("If the user is logged in return course and lessons with vocab levels", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user: user})
            const course = await context.courseFactory.createOne({isPublic: true});

            const response = await makeRequest(course.id, session.token);

            await context.courseRepo.annotateVocabsByLevel([course], user.id);
            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(courseSerializer.serialize(course));
        });
    });
    test<LocalTestContext>("If the course does not exist return 404", async (context) => {
        const response = await makeRequest(Number(faker.random.numeric(8)));
        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If course id is invalid return 400", async (context) => {
        const response = await makeRequest(faker.random.alpha(8));
        expect(response.statusCode).to.equal(400);
    });
    test<LocalTestContext>("If the course is not public and the user is not logged in return 404", async (context) => {
        const course = await context.courseFactory.createOne({isPublic: false});

        const response = await makeRequest(course.id);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the course is not public and the user is logged in as a non-author return 404", async (context) => {
        const author = await context.userFactory.createOne();
        const course = await context.courseFactory.createOne({isPublic: false, addedBy: author.profile});
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: otherUser})

        const response = await makeRequest(course.id, session.token);

        expect(response.statusCode).to.equal(404);
    });
    test<LocalTestContext>("If the course is not public and the user is logged in as author return course with vocabs by level", async (context) => {
        const author = await context.userFactory.createOne();
        const course = await context.courseFactory.createOne({isPublic: false, addedBy: author.profile});
        const session = await context.sessionFactory.createOne({user: author})

        const response = await makeRequest(course.id, session.token);

        await context.courseRepo.annotateVocabsByLevel([course], author.id);
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serialize(course));
    });
})

/**@link CourseController#updateCourse*/
describe("PUT courses/:courseId", function () {
    const makeRequest = async (courseId: number | string, {data, files = {}}: {
        data: object; files?: { [key: string]: { value: string | Buffer; fileName: string, mimeType?: string, fallbackType?: "image" | "audio" } | "" }
    }, authToken?: string) => {
        return await fetchWithFiles({
            options: {
                method: "PUT",
                url: `courses/${courseId}`,
                body: {
                    data: data,
                    files: files
                },
            },
            authToken: authToken
        })
    };

    test<LocalTestContext>("If the course exists, user is logged in as author and all fields are valid, update course and return 200", async (context) => {
        const author = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user: author})
        const language = await context.languageFactory.createOne()
        const course = await context.courseFactory.createOne({
            addedBy: author.profile,
            language: language,
            lessons: []
        });
        const courseLessons = await context.lessonFactory.create(10, {course: course});
        const updatedCourse = await context.courseFactory.makeOne({addedBy: author.profile, language: language});

        const response = await makeRequest(course.id, {
            data: {
                title: updatedCourse.title,
                description: updatedCourse.description,
                isPublic: updatedCourse.isPublic,
                level: updatedCourse.level,
                lessonsOrder: shuffleArray(courseLessons).map(l => l.id)
            },
            files: {
                image: {value: randomImage(100, 100, "image/png"), fileName: "course-image", mimeType: "image/png"}
            }
        }, session.token);

        await context.courseRepo.populate(course, ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning", "lessons"])
        await context.courseRepo.annotateVocabsByLevel([course], author.id);
        console.log(response.json())
        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(courseSerializer.serialize(updatedCourse, {hiddenFields: ["lessons"]}));
    })
});