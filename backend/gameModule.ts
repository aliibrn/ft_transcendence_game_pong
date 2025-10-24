let gameState = {
    player: { x: 0 },
    // ball: { x: 0, z: 0 },
    // ai: { x: 0 },
    // playerScore: 0,
    // aiScore: 0
};

const ballVelocity = { x: 0.15, z: -0.15 };
const fieldWidth = 20;
const fieldDepth = 30;

function updateGameState(input: { left?: boolean, right?: boolean }) {
  // Move player based on input
  const speed = 0.3;
  if (input.left) gameState.player.x -= speed;
  if (input.right) gameState.player.x += speed;
  gameState.player.x = Math.max(-fieldWidth / 2 + 2, Math.min(fieldWidth / 2 - 2, gameState.player.x));

  // Move AI (simple follow)
//   const aiSpeed = 0.2;
//   if (gameState.ball.x < gameState.ai.x) gameState.ai.x -= aiSpeed;
//   else if (gameState.ball.x > gameState.ai.x) gameState.ai.x += aiSpeed;
//   gameState.ai.x = Math.max(-fieldWidth / 2 + 2, Math.min(fieldWidth / 2 - 2, gameState.ai.x));

  // Move ball
//   gameState.ball.x += ballVelocity.x;
//   gameState.ball.z += ballVelocity.z;

  // Wall collision
//   if (gameState.ball.x <= -fieldWidth / 2 + 0.4 || gameState.ball.x >= fieldWidth / 2 - 0.4) {
//     ballVelocity.x *= -1;
//   }
}

module.exports = updateGameState;