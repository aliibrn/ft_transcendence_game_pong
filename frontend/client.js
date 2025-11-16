// client.js - Complete Pong Client with Babylon.js

// ==================== GAME STATE ====================
let socket = null;
let scene = null;
let engine = null;
let camera = null;

let gameMode = null;
let playerId = null;
let gameId = null;
let isGameRunning = false;

// Game objects
let player1Paddle = null;
let player2Paddle = null;
let ball = null;
let field = null;

// Input tracking
let keys = {};

// ==================== DOM ELEMENTS ====================
const canvas = document.getElementById('renderCanvas');
const modeSelection = document.getElementById('modeSelection');
const statusMessage = document.getElementById('statusMessage');
const header = document.getElementById('header');
const gameOverScreen = document.getElementById('gameOverScreen');

const localBtn = document.getElementById('localBtn');
const remoteBtn = document.getElementById('remoteBtn');
const soloBtn = document.getElementById('soloBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const mainMenuBtn = document.getElementById('mainMenuBtn');

const player1ScoreEl = document.getElementById('player1Score');
const player2ScoreEl = document.getElementById('player2Score');
const gameModeEl = document.getElementById('gameMode');
const controlsInfoEl = document.getElementById('controlsInfo');
const player2LabelEl = document.getElementById('player2Label');
const winnerTextEl = document.getElementById('winnerText');
const finalScoreEl = document.getElementById('finalScore');

// ==================== UTILITY FUNCTIONS ====================
function showStatus(message, type = 'connected') {
    statusMessage.textContent = message;
    statusMessage.className = `visible ${type}`;
    setTimeout(() => {
        statusMessage.classList.remove('visible');
    }, 3000);
}

function hideModeSelection() {
    modeSelection.classList.add('hidden');
    setTimeout(() => {
        modeSelection.style.display = 'none';
    }, 500);
}

function showModeSelection() {
    modeSelection.style.display = 'flex';
    setTimeout(() => {
        modeSelection.classList.remove('hidden');
    }, 10);
}

function showGame() {
    header.classList.add('visible');
    canvas.classList.add('visible');
}

function hideGame() {
    header.classList.remove('visible');
    canvas.classList.remove('visible');
}

function showGameOver(winner, scores) {
    gameOverScreen.classList.add('visible');

    if (winner === 'player1') {
        winnerTextEl.textContent = gameMode === 'local' ? 'Player 1 Wins! 🎉' :
            gameMode === 'solo' ? 'You Win! 🎉' :
                playerId === 'player1' ? 'You Win! 🎉' : 'Opponent Wins!';
    } else {
        winnerTextEl.textContent = gameMode === 'local' ? 'Player 2 Wins! 🎉' :
            gameMode === 'solo' ? 'AI Wins!' :
                playerId === 'player2' ? 'You Win! 🎉' : 'Opponent Wins!';
    }

    finalScoreEl.textContent = `${scores.player1} - ${scores.player2}`;
}

function hideGameOver() {
    gameOverScreen.classList.remove('visible');
}

function updateScores(player1Score, player2Score) {
    player1ScoreEl.textContent = player1Score;
    player2ScoreEl.textContent = player2Score;
}

function updateGameInfo(mode) {
    if (mode === 'local') {
        gameModeEl.textContent = 'Local Mode';
        controlsInfoEl.textContent = 'P1: A/D | P2: J/L';
        player2LabelEl.textContent = 'Player 2';
    } else if (mode === 'solo') {
        gameModeEl.textContent = 'vs AI Mode';
        controlsInfoEl.textContent = 'A/D or ↑/↓ to move';
        player2LabelEl.textContent = 'AI';
    } else if (mode === 'remote') {
        gameModeEl.textContent = 'Online Mode';
        controlsInfoEl.textContent = 'A/D or ↑/↓ to move';
        player2LabelEl.textContent = playerId === 'player1' ? 'Opponent' : 'Opponent';
    }
}

// ==================== WEBSOCKET CONNECTION ====================
function connectWebSocket() {
    socket = new WebSocket("ws://localhost:3000/ws");

    socket.onopen = () => {
        console.log("✅ Connected to server");
        showStatus("Connected to server", "connected");
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log(message);
            handleServerMessage(message);
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    };

    socket.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        showStatus("Connection error", "error");
    };

    socket.onclose = () => {
        console.log("🔌 Connection closed");
        showStatus("Disconnected from server", "error");

        // Return to main menu after 2 seconds
        setTimeout(() => {
            resetGame();
        }, 2000);
    };
}

function sendToServer(type, data = {}) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, ...data }));
    }
}

// ==================== SERVER MESSAGE HANDLER ====================
function handleServerMessage(message) {
    console.log('📨 Received:', message.type);

    switch (message.type) {
        case 'connected':
            console.log('Connection ID:', message.data.connectionId);
            break;

        case 'queueStatus':
            showStatus(`Waiting for opponent... Position: ${message.data.position}`, 'waiting');
            break;

        case 'matchFound':
            gameId = message.data.gameId;
            playerId = message.data.yourSide;
            showStatus("Match found! Starting game...", "connected");
            initializeGame(message.data.initialState);
            updateGameInfo('remote');
            sendToServer('ready');
            break;

        case 'gameCreated':
            gameId = message.data.gameId;
            gameMode = message.data.mode;
            showStatus("Game created! Get ready...", "connected");
            initializeGame(message.data.initialState);
            updateGameInfo(gameMode);
            sendToServer('ready');
            break;

        case 'gameStarted':
            isGameRunning = true;
            showStatus("Game started!", "connected");
            break;

        case 'update':
            updateGameState(message.data);
            break;

        // case 'GOAL':
        //     setTimeout(() => {

        //     }, 3000);        
        //     break;

        case 'gameEnd':
            isGameRunning = false;
            showGameOver(message.data.winner, message.data.finalScore);
            break;

        case 'opponentDisconnected':
            showStatus(message.data.message, "error");
            setTimeout(() => {
                resetGame();
            }, 3000);
            break;

        case 'error':
            showStatus(message.data.message, "error");
            break;
    }
}

