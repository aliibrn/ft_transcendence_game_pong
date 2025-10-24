const fastify = require("fastify")({logger: true});
const updateGameState = require("./gameModule");

fastify.get("/", async (req: any, reply: any) => {
  return {message: "hello "};
})

fastify.post("/input", async (req: any, reply: any) => {
  const input = req.body; // { left: true, right: false }
  updateGameState(input);
  return { status: "ok" };
});

fastify.listen({port: 3000})