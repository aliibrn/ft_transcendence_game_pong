// services/MatchmakingService.js
const PongGame = require('../models/PongGame');

class MatchmakingService {
  constructor() {
    this.queue = []; // Players waiting for a match
    this.activeGames = new Map(); // gameId -> PongGame
  }

  addToQueue(socket, playerId) {
    console.log(`[Matchmaking] Player ${playerId} added to queue`);
    
    this.queue.push({
      socket,
      playerId,
      joinedAt: Date.now()
    });

    // Notify player they're in queue
    socket.send(JSON.stringify({
      type: 'queueStatus',
      data: { 
        status: 'waiting',
        position: this.queue.length 
      }
    }));

    // Try to match
    this.tryMatch();
  }

  tryMatch() {
    // Need at least 2 players
    if (this.queue.length < 2) {
      return;
    }

    // Take first two players
    const player1Data = this.queue.shift();
    const player2Data = this.queue.shift();

    // Create game
    const gameId = `remote_${Date.now()}`;
    const game = new PongGame('remote', gameId);

    // Add players to game
    game.addPlayer(player1Data.socket);
    game.addPlayer(player2Data.socket);

    // Assign player sides
    player1Data.socket.playerId = 'player1';
    player2Data.socket.playerId = 'player2';

    // Store game
    this.activeGames.set(gameId, game);

    // Notify both players
    this.notifyMatchFound(player1Data.socket, player2Data.socket, gameId, game);

    console.log(`[Matchmaking] Match created: ${gameId}`);
  }

  notifyMatchFound(socket1, socket2, gameId, game) {
    const matchData = {
      gameId,
      yourSide: 'player1',
      initialState: game.getState()
    };

    socket1.send(JSON.stringify({
      type: 'matchFound',
      data: { ...matchData, yourSide: 'player1' }
    }));

    socket2.send(JSON.stringify({
      type: 'matchFound',
      data: { ...matchData, yourSide: 'player2' }
    }));
  }

  removeFromQueue(socket) {
    const index = this.queue.findIndex(p => p.socket === socket);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`[Matchmaking] Player removed from queue`);
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

  handleDisconnect(socket) {
    // Remove from queue if waiting
    this.removeFromQueue(socket);

    // Find and end any active games
    for (const [gameId, game] of this.activeGames.entries()) {
      if (game.players.includes(socket)) {
        // Notify other player
        game.players.forEach(playerSocket => {
          if (playerSocket !== socket && playerSocket.readyState === 1) {
            playerSocket.send(JSON.stringify({
              type: 'opponentDisconnected',
              data: { message: 'Your opponent has disconnected' }
            }));
          }
        });
        
        this.removeGame(gameId);
        break;
      }
    }
  }

  getQueueSize() {
    return this.queue.length;
  }

  getActiveGamesCount() {
    return this.activeGames.size;
  }
}

// Singleton instance
const matchmakingService = new MatchmakingService();

module.exports = matchmakingService;