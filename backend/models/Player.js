// models/Player.js
class Player {
  constructor(id, side, fieldWidth, fieldDepth) {
    this.id = id;
    this.side = side; // 'up' or 'down'
    this.z = side === 'down' ? (fieldDepth / 2 - 1) : (-fieldDepth / 2 + 1);
    this.x = 0; // Center position
    this.y = 0.4;
    this.width = 4; // Paddle width (horizontal)
    this.height = 0.8; // Paddle depth (vertical)
    this.speed = 0.3;
    this.fieldDepth = fieldDepth;
    this.fieldWidth = fieldWidth;
    this.score = 0;
    this.socket = null; // For remote players
  }

  move(direction) {
    if (direction === 'left') {
      this.x -= this.speed;
    } else if (direction === 'right') {
      this.x += this.speed;
    }
    
    // Keep player in bounds
    this.x = Math.max(-this.fieldWidth / 2 + 2, Math.min(this.fieldWidth / 2 - 2, this.x));
  }

  reset() {
    this.x = 0; // Reset to center position
  }

  incrementScore() {
    this.score++;
  }

  getState() {
    return {
      id: this.id,
      side: this.side,
      x: this.x,
      z: this.z,
      y: this.y,
      width: this.width,
      height: this.height,
      score: this.score
    };
  }

  setSocket(socket) {
    this.socket = socket;
  }
}

module.exports = Player;