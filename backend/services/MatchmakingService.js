// services/MatchmakingService.js
const PongGame = require('../models/PongGame');

const MATCHMAKING_TIMEOUT = 30000; // 30 seconds
const QUEUE_UPDATE_INTERVAL = 2000; // 2 seconds

class MatchmakingService {
  constructor() {
    this.queue = [];
    this.activeGames = new Map();
    this.queueUpdateInterval = null;
    this.startQueueUpdater();
  }

  startQueueUpdater() {
    this.queueUpdateInterval = setInterval(() => {
      this.broadcastQueueStatus();
    }, QUEUE_UPDATE_INTERVAL);
  }

  addToQueue(socket, connectionId) {
    console.log(`[Matchmaking] Player ${connectionId} joining queue`);

    // Check if already in queue
    if (this.queue.some(p => p.connectionId === connectionId)) {
      console.log(`[Matchmaking] Player ${connectionId} already in queue`);
      return;
    }

    const player = {
      socket,
      connectionId,
      joinedAt: Date.now()
    };

    // Set timeout for matchmaking
    player.timeoutId = setTimeout(() => {
      this.handleMatchmakingTimeout(player);
    }, MATCHMAKING_TIMEOUT);

    this.queue.push(player);
    this.sendQueueStatus(socket, this.getPlayerPosition(connectionId));
    
    // Try to match immediately
    this.tryMatch();
  }

  handleMatchmakingTimeout(player) {
    const stillInQueue = this.queue.find(p => p.connectionId === player.connectionId);
    if (!stillInQueue) return;

    console.log(`[Matchmaking] Timeout for ${player.connectionId}`);
    
    if (player.socket && player.socket.readyState === 1) {
      player.socket.send(JSON.stringify({
        type: 'matchmakingTimeout',
        data: { message: 'No opponent found. Please try again.' }
      }));
    }

    this.removeFromQueue(player.socket);
  }

  tryMatch() {
    if (this.queue.length < 2) return;

    const player1Data = this.queue.shift();
    const player2Data = this.queue.shift();

    // Clear timeouts
    if (player1Data.timeoutId) clearTimeout(player1Data.timeoutId);
    if (player2Data.timeoutId) clearTimeout(player2Data.timeoutId);

    // Validate sockets
    if (player1Data.socket.readyState !== 1 || player2Data.socket.readyState !== 1) {
      console.log('[Matchmaking] One or both players disconnected before match');
      
      // Return valid players to queue
      if (player1Data.socket.readyState === 1) this.addToQueue(player1Data.socket, player1Data.connectionId);
      if (player2Data.socket.readyState === 1) this.addToQueue(player2Data.socket, player2Data.connectionId);
      
      return;
    }

    // Create game
    const gameId = `remote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const game = new PongGame('remote', gameId);

    game.addPlayer(player1Data.socket, 'player1');
    game.addPlayer(player2Data.socket, 'player2');

    this.activeGames.set(gameId, game);

    this.notifyMatchFound(game, player1Data, player2Data);

    console.log(`[Matchmaking] Match created: ${gameId}`);
    console.log(`[Matchmaking] Players: ${player1Data.connectionId} vs ${player2Data.connectionId}`);
  }

  notifyMatchFound(game, player1Data, player2Data) {
    const baseData = {
      gameId: game.gameId,
      initialState: game.getState()
    };

    // Notify player 1
    if (player1Data.socket.readyState === 1) {
      player1Data.socket.send(JSON.stringify({
        type: 'matchFound',
        data: { ...baseData, yourSide: 'player1' }
      }));
    }

    // Notify player 2
    if (player2Data.socket.readyState === 1) {
      player2Data.socket.send(JSON.stringify({
        type: 'matchFound',
        data: { ...baseData, yourSide: 'player2' }
      }));
    }
  }

  removeFromQueue(socket) {
    const index = this.queue.findIndex(p => p.socket === socket);
    if (index !== -1) {
      const player = this.queue[index];
      if (player.timeoutId) clearTimeout(player.timeoutId);
      this.queue.splice(index, 1);
      console.log(`[Matchmaking] Player removed from queue`);
      this.broadcastQueueStatus();
    }
  }

  getGame(gameId) {
    return this.activeGames.get(gameId);
  }

  removeGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (game) {
      game.cleanup();
      this.activeGames.delete(gameId);
      console.log(`[Matchmaking] Game ${gameId} removed`);
    }
  }

  handleDisconnect(socket, gameId = null) {
    // Remove from queue if present
    this.removeFromQueue(socket);

    // Handle game disconnection
    if (gameId) {
      const game = this.activeGames.get(gameId);
      if (game) {
        game.handlePlayerDisconnect(socket);
        this.removeGame(gameId);
      }
      return;
    }

    // Search for game if gameId not provided
    for (const [gId, game] of this.activeGames.entries()) {
      if (game.hasPlayer(socket)) {
        game.handlePlayerDisconnect(socket);
        this.removeGame(gId);
        break;
      }
    }
  }

  sendQueueStatus(socket, position) {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'queueStatus',
        data: {
          position,
          totalInQueue: this.queue.length,
          estimatedWait: this.queue.length > 1 ? 'Finding opponent...' : 'Waiting for players...'
        }
      }));
    }
  }

  broadcastQueueStatus() {
    this.queue.forEach((player, index) => {
      this.sendQueueStatus(player.socket, index + 1);
    });
  }

  getPlayerPosition(connectionId) {
    return this.queue.findIndex(p => p.connectionId === connectionId) + 1;
  }

  getQueueSize() {
    return this.queue.length;
  }

  getActiveGamesCount() {
    return this.activeGames.size;
  }

  cleanup() {
    console.log('[Matchmaking] Cleaning up service...');
    
    // Clear all timeouts
    this.queue.forEach(player => {
      if (player.timeoutId) clearTimeout(player.timeoutId);
    });
    
    this.queue = [];
    
    // Cleanup all games
    this.activeGames.forEach(game => game.cleanup());
    this.activeGames.clear();
    
    if (this.queueUpdateInterval) {
      clearInterval(this.queueUpdateInterval);
    }
  }
}

const matchmakingService = new MatchmakingService();

module.exports = matchmakingService;