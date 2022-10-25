import {User} from "../src/models/entities/auth/User.js";
import {Request} from 'express';


declare namespace Express {
    export interface CustomRequest extends Request {
        user?: User;
    }
}