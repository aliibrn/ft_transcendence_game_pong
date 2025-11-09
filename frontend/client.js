const socket = new WebSocket("ws://localhost:3000/ws");
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);

let player, scene;
let fieldWidth, fieldDepth;
let keys = {};

const createScene = () => {
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 3,
    30,
    new BABYLON.Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.8;

  const field = BABYLON.MeshBuilder.CreateGround("field", { width: fieldWidth, height: fieldDepth }, scene);
  const fieldMat = new BABYLON.StandardMaterial("fieldMat", scene);
  fieldMat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.2);
  fieldMat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.1);
  field.material = fieldMat;

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

  // player = BABYLON.MeshBuilder.CreateBox("player", { width: 4, height: 0.8, depth: 0.8 }, scene);
  // const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
  // playerMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
  // playerMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
  // player.material = playerMat;
  // player.position.y = 0.4;

  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  scene.onBeforeRenderObservable.add(() => {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      socket.send(JSON.stringify({ type: 'input', direction: 'left' }));
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      socket.send(JSON.stringify({ type: 'input', direction: 'right' }));
    }
  });

  return scene;
};

function updateGameState(state) {
  if (!player) return;
  
  player.position.x = state.player.x;
  player.position.y = state.player.y;
  player.position.z = state.player.z;
}

window.addEventListener('resize', () => {
  engine.resize();
});

socket.onopen = () => {
  console.log("✅ Connected to server");
  socket.send(JSON.stringify({ type: 'mode', mode: 'local' }));
};

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log("📩 Received:", data.type);

    if (data.type === 'init') {
      fieldWidth = data.data.fieldWidth;
      fieldDepth = data.data.fieldDepth;
      scene = createScene();
      engine.runRenderLoop(() => {
        scene.render();
      });
      // updateGameState(data.data);
    } 
    else if (data.type === 'update') {
      updateGameState(data.data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

socket.onerror = (error) => {
  console.error("❌ WebSocket error:", error);
};

socket.onclose = () => {
  console.log("🔌 Connection closed");
};