// ==================== BABYLON.JS SCENE SETUP ====================
function initializeGame(state) {
    hideModeSelection();
    showGame();

    const fieldWidth = state.fieldWidth;
    const fieldDepth = state.fieldDepth;


    // Create Babylon engine and scene
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);

    // Camera
    camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI / 2,
        Math.PI / 3,
        30,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.8;

    // Field
    field = BABYLON.MeshBuilder.CreateGround(
        "field",
        { width: fieldWidth, height: fieldDepth },
        scene
    );

    const fieldMat = new BABYLON.StandardMaterial("fieldMat", scene);
    fieldMat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.2);
    fieldMat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.1);
    field.material = fieldMat;

    // Walls (top and bottom)
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
    ball.position.y = state.ball.y;
    ball.position.x = state.ball.x;
    ball.position.z = state.ball.z;

    // Player1 paddle (blue)
    player1Paddle = BABYLON.MeshBuilder.CreateBox("player", { width: 4, height: 0.8, depth: 0.8 }, scene);
    const player1PaddleMat = new BABYLON.StandardMaterial("playerMat", scene);
    player1PaddleMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
    player1PaddleMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    player1Paddle.material = player1PaddleMat;
    player1Paddle.position.z = state.player1.z;
    player1Paddle.position.y = state.player1.y;
    player1Paddle.position.x = state.player1.x;

    // player2 paddle (red)
    player2Paddle = BABYLON.MeshBuilder.CreateBox("ai", { width: 4, height: 0.8, depth: 0.8 }, scene);
    const player2PaddleMat = new BABYLON.StandardMaterial("aiMat", scene);
    player2PaddleMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3);
    player2PaddleMat.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
    player2Paddle.material = player2PaddleMat;
    player2Paddle.position.z = state.player2.z;
    player2Paddle.position.y = state.player2.y;
    player2Paddle.position.x = state.player2.x;

    // Start render loop
    engine.runRenderLoop(() => {
        scene.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        engine.resize();
    });

    // Initial state update
    updateGameState(state);
}

// ==================== GAME STATE UPDATE ====================
function updateGameState(state) {

    if (!player1Paddle || !player2Paddle || !ball) return;
    console.log("here");
    // Update paddles
    player1Paddle.position.x = state.player1.x;
    player2Paddle.position.x = state.player2.x;

    // Update ball
    ball.position.x = state.ball.x;
    ball.position.z = state.ball.z;

    // Update scores
    updateScores(state.player1.score, state.player2.score);
}

function Pause_GOAL(){
    
}

// ==================== INPUT HANDLING ====================
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    handleInput();
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function handleInput() {
    if (!isGameRunning) return;

    if (gameMode === 'local') {
        // Player 1: W/S
        if (keys['d'] || keys['D']) {
            sendToServer('input', { playerId: 'player1', direction: 'left' });
        }
        if (keys['a'] || keys['A']) {
            sendToServer('input', { playerId: 'player1', direction: 'right' });
        }
        // Player 2: Arrow Keys
        if (keys['l'] || keys['L']) {
            sendToServer('input', { playerId: 'player2', direction: 'left' });
        }
        if (keys['j'] || keys['J']) {
            sendToServer('input', { playerId: 'player2', direction: 'right' });
        }
    } else {
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
            sendToServer('input', { playerId: playerId || 'player1', direction: 'left' });
        }
        if (keys['d'] || keys['D'] || keys['ArrowRight']) {
            sendToServer('input', { playerId: playerId || 'player1', direction: 'right' });
        }
    }
}

// ==================== MODE SELECTION ====================
localBtn.addEventListener('click', () => {
    gameMode = 'local';
    sendToServer('selectMode', { mode: 'local' });
    showStatus("Creating local game...", "waiting");
});

remoteBtn.addEventListener('click', () => {
    gameMode = 'remote';
    sendToServer('selectMode', { mode: 'remote' });
    showStatus("Searching for opponent...", "waiting");
});

soloBtn.addEventListener('click', () => {
    gameMode = 'solo';
    sendToServer('selectMode', { mode: 'solo' });
    showStatus("Creating solo game...", "waiting");
});

// ==================== GAME OVER ACTIONS ====================
playAgainBtn.addEventListener('click', () => {
    hideGameOver();

    if (gameMode === 'remote') {
        // For remote, need to find new match
        resetGame();
        gameMode = 'remote';
        sendToServer('selectMode', { mode: 'remote' });
        showStatus("Searching for opponent...", "waiting");
    } else {
        // For local/solo, restart the same game
        sendToServer('restartGame');
        showStatus("Restarting game...", "waiting");
    }
});

mainMenuBtn.addEventListener('click', () => {
    hideGameOver();
    resetGame();
});

// ==================== GAME RESET ====================
function resetGame() {
    // Dispose Babylon scene
    if (scene) {
        scene.dispose();
        scene = null;
    }
    if (engine) {
        engine.dispose();
        engine = null;
    }

    // Reset variables
    player1Paddle = null;
    player2Paddle = null;
    ball = null;
    field = null;
    gameMode = null;
    playerId = null;
    gameId = null;
    isGameRunning = false;
    keys = {};

    // Reset UI
    hideGame();
    showModeSelection();
    updateScores(0, 0);
}

// ==================== INITIALIZATION ====================
connectWebSocket();