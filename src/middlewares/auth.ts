import {NextFunction, Response} from "express";
import {orm} from "../app.js";
import {User} from "../models/entities/auth/User.js";
import {Express} from "../../types/custom.js";
import Request = Express.CustomRequest;

export default async (req: Request, res: Response, next: NextFunction) => {
    const token = req?.headers?.authorization?.split(" ")[1];

    if (token == undefined) {
        res.status(401).json({details: "Authentication credentials were not provided"});
        return;
    }
    console.log(token);
    const userRepo = orm.em.getRepository(User);
    const user = await userRepo.findOne({session: {token: token}});
    if (user) {
        req.user = user;
        next();
    } else {
        res.status(401).json({details: "Invalid credentials"});
    }
};