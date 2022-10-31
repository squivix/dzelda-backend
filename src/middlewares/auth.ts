import {orm} from "../app.js";
import {User} from "../models/entities/auth/User.js";

// export default async (req: Request, res: Response, next: NextFunction) => {
//     const tokenArray = req?.get("authorization")?.split(" ");
//
//     if (!tokenArray || tokenArray.length !== 2 || tokenArray[0] !== "Token" || !tokenArray[1]) {
//         res.status(401).json({details: "Authentication credentials were not provided"});
//         return;
//     }
//     const token = tokenArray[1];
//     const userRepo = orm.em.getRepository(User);
//     const user = await userRepo.findOne({session: {token: token}});
//     if (user) {
//         req.user = user;
//         next();
//     } else {
//         res.status(401).json({details: "Invalid credentials"});
//     }
// };