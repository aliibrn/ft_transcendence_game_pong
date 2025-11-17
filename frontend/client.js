// client.js
// ==================== GLOBALS ====================
let socket = null;
let engine, scene, camera;
let gameRunning = false;
let currentMode = null;
let myPlayerId = null;
let currentGameId = null;

// Key State (Polling) - Solves blocking issues
const inputKeys = {
    left: false,
    right: false
};

// Game Objects
const objects = {
    p1: null,
    p2: null,
    ball: null
};

// UI Elements
const ui = {
    screens: {
        menu: document.getElementById('modeSelection'),
        matchmaking: document.getElementById('matchmaking'),
        game: document.getElementById('gameContainer'), // Ensure you wrap canvas in a div
        gameOver: document.getElementById('gameOverScreen')
    },
    hud: {
        p1Score: document.getElementById('player1Score'),
        p2Score: document.getElementById('player2Score'),
        timer: document.getElementById('timer'), // Add <div id="timer"></div> to HTML
        status: document.getElementById('statusMessage'),
        goalMsg: document.getElementById('goalMessage') // Add <div id="goalMessage" class="hidden">GOAL!</div>
    }
};

// ==================== INPUT SYSTEM ====================
// We track key up/down and send state in the render loop
window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') inputKeys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputKeys.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') inputKeys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputKeys.right = false;
});

function processInput() {
    if (!gameRunning) return;

    let direction = null;
    if (inputKeys.left) direction = 'left';
    else if (inputKeys.right) direction = 'right';

    if (direction) {
        send({ type: 'input', playerId: myPlayerId, direction });
    }
}

// ==================== NETWORK ====================
function connect() {
    socket = new WebSocket('ws://localhost:3000/ws');

    socket.onopen = () => showStatus('Connected', 'success');
    
    socket.onmessage = (msg) => {
        const { type, data } = JSON.parse(msg.data);
        handleMessage(type, data);
    };

    socket.onclose = () => {
        showStatus('Disconnected', 'error');
        gameRunning = false;
    };
}

function send(payload) {
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(payload));
    }
}

function handleMessage(type, data) {
    switch (type) {
        case 'queueStatus':
            document.getElementById('queuePosition').innerText = `Position: ${data.position}`;
            break;
            
        case 'matchFound':
            myPlayerId = data.yourSide;
            currentGameId = data.gameId;
            switchToScreen('game');
            init3D(data.initialState); // Initialize Babylon
            send({ type: 'readyRemote', data: { gameId: currentGameId, playerId: myPlayerId } });
            break;

        case 'gameCreated': // Local/Solo
            myPlayerId = 'player1';
            currentGameId = data.gameId;
            switchToScreen('game');
            init3D(data.initialState);
            send({ type: 'ready' });
            break;

        case 'gameStarting':
            showStatus(`Starting in ${data.countdown}...`);
            break;

        case 'update':
            // This is the main sync point
            updateWorld(data);
            break;

        case 'goal':
            showGoalMessage(data.scorer);
            ui.hud.p1Score.innerText = data.scores.p1;
            ui.hud.p2Score.innerText = data.scores.p2;
            break;

        case 'gameEnd':
            gameRunning = false;
            showGameOver(data);
            break;

        case 'error':
            showStatus(data.message, 'error');
            break;
    }
}

// ==================== GAME LOGIC ====================
function init3D(initialState) {
    const canvas = document.getElementById('renderCanvas');
    if (engine) engine.dispose();
    
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);

    // Setup Camera
    camera = new BABYLON.ArcRotateCamera("cam", Math.PI/2, Math.PI/3, 40, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Create Objects
    const matP1 = new BABYLON.StandardMaterial("p1", scene); matP1.diffuseColor = BABYLON.Color3.Blue();
    const matP2 = new BABYLON.StandardMaterial("p2", scene); matP2.diffuseColor = BABYLON.Color3.Red();
    
    objects.p1 = BABYLON.MeshBuilder.CreateBox("p1", { width: 4, height: 1, depth: 1 }, scene);
    objects.p1.material = matP1;
    
    objects.p2 = BABYLON.MeshBuilder.CreateBox("p2", { width: 4, height: 1, depth: 1 }, scene);
    objects.p2.material = matP2;

    objects.ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);

    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 30 }, scene);
    ground.position.y = -0.5;

    // Initial Positions
    updateWorld(initialState);

    // Render Loop (Includes Input Polling)
    engine.runRenderLoop(() => {
        scene.render();
        processInput(); // Async input handling per frame
    });

    gameRunning = true;
}

function updateWorld(data) {
    if (!objects.p1) return;

    // Lerp for smoothness (optional, simple assignment used here for responsiveness)
    objects.p1.position.x = data.p1.x;
    objects.p1.position.z = data.p1.z;
    
    objects.p2.position.x = data.p2.x;
    objects.p2.position.z = data.p2.z;

    objects.ball.position.x = data.ball.x;
    objects.ball.position.z = data.ball.z;

    // Update HUD Timer
    if (ui.hud.timer) ui.hud.timer.innerText = formatTime(data.time);
}

function showGoalMessage(scorer) {
    const msg = document.getElementById('goalMessage'); // Make sure this element exists in HTML
    if (msg) {
        msg.innerText = `${scorer === 'player1' ? 'Player 1' : 'Player 2'} SCORED!`;
        msg.style.display = 'block';
        msg.classList.add('fade-in');
        
        // Auto hide after pause
        setTimeout(() => {
            msg.style.display = 'none';
            msg.classList.remove('fade-in');
        }, 1500);
    }
}

function showGameOver(data) {
    switchToScreen('gameOver');
    const winnerText = data.reason === 'disconnect' 
        ? "Opponent Disconnected. You Win!" 
        : `${data.winner === myPlayerId ? 'YOU' : data.winner} WIN!`;
        
    document.getElementById('winnerText').innerText = winnerText;
}

// ==================== UI HELPERS ====================
function switchToScreen(screenName) {
    Object.values(ui.screens).forEach(el => el && el.classList.add('hidden'));
    const target = ui.screens[screenName];
    if (target) target.classList.remove('hidden');
}

function showStatus(msg, type) {
    const el = ui.hud.status;
    el.innerText = msg;
    el.className = `visible ${type}`; // Use CSS classes for colors
    setTimeout(() => el.classList.remove('visible'), 3000);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ==================== EVENT LISTENERS ====================
document.getElementById('localBtn').onclick = () => {
    currentMode = 'local';
    send({ type: 'selectMode', mode: 'local' });
};

document.getElementById('remoteBtn').onclick = () => {
    currentMode = 'remote';
    switchToScreen('matchmaking');
    send({ type: 'selectMode', mode: 'remote' });
};

document.getElementById('soloBtn').onclick = () => {
    currentMode = 'solo';
    send({ type: 'selectMode', mode: 'solo' });
};

document.getElementById('mainMenuBtn').onclick = () => {
    send({ type: 'leaveQueue' }); // Cleanup on server
    switchToScreen('menu');
    if (engine) engine.stopRenderLoop();
};

// Start
connect();