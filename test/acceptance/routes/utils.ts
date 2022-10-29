import request from "supertest";
import {app} from "../../../src/app.js";

let cachedServer: request.SuperTest<request.Test>;

export function getServer() {
    if (!cachedServer)
        cachedServer = request(app);
    return cachedServer;
}

