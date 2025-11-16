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

        case 'input':
          this.handleInput(data);
          break;

        case 'leaveQueue':
          this.handleLeaveQueue();
          break;

        case 'restartGame':
          this.handleRestartGame();
          break;
          
        case 'readyRemote':
          this.handleReadyRemote(data.data);
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
    
    // if mode === AI or solo we need to have the diffucalty 

    console.log(`[${this.connectionId}] Mode selected: ${mode}`);

    if (mode === 'remote') {
      matchmakingService.addToQueue(this.socket, this.connectionId);
    } else {
      this.gameId = `${mode}_${this.connectionId}_${Date.now()}`;
      this.game = new PongGame(mode, this.gameId);
      this.game.addPlayer(this.socket);

      this.send('gameCreated', {
        gameId: this.gameId,
        mode: mode,
        initialState: this.game.getState()
      });
    }
  }

  handleReadyRemote(data){
    console.log(data);
  }

  handleReady() {
     if (this.game) {
      this.game.markPlayerReady(this.socket);
      this.send('gameStarted', {
        message: 'Game started!',
        state: this.game.getState()
      });
    }
  }

  handleInput(data) {
    const { playerId, direction } = data;

    if (!direction || !['left', 'right'].includes(direction)) {
      return;
    }

    if (this.mode === 'remote') {
      const game = matchmakingService.getGame(this.gameId);
      if (game) {
        game.handleInput(this.socket.playerId, direction);
      }
    } 
    else if (this.game)
      this.game.handleInput(playerId, direction);
  }

  handleLeaveQueue() {
    if (this.mode === 'remote') {
      matchmakingService.removeFromQueue(this.socket);
      this.send('leftQueue', { message: 'You left the queue' });
    }
  }

  handleRestartGame() {
    if (this.mode !== 'remote' && this.game) {
      this.game.cleanup();
      this.game = new PongGame(this.mode, this.gameId);
      this.game.addPlayer(this.socket);

      this.send('gameCreated', {
        gameId: this.gameId,
        mode: this.mode,
        initialState: this.game.getState()
      });
    }
  }

  send(type, data) {
    if (this.socket.readyState === 1) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  handleClose() {
    console.log(`[${this.connectionId}] Client disconnected`);

    if (this.mode === 'remote') {
      matchmakingService.handleDisconnect(this.socket);
    } else if (this.game) {
      this.game.cleanup();
    }
  }

  handleError(err) {
    console.error(`[${this.connectionId}] Socket error:`, err);
    this.handleClose();
  }

  setGameInfo(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;
  }
}

module.exports = WebSocketHandler;