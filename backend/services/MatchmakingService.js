const PongGame = require('../models/PongGame');

class MatchmakingService {
  constructor() {
    this.queue = [];
    this.activeGames = new Map();
  }

  addToQueue(socket, connectionId) {
    console.log(`[Matchmaking] Player ${connectionId} added to queue`);

    if (this.queue.some(p => p.connectionId === connectionId)) {
      console.log('already queued');
      return;
    }

    const player = {
      socket,
      connectionId,
      joinedAt: Date.now(),
    }

    player.timeoutID = setTimeout(() => {
      const still = this.queue.find(p => p.playerId === connectionId);
      if (!still) return;

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'matchmakingTimeout',
          data: {
            status: 'waiting',
            position: this.queue.length
          }
        }))
      }
    }, 30000);

    this.queue.push(player);
    socket.send(JSON.stringify({
      type: 'queueStatus',
      data: {
        status: 'waiting',
        position: this.queue.length
      }
    }));
    this.tryMatch();
  }

  tryMatch() {
    if (this.queue.length < 2) {
      return;
    }

    const player1Data = this.queue.shift();
    const player2Data = this.queue.shift();

    clearTimeout(player1Data.timeoutID);
    clearTimeout(player2Data.timeoutID);

    const gameId = `remote_${Date.now()}`;
    const game = new PongGame('remote', gameId);

    game.addPlayer(player1Data.socket);
    game.addPlayer(player2Data.socket);

    game.player1.socket = player1Data.socket;
    game.player2.socket = player2Data.socket;

    this.activeGames.set(gameId, game);

    this.notifyMatchFound(game);

    console.log(`[Matchmaking] Match created: ${gameId}`);
  }

  notifyMatchFound(game) {
    const matchData = {
      gameId: game.gameId,
      yourSide: 'player1',
      initialState: game.getState()
    };

    game.player1.socket.send(JSON.stringify({
      type: 'matchFound',
      data: { ...matchData, yourSide: game.player1.id }
    }));

    game.player2.socket.send(JSON.stringify({
      type: 'matchFound',
      data: { ...matchData, yourSide: game.player1.id }
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
    this.removeFromQueue(socket);

    for (const [gameId, game] of this.activeGames.entries()) {
      if (game.players.includes(socket)) {
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

const matchmakingService = new MatchmakingService();

module.exports = matchmakingService;