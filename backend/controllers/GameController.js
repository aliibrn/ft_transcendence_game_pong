// controllers/GameController.js

const WebSocketHandler = require('../handlers/WebSocketHandler');
const matchmakingService = require('../services/MatchmakingService');

let connectionCounter = 0;
const activeConnections = new Map();

function handleNewConnection(socket, req) {
  const connectionId = `conn_${++connectionCounter}_${Date.now()}`;
  
  try {
    const handler = new WebSocketHandler(socket, connectionId);
    activeConnections.set(connectionId, handler);

    logStats('New connection', connectionId);

    socket.on('close', () => {
      handleDisconnection(connectionId, handler);
    });

    socket.on('error', (err) => {
      console.error(`[Controller] Socket error for ${connectionId}:`, err.message);
      handleDisconnection(connectionId, handler);
    });
  } catch (err) {
    console.error(`[Controller] Error creating handler for ${connectionId}:`, err);
    socket.close();
  }
}

function handleDisconnection(connectionId, handler) {
  try {
    if (handler && typeof handler.cleanup === 'function') {
      handler.cleanup();
    }
    activeConnections.delete(connectionId);
    logStats('Connection closed', connectionId);
  } catch (err) {
    console.error(`[Controller] Error during disconnection cleanup:`, err);
  }
}

function logStats(event, connectionId) {
  console.log(`[Controller] ${event}: ${connectionId}`);
  console.log(`[Controller] Active connections: ${activeConnections.size}`);
  console.log(`[Controller] Queue size: ${matchmakingService.getQueueSize()}`);
  console.log(`[Controller] Active games: ${matchmakingService.getActiveGamesCount()}`);
}

function getStats() {
  return {
    activeConnections: activeConnections.size,
    queueSize: matchmakingService.getQueueSize(),
    activeGames: matchmakingService.getActiveGamesCount()
  };
}

async function cleanupAll() {
  console.log('[Controller] Cleaning up all connections...');
  
  for (const [connectionId, handler] of activeConnections.entries()) {
    try {
      if (handler && typeof handler.cleanup === 'function') {
        handler.cleanup();
      }
    } catch (err) {
      console.error(`[Controller] Error cleaning up ${connectionId}:`, err);
    }
  }
  
  activeConnections.clear();
  matchmakingService.cleanup();
}

module.exports = {
  handleNewConnection,
  getStats,
  cleanupAll,
  activeConnections
};