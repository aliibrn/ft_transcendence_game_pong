// handlers/WebSocketHandler.js

const PongGame = require('../models/PongGame');
const matchmakingService = require('../services/MatchmakingService');

class WebSocketHandler {
  constructor(socket, connectionId) {
    this.socket = socket;
    this.connectionId = connectionId;
    this.game = null;
    this.gameId = null;
    this.mode = null;
    this.playerId = null;

    this.initialize();
  }

  initialize() {
    this.socket.on('message', (msg) => this.handleMessage(msg));
    this.socket.on('close', () => this.handleClose());
    this.socket.on('error', (err) => this.handleError(err));

    this.send('connected', {
      connectionId: this.connectionId,
      timestamp: Date.now()
    });
  }

  handleMessage(message) {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[${this.connectionId}] Received:`, data.type);

      switch (data.type) {
        case 'selectMode':
          this.handleModeSelection(data.mode);
          break;

        case 'ready':
          this.handleReady();
          break;

        case 'readyRemote':
          this.handleReadyRemote(data.data);
          break;

        case 'input':
          this.handleInput(data);
          break;

        case 'leaveQueue':
          this.handleLeaveQueue();
          break;

        case 'restartGame':
          this.handleRestartGame();
          break;

        case 'ping':
          this.send('pong', { timestamp: Date.now() });
          break;

        default:
          console.warn(`[${this.connectionId}] Unknown message type:`, data.type);
      }
    } catch (err) {
      console.error(`[${this.connectionId}] Message error:`, err);
      this.send('error', { message: 'Invalid message format' });
    }
  }

  handleModeSelection(mode) {
    if (!['local', 'remote', 'solo'].includes(mode)) {
      this.send('error', { message: 'Invalid game mode' });
      return;
    }

    this.mode = mode;
    console.log(`[${this.connectionId}] Mode selected: ${mode}`);

    if (mode === 'remote') {
      matchmakingService.addToQueue(this.socket, this.connectionId);
    } else {
      this.createLocalGame(mode);
    }
  }

  createLocalGame(mode) {
    this.gameId = `${mode}_${this.connectionId}_${Date.now()}`;
    this.game = new PongGame(mode, this.gameId);
    this.playerId = 'player1';
    this.game.addPlayer(this.socket, 'player1');

    this.send('gameCreated', {
      gameId: this.gameId,
      mode: mode,
      playerId: this.playerId,
      initialState: this.game.getState()
    });
  }

  handleReadyRemote(data) {
    if (!data || !data.gameId || !data.playerId) {
      console.warn(`[${this.connectionId}] Invalid ready data`);
      return;
    }

    this.game = matchmakingService.getGame(data.gameId);
    this.gameId = data.gameId;
    this.playerId = data.playerId;

    if (!this.game) {
      console.warn(`[${this.connectionId}] Game ${data.gameId} not found`);
      this.send('error', { message: 'Game not found' });
      return;
    }

    this.game.markPlayerReady(this.socket);
    this.send('gameStarting', { 
      message: 'Starting in 2 seconds...',
      countdown: 2 
    });
  }

  handleReady() {
    if (!this.game) {
      console.warn(`[${this.connectionId}] No game to mark ready`);
      return;
    }

    this.game.markPlayerReady(this.socket);
    this.send('gameStarting', { 
      message: 'Starting in 2 seconds...',
      countdown: 2 
    });
  }

  handleInput(data) {
    if (!data || !data.playerId || !data.direction) {
      return;
    }

    if (!['left', 'right'].includes(data.direction)) {
      return;
    }

    // Validate player ID matches
    if (this.mode === 'remote' && data.playerId !== this.playerId) {
      return;
    }

    if (this.game) {
      this.game.handleInput(data.playerId, data.direction);
    }
  }

  handleLeaveQueue() {
    if (this.mode === 'remote') {
      matchmakingService.removeFromQueue(this.socket);
      this.send('leftQueue', { message: 'You left the matchmaking queue' });
      this.mode = null;
    }
  }

  handleRestartGame() {
    if (this.mode === 'remote') {
      this.send('error', { message: 'Cannot restart online games. Return to menu.' });
      return;
    }

    if (this.game) {
      this.game.cleanup();
      this.game = null;
    }

    this.createLocalGame(this.mode);
  }

  send(type, data) {
    if (this.socket.readyState === 1) {
      try {
        this.socket.send(JSON.stringify({ type, data }));
      } catch (err) {
        console.error(`[${this.connectionId}] Error sending message:`, err);
      }
    }
  }

  handleClose() {
    console.log(`[${this.connectionId}] Client disconnected`);
    this.cleanup();
  }

  handleError(err) {
    console.error(`[${this.connectionId}] Socket error:`, err);
    this.cleanup();
  }

  cleanup() {
    if (this.mode === 'remote') {
      matchmakingService.handleDisconnect(this.socket, this.gameId);
    } else if (this.game) {
      this.game.cleanup();
    }

    this.game = null;
    this.gameId = null;
    this.playerId = null;
    this.mode = null;
  }
}

module.exports = WebSocketHandler;