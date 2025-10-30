class PongGame {
  constructor() {
    this.fieldWidth = 20;
    this.fieldDepth = 30;
    
    // Game state
    this.ball = {
      x: 0,
      y: 0.4,
      z: 0,
      velocity: { x: 0.15, z: -0.15 }
    };
    
    this.player = {
      x: 0,
      y: 0.4,
      z: this.fieldDepth / 2 - 1,
      width: 4
    };
    
    this.ai = {
      x: 0,
      y: 0.4,
      z: -this.fieldDepth / 2 + 1,
      width: 4
    };
    
    this.scores = {
      player: 0,
      ai: 0
    };
    
    this.ballRadius = 0.4;
    this.playerSpeed = 0.3;
    this.aiSpeed = 0.2;
  }

  // Update player position based on input
  updatePlayer(direction) {
    if (direction === 'left') {
      this.player.x -= this.playerSpeed;
    } else if (direction === 'right') {
      this.player.x += this.playerSpeed;
    }
    
    // Keep player in bounds
    this.player.x = Math.max(
      -this.fieldWidth / 2 + 2,
      Math.min(this.fieldWidth / 2 - 2, this.player.x)
    );
  }

  // AI logic
  updateAI() {
    if (this.ball.x < this.ai.x) {
      this.ai.x -= this.aiSpeed;
    } else if (this.ball.x > this.ai.x) {
      this.ai.x += this.aiSpeed;
    }
    
    this.ai.x = Math.max(
      -this.fieldWidth / 2 + 2,
      Math.min(this.fieldWidth / 2 - 2, this.ai.x)
    );
  }

  // Update ball physics
  updateBall() {
    // Move ball
    this.ball.x += this.ball.velocity.x;
    this.ball.z += this.ball.velocity.z;
    
    // Wall collision
    if (this.ball.x <= -this.fieldWidth / 2 + 0.4 || 
        this.ball.x >= this.fieldWidth / 2 - 0.4) {
      this.ball.velocity.x *= -1;
    }
    
    // Player paddle collision
    if (this.ball.z >= this.player.z - 0.4 - this.ballRadius &&
        this.ball.z <= this.player.z + 0.4 + this.ballRadius &&
        Math.abs(this.ball.x - this.player.x) < 2 + this.ballRadius) {
      this.ball.velocity.z = -Math.abs(this.ball.velocity.z);
      this.ball.velocity.x += (this.ball.x - this.player.x) * 0.05;
      this.ball.velocity.x = Math.max(-0.3, Math.min(0.3, this.ball.velocity.x));
    }
    
    // AI paddle collision
    if (this.ball.z <= this.ai.z + 0.4 + this.ballRadius &&
        this.ball.z >= this.ai.z - 0.4 - this.ballRadius &&
        Math.abs(this.ball.x - this.ai.x) < 2 + this.ballRadius) {
      this.ball.velocity.z = Math.abs(this.ball.velocity.z);
      this.ball.velocity.x += (this.ball.x - this.ai.x) * 0.05;
      this.ball.velocity.x = Math.max(-0.3, Math.min(0.3, this.ball.velocity.x));
    }
    
    // Score detection
    if (this.ball.z > this.fieldDepth / 2) {
      this.resetBall('ai');
      return 'ai';
    } else if (this.ball.z < -this.fieldDepth / 2) {
      this.resetBall('player');
      return 'player';
    }
    
    return null;
  }

  // Reset ball after score
  resetBall(scoredBy) {
    this.ball.x = 0;
    this.ball.z = 0;
    
    const speed = 0.15;
    this.ball.velocity.x = (Math.random() - 0.5) * speed * 2;
    this.ball.velocity.z = scoredBy === 'player' ? -speed : speed;
    
    if (scoredBy === 'player') {
      this.scores.player++;
    } else {
      this.scores.ai++;
    }
  }

  // Main game update loop
  update(playerInput) {
    // Update player based on input
    if (playerInput) {
      this.updatePlayer(playerInput);
    }
    
    // Update AI
    this.updateAI();
    
    // Update ball and check for scores
    const scored = this.updateBall();
    
    // Return current game state
    return {
      ball: { ...this.ball },
      player: { ...this.player },
      ai: { ...this.ai },
      scores: { ...this.scores },
      scored
    };
  }

  // Get current game state
  getState() {
    return {
      ball: { ...this.ball },
      player: { ...this.player },
      ai: { ...this.ai },
      scores: { ...this.scores },
      fieldWidth: this.fieldWidth,
      fieldDepth: this.fieldDepth
    };
  }
}

module.exports = PongGame;