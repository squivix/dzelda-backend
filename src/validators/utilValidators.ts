import {z} from "zod";

export const booleanStringValidator = z.preprocess((v) => String(v).toLowerCase(), z.literal("true").or(z.literal("false"))).transform(v => v === "true");