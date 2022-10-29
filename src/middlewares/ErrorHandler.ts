import {NextFunction, Request, Response} from "express";
import {ZodError} from "zod";

export default (error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ZodError) {
        res.status(400).json((error as ZodError));
        return;
    } else
        throw error;
}