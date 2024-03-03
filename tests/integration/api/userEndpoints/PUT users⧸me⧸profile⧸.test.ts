import {describe, expect, test, TestContext} from "vitest";
import {fetchRequest} from "@/tests/integration/utils.js";
import {profileSerializer} from "@/src/presentation/response/serializers/entities/ProfileSerializer.js";
import {ProfileSchema} from "dzelda-common";
import {faker} from "@faker-js/faker";

/**{@link UserController#updateUserProfile}*/
describe("PUT users/me/profile/", function () {
    const makeRequest = async (body: object, authToken?: string) => {
        return await fetchRequest({
            method: "PUT",
            url: `users/me/profile/`,
            body: body,
        }, authToken);
    };

    describe("If user is logged in and all fields are valid update user profile, return 200", async (context) => {
        test<TestContext>("If new profile picture is not provided, keep old profile picture", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const updatedProfile = context.profileFactory.makeOne();

            const response = await makeRequest({
                bio: updatedProfile.bio
            }, session.token);
            await context.em.refresh(user.profile);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(profileSerializer.serialize(user.profile));
            const updatedFields: (keyof ProfileSchema)[] = ["bio"];
            expect(profileSerializer.serialize(user.profile, {include: updatedFields})).toEqual(profileSerializer.serialize(updatedProfile, {include: updatedFields}));
        });
        test<TestContext>("If new profile picture is blank clear profile picture", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const updatedProfile = context.profileFactory.makeOne({profilePicture: ""});

            const response = await makeRequest({
                bio: updatedProfile.bio,
                profilePicture: ""
            }, session.token);
            await context.em.refresh(user.profile);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(profileSerializer.serialize(user.profile));
            const updatedFields: (keyof ProfileSchema)[] = ["profilePicture", "bio"];
            expect(profileSerializer.serialize(user.profile, {include: updatedFields})).toEqual(profileSerializer.serialize(updatedProfile, {include: updatedFields}));
        });
        test<TestContext>("If new profile picture is provided, update profile picture", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});
            const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "profilePicture"});
            const updatedProfile = context.profileFactory.makeOne({profilePicture: fileUploadRequest.fileUrl});

            const response = await makeRequest({
                bio: updatedProfile.bio,
                profilePicture: fileUploadRequest.objectKey
            }, session.token);
            await context.em.refresh(user.profile);

            expect(response.statusCode).to.equal(200);
            expect(response.json()).toEqual(profileSerializer.serialize(user.profile));
            const updatedFields: (keyof ProfileSchema)[] = ["profilePicture", "bio"];
            expect(profileSerializer.serialize(user.profile, {include: updatedFields})).toEqual(profileSerializer.serialize(updatedProfile, {include: updatedFields}));
        });
    });
    describe("If required fields are missing return 400", async (context) => {
        test<TestContext>("If bio is missing return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({}, session.token);

            expect(response.statusCode).to.equal(400);
        });
    });
    describe("If fields are invalid do not update profile, return 4XX", async (context) => {
        test<TestContext>("If bio is invalid return 400", async (context) => {
            const user = await context.userFactory.createOne();
            const session = await context.sessionFactory.createOne({user});

            const response = await makeRequest({
                bio: faker.random.alpha(300)
            }, session.token);

            expect(response.statusCode).to.equal(400);
        });
        describe("If profile picture is invalid return 400", async (context) => {
            test<TestContext>("If file upload request with key does not exist return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const fileUploadRequest = await context.fileUploadRequestFactory.makeOne({user: user, fileField: "profilePicture"});
                const updatedProfile = context.profileFactory.makeOne({profilePicture: fileUploadRequest.fileUrl});

                const response = await makeRequest({
                    bio: updatedProfile.bio,
                    profilePicture: fileUploadRequest.objectKey
                }, session.token);
                await context.em.refresh(user.profile);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key was not requested by user return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const otherUser = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: otherUser, fileField: "profilePicture"});
                const updatedProfile = context.profileFactory.makeOne({profilePicture: fileUploadRequest.fileUrl});

                const response = await makeRequest({
                    bio: updatedProfile.bio,
                    profilePicture: fileUploadRequest.objectKey
                }, session.token);
                await context.em.refresh(user.profile);

                expect(response.statusCode).to.equal(400);
            });
            test<TestContext>("If file upload request with key is not for profilePicture field return 400", async (context) => {
                const user = await context.userFactory.createOne();
                const session = await context.sessionFactory.createOne({user});
                const fileUploadRequest = await context.fileUploadRequestFactory.createOne({user: user, fileField: "collectionImage"});
                const updatedProfile = context.profileFactory.makeOne({profilePicture: fileUploadRequest.fileUrl});

                const response = await makeRequest({
                    bio: updatedProfile.bio,
                    profilePicture: fileUploadRequest.objectKey
                }, session.token);
                await context.em.refresh(user.profile);

                expect(response.statusCode).to.equal(400);
            });
        });
    });
    test<TestContext>("If user is not logged in return 401", async (context) => {
        const updatedProfile = context.profileFactory.makeOne();

        const response = await makeRequest({
            bio: updatedProfile.bio
        });

        expect(response.statusCode).to.equal(401);
    });
    test<TestContext>("If user email is not confirmed return 403", async (context) => {
        const user = await context.userFactory.createOne({isEmailConfirmed: false});
        const session = await context.sessionFactory.createOne({user});
        const updatedProfile = context.profileFactory.makeOne();

        const response = await makeRequest({
            bio: updatedProfile.bio
        }, session.token);

        expect(response.statusCode).to.equal(403);
    });
});
