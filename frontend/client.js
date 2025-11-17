// client.js - Complete Production-Ready Pong Client
// Merging your original design with all improvements

// ==================== GAME STATE ====================
let socket = null;
let scene = null;
let engine = null;
let camera = null;

let gameMode = null;
let playerId = null;
let gameId = null;
let isGameRunning = false;
let connectionId = null;

// Game objects
let player1Paddle = null;
let player2Paddle = null;
let ball = null;
let field = null;

// Input throttling system - PREVENTS KEY SPAM BLOCKING
let inputQueue = [];
let lastInputTime = 0;
const INPUT_THROTTLE = 16; // ~60fps
let inputInterval = null;

// Connection health monitoring
let lastPingTime = Date.now();
let pingInterval = null;

// ==================== DOM ELEMENTS ====================
const canvas = document.getElementById('renderCanvas');
const modeSelection = document.getElementById('modeSelection');
const statusMessage = document.getElementById('statusMessage');
const header = document.getElementById('header');
const matchmaking = document.getElementById('matchmaking');
const queuePositionEl = document.getElementById('queuePosition');
const queueListEl = document.getElementById('queueList');
const cancelMatchmakingBtn = document.getElementById('cancelMatchmaking');
const gameOverScreen = document.getElementById('gameOverScreen');
const countdownEl = document.getElementById('countdown');

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

function showCountdown(seconds) {
    if (!countdownEl) return;
    
    countdownEl.textContent = seconds > 0 ? seconds : 'GO!';
    countdownEl.classList.remove('countdown-animation');
    
    // Force reflow to restart animation
    void countdownEl.offsetWidth;
    countdownEl.classList.add('countdown-animation');
}

function hideModeSelection() {
    modeSelection.classList.add('hidden');
}

function showModeSelection() {
    modeSelection.classList.remove('hidden');
}

function showMatchmaking() {
    matchmaking.classList.add('visible');
}

function hideMatchmaking() {
    matchmaking.classList.remove('visible');
    if (queueListEl) queueListEl.innerHTML = '';
}

function updateQueuePosition(position) {
    if (queuePositionEl) {
        queuePositionEl.textContent = position || '-';
    }
}

function updateQueueList(players, yourConnectionId) {
    if (!queueListEl || !players) return;
    
    queueListEl.innerHTML = '';

    players.forEach((player, index) => {
        const isYou = player.connectionId === yourConnectionId;
        const queueItem = document.createElement('div');
        queueItem.className = `queue-item ${isYou ? 'you' : ''}`;

        queueItem.innerHTML = `
            <div class="player-avatar">${isYou ? '👤' : '🎮'}</div>
            <div class="player-info">
                <div class="player-name">${isYou ? 'You' : `Player ${index + 1}`}</div>
                <div class="player-status">${isYou ? 'Ready to play' : 'Waiting...'}</div>
            </div>
        `;

        queueListEl.appendChild(queueItem);
    });
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

    let winnerText = '';
    if (winner === 'draw') {
        winnerText = "It's a Draw! 🤝";
    } else if (winner === 'player1') {
        winnerText = gameMode === 'local' ? 'Player 1 Wins! 🎉' :
            gameMode === 'solo' ? 'You Win! 🎉' :
                playerId === 'player1' ? 'You Win! 🎉' : 'Opponent Wins! 😔';
    } else {
        winnerText = gameMode === 'local' ? 'Player 2 Wins! 🎉' :
            gameMode === 'solo' ? 'AI Wins! 🤖' :
                playerId === 'player2' ? 'You Win! 🎉' : 'Opponent Wins! 😔';
    }

    winnerTextEl.textContent = winnerText;
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
        controlsInfoEl.textContent = 'A/D or ←/→ to move';
        player2LabelEl.textContent = 'AI';
    } else if (mode === 'remote') {
        gameModeEl.textContent = 'Online Mode';
        controlsInfoEl.textContent = 'A/D or ←/→ to move';
        player2LabelEl.textContent = 'Opponent';
    }
}

// ==================== WEBSOCKET CONNECTION ====================
function connectWebSocket() {
    socket = new WebSocket("ws://localhost:3000/ws");

    socket.onopen = () => {
        console.log("✅ Connected to server");
        showStatus("Connected to server", "connected");
        startPingInterval();
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleServerMessage(message);
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    };

    socket.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        showStatus("Connection error. Please refresh.", "error");
    };

    socket.onclose = () => {
        console.log("🔌 Connection closed");
        showStatus("Disconnected from server", "error");
        stopPingInterval();
        stopInputProcessor();

        setTimeout(() => {
            resetGame();
        }, 2000);
    };
}

