const WebSocketHandler = require('../handlers/WebSocketHandler');
const matchmakingService = require('../services/MatchmakingService');

let connectionCounter = 0;
const activeConnections = new Map();

function handleNewConnection(socket) {
  const connectionId = `conn_${++connectionCounter}_${Date.now()}`;
  
  const handler = new WebSocketHandler(socket, connectionId);
  activeConnections.set(connectionId, handler);

  console.log(`[Controller] New connection: ${connectionId}`);
  console.log(`[Controller] Active connections: ${activeConnections.size}`);
  console.log(`[Controller] Queue size: ${matchmakingService.getQueueSize()}`);
  console.log(`[Controller] Active games: ${matchmakingService.getActiveGamesCount()}`);

  socket.on('close', () => {
    activeConnections.delete(connectionId);
    console.log(`[Controller] Connection closed: ${connectionId}`);
    console.log(`[Controller] Remaining connections: ${activeConnections.size}`);
  });
}

function getStats() {
  return {
    activeConnections: activeConnections.size,
    queueSize: matchmakingService.getQueueSize(),
    activeGames: matchmakingService.getActiveGamesCount()
  };
}

module.exports = {
  handleNewConnection,
  getStats,
  activeConnections
};