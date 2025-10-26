const fastify = require('fastify')();
const websocket = require('@fastify/websocket');

async function startServer() {
  await fastify.register(websocket);

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('WebSocket connection established!');

    connection.socket.on('message', message => {
      console.log(`Received message: ${message}`);
      connection.socket.send(`Echo: ${message}`); 
    });

    connection.socket.on('close', () => {
      console.log('WebSocket connection closed.');
    });

    connection.socket.on('error', error => {
      console.error('WebSocket error:', error);
    });
  });

  fastify.listen({ port: 8080}, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening on ${address}`);
  });
}

startServer();