// models/Ball.js

const BASE_SPEED = 0.15;
const MAX_SPEED = 0.35;
const SPEED_INCREMENT = 0.01;

class Ball {
  constructor() {
    this.x = 0;
    this.y = 0.4;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.radius = 0.4;
    this.baseSpeed = BASE_SPEED;
    this.currentSpeed = BASE_SPEED;
  }

  reset(direction) {
    this.x = 0;
    this.z = 0;
    this.currentSpeed = this.baseSpeed;
    
    // Random horizontal velocity
    this.vx = (Math.random() - 0.5) * this.currentSpeed * 2;
    
    // Vertical velocity based on direction
    this.vz = direction === 'up' ? -this.currentSpeed : this.currentSpeed;
  }

  update() {
    this.x += this.vx;
    this.z += this.vz;
  }

  reverseX() {
    this.vx *= -1;
  }

  reverseZ() {
    this.vz *= -1;
  }

  addSpin(paddleX) {
    // Add horizontal velocity based on where ball hit the paddle
    const offset = this.x - paddleX;
    this.vx += offset * 0.05;
    
    // Clamp horizontal velocity
    this.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, this.vx));
  }

  increaseSpeed() {
    // Gradually increase speed with each paddle hit
    this.currentSpeed = Math.min(MAX_SPEED, this.currentSpeed + SPEED_INCREMENT);
    
    // Maintain direction but increase magnitude
    const speedRatio = this.currentSpeed / Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    this.vx *= speedRatio;
    this.vz *= speedRatio;
  }

  getState() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      radius: this.radius,
      vx: this.vx,
      vz: this.vz,
      speed: this.currentSpeed
    };
  }
}

module.exports = Ball;