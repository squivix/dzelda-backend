import {describe, expect, test} from "vitest";
import {getServer} from "../utils.js";
import {API_ROOT, orm} from "../../../../src/app.js";
import {User} from "../../../../src/models/entities/auth/User.js";

describe("POST /users", function () {
    test("A new user should be registered if all fields are valid", async () => {
        const newUser = {
            username: "johndoe",
            email: "johndoe@email.com",
            password: "johndoe123"
        };
        const response = await getServer()
            .post(`${API_ROOT}/users/`)
            .send(newUser);

        expect(response.status).to.equal(201);
        expect(response.body).toEqual({
            username: "johndoe",
            email: "johndoe@email.com",
        });
        const userRepo = orm.em.getRepository(User);
        expect(userRepo.findOne({username: newUser.username})).not.toBeNull();
    });
});