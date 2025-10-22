import Fastify from "fastify"
import { game } from "./game.ts";


const fastify = Fastify();

fastify.get("/", async (req, res) => {
    return {message: "hello to /"}
})

game()

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log("Server running at http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();