const PongGame = require('../models/PongGame');

class MatchmakingService {
  constructor() {
    this.queue = [];
    this.activeGames = new Map();
  }

  //   addToQueue(socket, playerId) {
  //   console.log(`[Matchmaking] request received for ${playerId}`);

  //   // Optional 3s delay (remove if not needed)
  //   // setTimeout(() => {
  //   // avoid duplicates
  //   if (this.queue.some(p => p.playerId === playerId)) {
  //     console.log('already queued');
  //     return;
  //   }

  //   const player = {
  //     socket,
  //     playerId,
  //     joinedAt: Date.now(),
  //     timeoutId: null
  //   };

  //   player.timeoutId = setTimeout(() => {
  //     // double-check still queued
  //     const still = this.queue.find(p => p.playerId === playerId);
  //     if (!still) return;

  //     if (socket && socket.readyState === WebSocket.OPEN) {
  //       socket.send(JSON.stringify('matchmakingTimeout'));
  //     }

  //     // remove and cleanup
  //     this.queue = this.queue.filter(p => p.playerId !== playerId);
  //     console.log(`[Matchmaking] ${playerId} timed out`);
  //   }, 30000);

  //   this.queue.push(player);

  //   // send accurate position
  //   const pos = this.queue.findIndex(p => p.playerId === playerId) + 1;
  //   if (socket && socket.readyState === WebSocket.OPEN) {
  //     socket.send(JSON.stringify({ type: 'queueStatus', data: { status: 'waiting', position: pos } }));
  //   }

  //   // attempt to match
  //   this.tryMatch();
  //   // }, 300);
  // }


  addToQueue(socket, playerId) {
    console.log(`[Matchmaking] Player ${playerId} added to queue`);

    if (this.queue.some(p => p.playerId === playerId)) {
      console.log('already queued');
      return;
    }

    const player = {
      socket,
      playerId,
      joinedAt: Date.now(),
    }

    player.timeoutID = setTimeout(() => {
      const still = this.queue.find(p => p.playerId === playerId);
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

    player1Data.socket.playerId = 'player1';
    player2Data.socket.playerId = 'player2';

    this.activeGames.set(gameId, game);

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