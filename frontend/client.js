// WebSocket connection
const socket = new WebSocket("ws://localhost:3000");

// Babylon.js setup
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);

let ball, player, ai, scene;
let keys = {};
let fieldWidth, fieldDepth;
// Send input to server
function sendInput() {
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    socket.send(JSON.stringify({ type: 'input', direction: 'left' }));
  } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    socket.send(JSON.stringify({ type: 'input', direction: 'right' }));
  }
}

// Create the 3D scene
function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);
  
  // Camera
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 3,
    30,
    new BABYLON.Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  
  // Lights
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.8;
  
  // Field
  const field = BABYLON.MeshBuilder.CreateGround("field", { width: fieldWidth, height: fieldDepth }, scene);
  const fieldMat = new BABYLON.StandardMaterial("fieldMat", scene);
  fieldMat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.2);
  fieldMat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.1);
  field.material = fieldMat;
  
  // Walls
  const wallMat = new BABYLON.StandardMaterial("wallMat", scene);
  wallMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.4);
  wallMat.alpha = 0.3;
  
  const leftWall = BABYLON.MeshBuilder.CreateBox("leftWall", { width: 0.5, height: 3, depth: fieldDepth }, scene);
  leftWall.position.x = -fieldWidth / 2;
  leftWall.position.y = 1.5;
  leftWall.material = wallMat;
  
  const rightWall = BABYLON.MeshBuilder.CreateBox("rightWall", { width: 0.5, height: 3, depth: fieldDepth }, scene);
  rightWall.position.x = fieldWidth / 2;
  rightWall.position.y = 1.5;
  rightWall.material = wallMat;
  
  // Ball
  ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.8 }, scene);
  const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
  ballMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  ballMat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  ball.material = ballMat;
  
  // Player paddle (blue)
  player = BABYLON.MeshBuilder.CreateBox("player", { width: 4, height: 0.8, depth: 0.8 }, scene);
  const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
  playerMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
  playerMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
  player.material = playerMat;
  
  // AI paddle (red)
  ai = BABYLON.MeshBuilder.CreateBox("ai", { width: 4, height: 0.8, depth: 0.8 }, scene);
  const aiMat = new BABYLON.StandardMaterial("aiMat", scene);
  aiMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3);
  aiMat.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
  ai.material = aiMat;
  
  return scene;
}

// Update game state from server
function updateGameState(state) {
  if (!ball || !player || !ai) return;
  
  // Update ball position
  ball.position.x = state.ball.x;
  ball.position.y = state.ball.y;
  ball.position.z = state.ball.z;
  
  // Update player position
  player.position.x = state.player.x;
  player.position.y = state.player.y;
  player.position.z = state.player.z;
  
  // Update AI position
  ai.position.x = state.ai.x;
  ai.position.y = state.ai.y;
  ai.position.z = state.ai.z;
  
  // Update scores
  document.getElementById('playerScore').textContent = state.scores.player;
  document.getElementById('aiScore').textContent = state.scores.ai;
}

// Handle window resize
window.addEventListener('resize', () => {
  engine.resize();
});

socket.onopen = () => {
  console.log("✅ Connected to the server");
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'init') {
    // Initialize the scene with server data
    const data = message.data;
    fieldWidth = data.fieldWidth;
    fieldDepth = data.fieldDepth;
    scene = createScene();
    
    // Start render loop
    engine.runRenderLoop(() => {
      scene.render();
    });
  } else if (message.type === 'update') {
    // Update positions from server
    updateGameState(message.data);
  }
};

socket.onerror = (error) => {
  console.error("❌ WebSocket error:", error);
};

socket.onclose = () => {
  console.log("🔌 Connection closed");
};

// Keyboard input
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  sendInput();
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});
