// models/PongGame.js
const Player = require('./Player');
const Ball = require('./Ball');

const GAME_TICK_RATE = 1000 / 60; // 60 FPS
const MAX_GAME_DURATION = 2 * 60 * 1000; // 2 minutes
const GOAL_PAUSE_DURATION = 1500; // 1.5 seconds

class PongGame {
  constructor(mode, gameId) {
    this.gameId = gameId;
    this.mode = mode;
    this.fieldWidth = 20;
    this.fieldDepth = 30;
    this.maxScore = 5;

    this.player1 = new Player('player1', 'down', this.fieldWidth, this.fieldDepth);
    this.player2 = new Player('player2', 'up', this.fieldWidth, this.fieldDepth);
    this.ball = new Ball();

    this.gameLoop = null;
    this.gameTimer = null;
    this.isRunning = false;
    this.isPaused = false;
    this.winner = null;
    this.startTime = null;
    this.elapsedTime = 0;

    this.players = new Map();
    this.readyPlayers = new Set();
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.ball.reset('up');

    // Start game loop
    this.gameLoop = setInterval(() => {
      this.update();
    }, GAME_TICK_RATE);

    // Start game timer
    this.gameTimer = setTimeout(() => {
      this.handleGameTimeout();
    }, MAX_GAME_DURATION);

    console.log(`[${this.gameId}] Game started in ${this.mode} mode`);
  }