function startPingInterval() {
    pingInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            sendToServer('ping');
            
            // Check if connection is stale
            if (Date.now() - lastPingTime > 15000) {
                console.warn('Connection appears stale');
                showStatus("Connection unstable...", "waiting");
            }
        }
    }, 5000); // Ping every 5 seconds
}

function stopPingInterval() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
}

function sendToServer(type, data = {}) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify({ type, ...data }));
        } catch (err) {
            console.error('Error sending message:', err);
        }
    }
}

// ==================== SERVER MESSAGE HANDLER ====================
function handleServerMessage(message) {
    console.log('📨 Received:', message.type);

    switch (message.type) {
        case 'connected':
            connectionId = message.data.connectionId;
            console.log('Connection ID:', connectionId);
            break;

        case 'queueStatus':
            updateQueuePosition(message.data.position);
            if (message.data.playersInQueue) {
                updateQueueList(message.data.playersInQueue, connectionId);
            }
            break;

        case 'matchFound':
            gameId = message.data.gameId;
            playerId = message.data.yourSide;
            hideMatchmaking();
            showStatus("Match found! Preparing game...", "connected");
            initializeGame(message.data.initialState);
            updateGameInfo('remote');
            sendToServer('readyRemote', { data: { gameId, playerId } });
            break;

        case 'gameCreated':
            gameId = message.data.gameId;
            gameMode = message.data.mode;
            playerId = message.data.playerId || 'player1';
            showStatus("Game created! Get ready...", "connected");
            initializeGame(message.data.initialState);
            updateGameInfo(gameMode);
            sendToServer('ready');
            break;

        case 'gameStarting':
            showStatus(message.data.message, "connected");
            if (message.data.countdown) {
                startCountdownSequence(message.data.countdown);
            }
            break;

        case 'update':
            updateGameState(message.data);
            if (!isGameRunning && message.data.isRunning) {
                isGameRunning = true;
                startInputProcessor();
            }
            break;

        case 'goal':
            handleGoal(message.data);
            break;

        case 'gameEnd':
            isGameRunning = false;
            stopInputProcessor();
            setTimeout(() => {
                showGameOver(message.data.winner, message.data.finalScore);
            }, 500);
            break;

        case 'matchmakingTimeout':
            hideMatchmaking();
            showStatus(message.data.message || "No opponent found. Please try again.", "error");
            setTimeout(() => resetGame(), 2000);
            break;

        case 'opponentDisconnected':
            isGameRunning = false;
            stopInputProcessor();
            showStatus(message.data.message, "error");
            setTimeout(() => {
                if (message.data.winner) {
                    showGameOver(message.data.winner, { 
                        player1: player1ScoreEl.textContent || 0, 
                        player2: player2ScoreEl.textContent || 0 
                    });
                } else {
                    resetGame();
                }
            }, 2000);
            break;

        case 'leftQueue':
            showStatus(message.data.message, "connected");
            break;

        case 'pong':
            lastPingTime = Date.now();
            break;

        case 'error':
            showStatus(message.data.message, "error");
            break;

        default:
            console.warn('Unknown message type:', message.type);
    }
}

