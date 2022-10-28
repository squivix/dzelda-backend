import {User} from "../../src/models/entities/auth/User.js";


declare global {
    namespace Express {
        export interface Request {
            user?: User;
        }
    }
}