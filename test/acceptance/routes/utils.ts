import {API_ROOT, app} from "../../../src/app.js";
import {InjectOptions} from "light-my-request";

export async function fetchRequest(options: InjectOptions) {
    return await app.inject({
        ...options,
        url: `${API_ROOT}/${options.url}`
    });
}