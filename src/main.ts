import {server} from "./server.js";

const port = Number(process.env.PORT) ?? 3000;

// Run the server!
await server.listen({port}, function (err, address) {
    if (err) {
        throw err;
        // server.log.error(err);
        // process.exit(1);
    }
    console.log(`Dzelda listening on port http://localhost:${port}`);
});