function startCountdownSequence(countSeconds) {
    let count = countSeconds;
    
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            showCountdown(count);
            count--;
        } else {
            showCountdown(0); // Show "GO!"
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function handleGoal(data) {
    console.log(`⚽ Goal by ${data.scorer}!`);
    updateScores(data.player1Score, data.player2Score);
    
    // Visual feedback with animation
    const scorerEl = data.scorer === 'player1' ? player1ScoreEl : player2ScoreEl;
    scorerEl.classList.add('score-update');
    setTimeout(() => {
        scorerEl.classList.remove('score-update');
    }, 600);
}

// ==================== INPUT PROCESSING - KEY IMPROVEMENT ====================
function startInputProcessor() {
    if (inputInterval) return;
    
    inputInterval = setInterval(() => {
        processInputQueue();
    }, INPUT_THROTTLE);
}

function stopInputProcessor() {
    if (inputInterval) {
        clearInterval(inputInterval);
        inputInterval = null;
    }
    inputQueue = [];
}

function queueInput(playerId, direction) {
    const now = Date.now();
    
    // Intelligent throttling prevents blocking
    if (now - lastInputTime >= INPUT_THROTTLE || inputQueue.length === 0) {
        inputQueue.push({ playerId, direction });
        lastInputTime = now;
    } else {
        // Replace last input to prevent queue overflow
        if (inputQueue.length > 0) {
            inputQueue[inputQueue.length - 1] = { playerId, direction };
        }
    }
}

function processInputQueue() {
    if (inputQueue.length === 0 || !isGameRunning) return;

    // Send only the most recent input
    const input = inputQueue.shift();
    sendToServer('input', input);
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

    // Walls
    const wallMat = new BABYLON.StandardMaterial("wallMat", scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.4);
    wallMat.alpha = 0.3;

    const leftWall = BABYLON.MeshBuilder.CreateBox("leftWall", 
        { width: 0.5, height: 3, depth: fieldDepth }, scene);
    leftWall.position.x = -fieldWidth / 2;
    leftWall.position.y = 1.5;
    leftWall.material = wallMat;

    const rightWall = BABYLON.MeshBuilder.CreateBox("rightWall", 
        { width: 0.5, height: 3, depth: fieldDepth }, scene);
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
    player1Paddle = BABYLON.MeshBuilder.CreateBox("player", 
        { width: 4, height: 0.8, depth: 0.8 }, scene);
    const player1PaddleMat = new BABYLON.StandardMaterial("playerMat", scene);
    player1PaddleMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
    player1PaddleMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    player1Paddle.material = player1PaddleMat;
    player1Paddle.position.z = state.player1.z;
    player1Paddle.position.y = state.player1.y;
    player1Paddle.position.x = state.player1.x;

    // Player2 paddle (red)
    player2Paddle = BABYLON.MeshBuilder.CreateBox("ai", 
        { width: 4, height: 0.8, depth: 0.8 }, scene);
    const player2PaddleMat = new BABYLON.StandardMaterial("aiMat", scene);
    player2PaddleMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3);
    player2PaddleMat.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
    player2Paddle.material = player2PaddleMat;
    player2Paddle.position.z = state.player2.z;
    player2Paddle.position.y = state.player2.y;
    player2Paddle.position.x = state.player2.x;

    // Start render loop
    engine.runRenderLoop(() => {
        if (scene) {
            scene.render();
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (engine) {
            engine.resize();
        }
    });

    // Initial state update
    updateGameState(state);
}

// ==================== GAME STATE UPDATE ====================
function updateGameState(state) {
    if (!player1Paddle || !player2Paddle || !ball || !state) return;

    player1Paddle.position.x = state.player1.x;
    player2Paddle.position.x = state.player2.x;

    ball.position.x = state.ball.x;
    ball.position.z = state.ball.z;

    // Update scores
    updateScores(state.player1.score, state.player2.score);
}

// ==================== INPUT HANDLING ====================
const keys = {};

window.addEventListener('keydown', (e) => {
    if (keys[e.key]) return; // Prevent key repeat
    keys[e.key] = true;
    handleInput(e.key);
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function handleInput(key) {
    if (!isGameRunning) return;

    if (gameMode === 'local') {
        // Player 1: A/D
        if (key === 'd' || key === 'D') {
            queueInput('player1', 'left');
        } else if (key === 'a' || key === 'A') {
            queueInput('player1', 'right');
        }
        // Player 2: J/L
        else if (key === 'l' || key === 'L') {
            queueInput('player2', 'left');
        } else if (key === 'j' || key === 'J') {
            queueInput('player2', 'right');
        }
    } else {
        // Solo or Remote mode
        if (key === 'd' || key === 'D' || key === 'ArrowLeft') {
            queueInput(playerId, 'left');
        } else if (key === 'a' || key === 'A' || key === 'ArrowRight') {
            queueInput(playerId, 'right');
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
    hideModeSelection();
    showMatchmaking();
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
        resetGame();
        gameMode = 'remote';
        sendToServer('selectMode', { mode: 'remote' });
        showMatchmaking();
        showStatus("Searching for opponent...", "waiting");
    } else {
        sendToServer('restartGame');
        showStatus("Restarting game...", "waiting");
    }
});

mainMenuBtn.addEventListener('click', () => {
    hideGameOver();
    resetGame();
});

cancelMatchmakingBtn.addEventListener('click', () => {
    sendToServer('leaveQueue');
    hideMatchmaking();
    resetGame();
});

// ==================== GAME RESET ====================
function resetGame() {
    stopInputProcessor();
    stopPingInterval();
    
    // Dispose Babylon scene
    if (scene) {
        scene.dispose();
        scene = null;
    }
    if (engine) {
        engine.stopRenderLoop();
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

    // Reset UI
    hideGame();
    hideMatchmaking();
    hideGameOver();
    showModeSelection();
    updateScores(0, 0);
    
    // Restart ping if still connected
    if (socket && socket.readyState === WebSocket.OPEN) {
        startPingInterval();
    }
}

// ==================== INITIALIZATION ====================
connectWebSocket();

// Prevent accidental page unload during game
window.addEventListener('beforeunload', (e) => {
    if (isGameRunning) {
        e.preventDefault();
        e.returnValue = 'Game in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});

console.log('🎮 3D Pong Game Client Initialized - Production Ready');