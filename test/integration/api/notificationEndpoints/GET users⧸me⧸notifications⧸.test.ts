import {describe, expect, test, TestContext, vi} from "vitest";
import {InjectOptions} from "light-my-request";
import {createComparator, fetchRequest} from "@/test/integration/integrationTestUtils.js";
import {Notification} from "@/src/models/entities/Notification.js";
import * as checkPendingJobsModule from "@/src/utils/pending-jobs/checkPendingJobs.js";
import {PendingJob} from "@/src/models/entities/PendingJob.js";
import {faker} from "@faker-js/faker";
import {notificationSerializer} from "@/src/presentation/response/serializers/Notification/NotificationSerializer.js";

/**{@link UserController#getUserNotifications}*/
describe("GET users/me/notifications/", function () {
    const makeRequest = async (authToken?: string) => {
        const options: InjectOptions = {
            method: "GET",
            url: `users/me/notifications/`
        };
        return await fetchRequest(options, authToken);
    };

    const defaultSortComparator = createComparator(Notification, [
        {property: "createdDate", order: "desc"},
        {property: "id", order: "asc"}
    ]);
    test<TestContext>("If user is logged in return all their notifications", async (context) => {
        const user = await context.userFactory.createOne();
        const otherUser = await context.userFactory.createOne();
        const session = await context.sessionFactory.createOne({user});
        const expectedNotifications = await context.notificationFactory.create(2, {recipient: user.profile});
        await context.notificationFactory.createOne({recipient: otherUser.profile});
        expectedNotifications.sort(defaultSortComparator);
        const checkPendingJobsSpy = vi.spyOn(checkPendingJobsModule, "checkPendingJobs");

        const response = await makeRequest(session.token);

        expect(response.statusCode).to.equal(200);
        expect(response.json()).toEqual(notificationSerializer.serializeList(expectedNotifications));
        expect(checkPendingJobsSpy).toHaveBeenCalledOnce();
    });
    describe("test pending jobs check", function () {
        describe("test bulk-import-collection job", function () {
            test<TestContext>("If bulk-import-collection job is incomplete do nothing", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});
                const pendingJob = await context.pendingJobFactory.createOne({
                    jobType: "bulk-import-collection",
                    initiator: user.profile,
                    jobParams: {collectionId: collection.id}
                });
                await context.textFactory.create(2, {language, collection, isProcessing: true});

                const response = await makeRequest(session.token);
                context.em.clear();

                expect(response.statusCode).to.equal(200);
                expect(await context.em.findOne(PendingJob, {id: pendingJob.id})).not.toBeNull();
            });
            test<TestContext>("If bulk-import-collection job is completed, create notifications and delete job", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const language = await context.languageFactory.createOne();
                const collection = await context.collectionFactory.createOne({language, addedBy: user.profile});
                const pendingJob = await context.pendingJobFactory.createOne({
                    jobType: "bulk-import-collection",
                    initiator: user.profile,
                    jobParams: {collectionId: collection.id}
                });
                await context.textFactory.create(2, {language, collection, isProcessing: false});

                const response = await makeRequest(session.token);
                context.em.clear();

                const dbNotifications = await context.em.find(Notification, {recipient: user.profile,});
                expect(response.statusCode).to.equal(200);
                expect(response.json()).toEqual(notificationSerializer.serializeList(dbNotifications));
                expect(notificationSerializer.serializeList(dbNotifications)).toEqual(expect.arrayContaining([expect.objectContaining({
                    text: `Collection "${collection.title}" finished importing`,
                })]));
                expect(await context.em.findOne(PendingJob, {id: pendingJob.id})).toBeNull();
            });
            test<TestContext>("If collection is not found delete job", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const pendingJob = await context.pendingJobFactory.createOne({
                    jobType: "bulk-import-collection",
                    initiator: user.profile,
                    jobParams: {collectionId: faker.datatype.number({min: 100000})}
                });

                const response = await makeRequest(session.token);
                context.em.clear();

                expect(response.statusCode).to.equal(200);
                expect(await context.em.findOne(PendingJob, {id: pendingJob.id})).toBeNull();
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async () => {
        const response = await makeRequest();
        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});

        const response = await makeRequest(session.token);
        expect(response.statusCode).to.equal(403);
    });
});