// models/Player.js
class Player {
  constructor(id, side, fieldDepth) {
    this.id = id;
    this.side = side; // 'left' or 'right'
    this.x = side === 'left' ? -9 : 9; // Position near edge
    this.z = 0; // Center position
    this.width = 0.5;
    this.height = 3;
    this.speed = 0.3;
    this.fieldDepth = fieldDepth;
    this.score = 0;
    this.socket = null; // For remote players
  }

  move(direction) {
    const halfDepth = this.fieldDepth / 2;
    const halfHeight = this.height / 2;

    if (direction === 'up') {
      this.z = Math.max(-halfDepth + halfHeight, this.z - this.speed);
    } else if (direction === 'down') {
      this.z = Math.min(halfDepth - halfHeight, this.z + this.speed);
    }
  }

  reset() {
    this.z = 0;
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