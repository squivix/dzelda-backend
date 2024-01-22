import {z} from "zod";


export const bioValidator = z.string().max(255, "Bio must be no longer than 255 characters");