  stop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    
    this.isRunning = false;
    console.log(`[${this.gameId}] Game stopped`);
  }

  pause(duration) {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    console.log(`[${this.gameId}] Game paused for ${duration}ms`);

    setTimeout(() => {
      if (this.isRunning) {
        this.isPaused = false;
        console.log(`[${this.gameId}] Game resumed`);
      }
    }, duration);
  }

  update() {
    if (!this.isRunning || this.isPaused) return;

    // Update elapsed time
    this.elapsedTime = Date.now() - this.startTime;

    // Update AI if in solo mode
    if (this.mode === 'solo') {
      this.updateAI();
    }

    // Update ball physics
    this.ball.update();

    // Check collisions and scoring
    this.checkCollisions();
    this.checkScoring();

    // Broadcast state to all players
    this.broadcastState();
  }

  updateAI() {
    const aiPlayer = this.player2;
    const aiSpeed = 0.2;

    // Simple AI: follow the ball
    if (this.ball.x < aiPlayer.x - 0.5) {
      aiPlayer.x -= aiSpeed;
    } else if (this.ball.x > aiPlayer.x + 0.5) {
      aiPlayer.x += aiSpeed;
    }

    aiPlayer.x = Math.max(
      -this.fieldWidth / 2 + 2,
      Math.min(this.fieldWidth / 2 - 2, aiPlayer.x)
    );
  }

  checkCollisions() {
    const halfWidth = this.fieldWidth / 2;

    // Wall collisions
    if (this.ball.x <= -halfWidth + 0.4 || this.ball.x >= halfWidth - 0.4) {
      this.ball.reverseX();
    }

    // Paddle collisions
    this.checkPaddleCollision(this.player1);
    this.checkPaddleCollision(this.player2);
  }

  checkPaddleCollision(player) {
    const ballRadius = this.ball.radius;
    const paddleHalfWidth = player.width / 2;
    const paddleHalfDepth = player.height / 2;

    const withinX = Math.abs(this.ball.x - player.x) < paddleHalfWidth + ballRadius;
    const withinZ = this.ball.z >= player.z - paddleHalfDepth - ballRadius &&
      this.ball.z <= player.z + paddleHalfDepth + ballRadius;

    if (withinX && withinZ) {
      // Reflect ball
      if (player.side === 'down') {
        this.ball.vz = -Math.abs(this.ball.vz);
      } else {
        this.ball.vz = Math.abs(this.ball.vz);
      }

      // Add spin based on paddle position
      this.ball.addSpin(player.x);
      
      // Increase speed slightly
      this.ball.increaseSpeed();
    }
  }

  checkScoring() {
    const halfDepth = this.fieldDepth / 2;

    if (this.ball.z > halfDepth) {
      this.player1.incrementScore();
      this.onScore('player1');
    } else if (this.ball.z < -halfDepth) {
      this.player2.incrementScore();
      this.onScore('player2');
    }
  }

  onScore(scorer) {
    console.log(`[${this.gameId}] ${scorer} scored!`);

    // Broadcast goal event
    this.broadcastGoal(scorer);

    // Pause briefly
    this.pause(GOAL_PAUSE_DURATION);

    // Reset ball and paddles
    setTimeout(() => {
      const ballDirection = scorer === 'player1' ? 'down' : 'up';
      this.ball.reset(ballDirection);
      this.player1.reset();
      this.player2.reset();

      // Check for game end
      if (this.player1.score >= this.maxScore) {
        this.winner = 'player1';
        this.endGame();
      } else if (this.player2.score >= this.maxScore) {
        this.winner = 'player2';
        this.endGame();
      }
    }, GOAL_PAUSE_DURATION);
  }

  handleGameTimeout() {
    console.log(`[${this.gameId}] Game timeout reached`);
    
    // Determine winner by score
    if (this.player1.score > this.player2.score) {
      this.winner = 'player1';
    } else if (this.player2.score > this.player1.score) {
      this.winner = 'player2';
    } else {
      this.winner = 'draw';
    }
    
    this.endGame();
  }

  endGame() {
    this.stop();
    console.log(`[${this.gameId}] Game ended. Winner: ${this.winner}`);
    this.broadcastGameEnd();
  }

  handleInput(playerId, direction) {
    if (!this.isRunning || this.isPaused) return;

    const player = playerId === 'player1' ? this.player1 : this.player2;
    if (player) {
      player.move(direction);
    }
  }

  handlePlayerDisconnect(socket) {
    console.log(`[${this.gameId}] Player disconnected`);
    
    // Determine which player disconnected
    let disconnectedPlayer = null;
    for (const [playerId, playerSocket] of this.players.entries()) {
      if (playerSocket === socket) {
        disconnectedPlayer = playerId;
        break;
      }
    }

    if (!disconnectedPlayer) return;

    // Award win to remaining player
    this.winner = disconnectedPlayer === 'player1' ? 'player2' : 'player1';
    
    // Notify remaining player
    this.players.forEach((playerSocket, playerId) => {
      if (playerId !== disconnectedPlayer && playerSocket.readyState === 1) {
        playerSocket.send(JSON.stringify({
          type: 'opponentDisconnected',
          data: { 
            message: 'Your opponent disconnected. You win!',
            winner: playerId
          }
        }));
      }
    });

    this.endGame();
  }

  broadcastGoal(scorer) {
    const data = {
      scorer,
      player1Score: this.player1.score,
      player2Score: this.player2.score
    };

    this.broadcast('goal', data);
  }

  broadcastState() {
    const state = this.getState();
    this.broadcast('update', state);
  }

  broadcastGameEnd() {
    const data = {
      winner: this.winner,
      finalScore: {
        player1: this.player1.score,
        player2: this.player2.score
      },
      duration: this.elapsedTime
    };

    this.broadcast('gameEnd', data);
  }

  broadcast(type, data) {
    const message = JSON.stringify({ type, data });
    
    this.players.forEach(socket => {
      if (socket && socket.readyState === 1) {
        socket.send(message);
      }
    });
  }

  addPlayer(socket, playerId) {
    this.players.set(playerId, socket);
    console.log(`[${this.gameId}] Player ${playerId} added. Total: ${this.players.size}`);
  }

  hasPlayer(socket) {
    return Array.from(this.players.values()).includes(socket);
  }

  markPlayerReady(socket) {
    this.readyPlayers.add(socket);

    const requiredPlayers = this.mode === 'remote' ? 2 : 1;
    
    if (this.readyPlayers.size >= requiredPlayers) {
      setTimeout(() => {
        this.start();
      }, 2000); // 2 second delay before starting
    }
  }

  getState() {
    return {
      gameId: this.gameId,
      mode: this.mode,
      player1: this.player1.getState(),
      player2: this.player2.getState(),
      ball: this.ball.getState(),
      fieldWidth: this.fieldWidth,
      fieldDepth: this.fieldDepth,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      winner: this.winner,
      elapsedTime: this.elapsedTime,
      remainingTime: MAX_GAME_DURATION - this.elapsedTime
    };
  }

  cleanup() {
    this.stop();
    this.players.clear();
    this.readyPlayers.clear();
  }
}

module.exports = PongGame;