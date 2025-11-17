// models/PongGame.js
const Player = require('./Player');
const Ball = require('./Ball');

const CONFIG = {
  TICK_RATE: 1000 / 60,
  MAX_DURATION: 120 * 1000, // 2 minutes
  GOAL_PAUSE: 1500,
  MAX_SCORE: 5
};

class PongGame {
  constructor(mode, gameId) {
    this.gameId = gameId;
    this.mode = mode;
    
    this.fieldWidth = 20;
    this.fieldDepth = 30;

    // Initialize Entities
    this.player1 = new Player('player1', 'down', this.fieldWidth, this.fieldDepth);
    this.player2 = new Player('player2', 'up', this.fieldWidth, this.fieldDepth);
    this.ball = new Ball();

    // Game State
    this.state = 'waiting'; // waiting, playing, paused, ended
    this.startTime = 0;
    this.elapsedTime = 0;
    this.winner = null;
    this.winReason = null; // 'score', 'time', 'disconnect'

    // Engine
    this.loopId = null;
    this.players = new Map();
    this.readySet = new Set();
  }

  addPlayer(socket, id) {
    this.players.set(id, socket);
  }

  markPlayerReady(socket) {
    if (this.state !== 'waiting') return;
    
    this.readySet.add(socket);
    
    const required = this.mode === 'remote' ? 2 : 1;
    if (this.readySet.size >= required) {
      this.startGameSequence();
    }
  }

  startGameSequence() {
    console.log(`[${this.gameId}] All players ready. Starting...`);
    
    // 1. Reset everything
    this.ball.reset('up');
    this.player1.reset();
    this.player2.reset();
    
    // 2. Set start time
    this.startTime = Date.now();
    this.state = 'playing';

    // 3. Start Loop
    this.loopId = setInterval(() => this.tick(), CONFIG.TICK_RATE);
  }

  tick() {
    if (this.state === 'ended') return;

    const now = Date.now();
    this.elapsedTime = now - this.startTime;

    // 1. Check Time Limit
    if (this.elapsedTime >= CONFIG.MAX_DURATION) {
      this.endGame('time');
      return;
    }

    // 2. Physics (only if playing)
    if (this.state === 'playing') {
      if (this.mode === 'solo') this.updateAI();
      this.ball.update();
      this.checkCollisions();
      this.checkScoring();
    }

    // 3. Broadcast State
    this.broadcastState();
  }

  updateAI() {
    // Simple Lerp AI
    const targetX = this.ball.x;
    const diff = targetX - this.player2.x;
    this.player2.x += diff * 0.1; // 0.1 = Smoothing factor
    
    // Clamp
    const limit = (this.fieldWidth / 2) - 2;
    this.player2.x = Math.max(-limit, Math.min(limit, this.player2.x));
  }

  checkCollisions() {
    // Walls
    const limit = this.fieldWidth / 2;
    if (this.ball.x <= -limit + 0.5 || this.ball.x >= limit - 0.5) {
      this.ball.reverseX();
    }

    // Paddles
    this.checkPaddle(this.player1);
    this.checkPaddle(this.player2);
  }

  checkPaddle(player) {
    // Simple AABB collision logic would go here
    // Reusing your existing logic logic for brevity...
    // (Ensure to add spin/speed increase here)
    const ballR = this.ball.radius;
    const pW = player.width / 2;
    const pH = player.height / 2;

    if (this.ball.z >= player.z - pH - ballR && 
        this.ball.z <= player.z + pH + ballR &&
        Math.abs(this.ball.x - player.x) < pW + ballR) {
            
        // Hit!
        this.ball.vz *= -1.05; // Speed up 5%
        this.ball.addSpin(player.x); // Add spin
    }
  }

  checkScoring() {
    const limit = this.fieldDepth / 2;
    
    if (this.ball.z > limit) {
      this.handleGoal('player1');
    } else if (this.ball.z < -limit) {
      this.handleGoal('player2');
    }
  }

  handleGoal(scorer) {
    // Update Score
    if (scorer === 'player1') this.player1.score++;
    else this.player2.score++;

    // Notify Goal
    this.broadcast('goal', {
      scorer,
      scores: { p1: this.player1.score, p2: this.player2.score }
    });

    // Check Win Condition
    if (this.player1.score >= CONFIG.MAX_SCORE || this.player2.score >= CONFIG.MAX_SCORE) {
      this.endGame('score');
      return;
    }

    // Pause for Reset
    this.state = 'paused';
    setTimeout(() => {
        if (this.state === 'ended') return;
        this.ball.reset(scorer === 'player1' ? 'down' : 'up');
        this.state = 'playing';
    }, CONFIG.GOAL_PAUSE);
  }

  handleInput(playerId, direction) {
    if (this.state !== 'playing') return;
    
    const player = playerId === 'player1' ? this.player1 : this.player2;
    if (player) player.move(direction);
  }

  handlePlayerDisconnect(socket) {
    // Identify who left
    const disconnectedId = [...this.players.entries()]
      .find(([id, s]) => s === socket)?.[0];

    if (disconnectedId) {
      // The OTHER player wins
      this.winner = disconnectedId === 'player1' ? 'player2' : 'player1';
      this.endGame('disconnect');
    }
  }

  endGame(reason) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.winReason = reason;

    if (!this.winner) {
        if (this.player1.score > this.player2.score) this.winner = 'player1';
        else if (this.player2.score > this.player1.score) this.winner = 'player2';
        else this.winner = 'draw';
    }

    clearInterval(this.loopId);
    
    this.broadcast('gameEnd', {
      winner: this.winner,
      reason: this.winReason,
      finalScore: { p1: this.player1.score, p2: this.player2.score }
    });

    console.log(`[${this.gameId}] Game Over. Winner: ${this.winner} (${reason})`);
  }

  broadcastState() {
    const payload = this.getState();
    this.broadcast('update', payload);
  }

  getState() {
    return {
      p1: this.player1.getState(), // {x, y, z, score}
      p2: this.player2.getState(),
      ball: this.ball.getState(),
      state: this.state, // 'playing', 'paused'
      time: Math.floor((CONFIG.MAX_DURATION - this.elapsedTime) / 1000)
    };
  }

  broadcast(type, data) {
    const msg = JSON.stringify({ type, data });
    this.players.forEach(socket => {
      if (socket.readyState === 1) socket.send(msg);
    });
  }

  cleanup() {
    clearInterval(this.loopId);
    this.players.clear();
  }
}

module.exports = PongGame;