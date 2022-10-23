// import express from 'express';
import express from "express";
import {MikroORM} from "@mikro-orm/core";
import options from "./mikro-orm.config.js";

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});


(async () => {
    // MikroORM
    const orm = await MikroORM.init(options);
    app.listen(port, () => {
        console.log(`Example app listening on port http://localhost:${port}`);
    });
})();