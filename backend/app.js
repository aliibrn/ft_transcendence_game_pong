
'use strict'

const fastify = require('fastify')();
const PongGame = require('./game');

fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/static'), {
  root: require('path').join(__dirname, 'public'),
  prefix: '/'
});

// Game instances per connection
const games = new Map();

// Game loop interval (60 FPS)
const TICK_RATE = 1000 / 60;

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('✅ Client connected');
    
    // Create a new game instance for this client
    const gameId = Date.now().toString();
    const game = new PongGame();
    games.set(gameId, { game, socket });
    
    // Send initial game state
    socket.send(JSON.stringify({
      type: 'init',
      data: game.getState()
    }));
    
    // Store player input
    let currentInput = null;
    
    // Start game loop for this client
    const gameLoop = setInterval(() => {
      const gameState = game.update(currentInput);
      
      // Send updated state to client
      socket.send(JSON.stringify({
        type: 'update',
        data: gameState
      }));
      
      // Reset input after processing
      currentInput = null;
    }, TICK_RATE);
    
    // Handle messages from client
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received message from client:", data);
        
        if (data.type === 'input') {
          // Store player input for next update
          currentInput = data.direction; // 'left' or 'right'
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    });
    
    // Handle disconnection
    socket.on('close', () => {
      console.log('🔌 Client disconnected');
      clearInterval(gameLoop);
      games.delete(gameId);
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      clearInterval(gameLoop);
      games.delete(gameId);
    });
  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('🚀 Server running on http://localhost:3000');
});