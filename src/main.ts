import {server} from "@/src/server.js";

const port = Number(process.env.PORT) ?? 3000;

// Run the server!
await server.listen({port}, function (err, address) {
    if (err)
        throw err;
    console.log(`Dzelda listening on port http://localhost:${port}`);
});