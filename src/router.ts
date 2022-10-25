import express from "express";
import auth from "./middlewares/auth.js";

export const router = express.Router();
router.get("/", auth, (req, res) => {
    res.send("Hello World!");
});

