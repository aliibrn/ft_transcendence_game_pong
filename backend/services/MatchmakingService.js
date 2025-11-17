// services/MatchmakingService.js
const PongGame = require('../models/PongGame');

class MatchmakingService {
  constructor() {
    this.queue = [];
    this.activeGames = new Map();
    
    // Periodic cleanup to remove disconnected sockets that didn't trigger close properly
    setInterval(() => this.cleanupStalePlayers(), 10000);
  }

  addToQueue(socket, connectionId) {
    // Prevent duplicates
    if (this.queue.some(p => p.connectionId === connectionId)) return;

    console.log(`[Matchmaking] Player ${connectionId} joined queue`);

    const player = {
      socket,
      connectionId,
      joinedAt: Date.now(),
      isMatched: false
    };

    this.queue.push(player);
    this.broadcastQueueStatus();
    this.tryMatch();
  }

  removeFromQueue(socket) {
    const index = this.queue.findIndex(p => p.socket === socket);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`[Matchmaking] Player removed from queue`);
      this.broadcastQueueStatus();
    }
  }

  tryMatch() {
    // Need at least 2 players who aren't currently being matched
    const availablePlayers = this.queue.filter(p => !p.isMatched);
    
    if (availablePlayers.length < 2) return;

    // Get first two available
    const p1 = availablePlayers[0];
    const p2 = availablePlayers[1];

    // Mark them as matched immediately to prevent double-booking
    p1.isMatched = true;
    p2.isMatched = true;

    // Verify sockets are still open
    if (p1.socket.readyState !== 1 || p2.socket.readyState !== 1) {
      this.cleanupStalePlayers(); // Clean and retry next tick
      return;
    }

    // Remove from queue proper
    this.queue = this.queue.filter(p => p !== p1 && p !== p2);

    this.createGame(p1, p2);
  }

  createGame(player1Data, player2Data) {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const game = new PongGame('remote', gameId);

    console.log(`[Matchmaking] Starting Match: ${gameId}`);

    // Add players to game logic
    game.addPlayer(player1Data.socket, 'player1');
    game.addPlayer(player2Data.socket, 'player2');

    this.activeGames.set(gameId, game);

    // Notify players
    this.notifyMatchStart(player1Data.socket, game, 'player1');
    this.notifyMatchStart(player2Data.socket, game, 'player2');
  }

  notifyMatchStart(socket, game, side) {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'matchFound',
        data: {
          gameId: game.gameId,
          yourSide: side,
          initialState: game.getState()
        }
      }));
    }
  }

  getGame(gameId) {
    return this.activeGames.get(gameId);
  }

  handleDisconnect(socket, gameId) {
    this.removeFromQueue(socket);

    if (gameId && this.activeGames.has(gameId)) {
      const game = this.activeGames.get(gameId);
      game.handlePlayerDisconnect(socket);
      
      // Delay removing the game slightly to ensure 'opponentDisconnected' message goes out
      setTimeout(() => {
        if (this.activeGames.has(gameId)) {
            this.activeGames.get(gameId).cleanup();
            this.activeGames.delete(gameId);
        }
      }, 1000);
    }
  }

  cleanupStalePlayers() {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(p => p.socket.readyState === 1);
    if (this.queue.length !== initialLength) {
      this.broadcastQueueStatus();
    }
  }

  broadcastQueueStatus() {
    this.queue.forEach((p, i) => {
      if (p.socket.readyState === 1) {
        p.socket.send(JSON.stringify({
          type: 'queueStatus',
          data: { position: i + 1, total: this.queue.length }
        }));
      }
    });
  }

  getQueueSize() { return this.queue.length; }
  getActiveGamesCount() { return this.activeGames.size; }

  cleanup() {
    this.activeGames.forEach(game => game.cleanup());
    this.activeGames.clear();
    this.queue = [];
  }
}

module.exports = new MatchmakingService();