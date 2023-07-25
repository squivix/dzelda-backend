import {server} from "@/src/server.js";

const port = Number(process.env.PORT);

// Run the server!
server.listen({port, host: "0.0.0.0"}, function (err, address) {
    if (err)
        throw err;
    console.log(`Dzelda listening on port ${port}`);
});
