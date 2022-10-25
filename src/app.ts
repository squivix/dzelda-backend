// import express from 'express';
import express, {json} from "express";
import {MikroORM, RequestContext} from "@mikro-orm/core";
import options from "./mikro-orm.config.js";
import MikroORMRequestContext from "./middlewares/MikroORMRequestContext.js";
import {router} from "./router.js";

const app = express();
const port = process.env.PORT || 3000;

// MikroORM
export const orm = await MikroORM.init(options);

//Middleware
app.use(MikroORMRequestContext);
app.use(json());
app.use(router);

app.listen(port, () => {
    console.log(`Dzelda listening on port http://localhost:${port}`);
});

