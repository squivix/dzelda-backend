// import express from 'express';
import express, {json} from "express";
import {MikroORM, RequestContext} from "@mikro-orm/core";
import options from "./mikro-orm.config.js";
import MikroORMRequestContext from "./middlewares/MikroORMRequestContext.js";
import {router} from "./router.js";
import morgan from "morgan";

const app = express();
const port = process.env.PORT || 3000;

// MikroORM
export const orm = await MikroORM.init(options);

//Middleware
app.use(morgan("tiny"));
app.use(json());
app.use(MikroORMRequestContext);
app.use(router);

app.listen(port, () => {
    console.log(`Dzelda listening on port http://localhost:${port}`);
});

