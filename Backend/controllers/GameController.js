const LocalPongGame = require('../modules/PongGame/LocalPongGame');
const SoloPongGame = require('../modules/PongGame/SoloPongGame');


games = new Map();

function GameController(data, WebSocketHandler) {
    switch (data.state) {
        case 'selectMode':
            selectMode(data, WebSocketHandler);
            break;
        case 'ready':
            ready(data);

        case 'input':
            handleInput(data);
            break;
    }
}

function handleInput(data) {
    const playerId = data.playerId;
    const direction = data.direction;

    if (!direction || !['left', 'right'].includes(direction)) {
        return;
    }

    switch (data.mode) {
        case 'solo':
            games.get(data.gameId).handleInput(direction);
        case 'local':
            games.get(data.gameId).handleInput(playerId, direction);
        case 'remote':
            games.get(data.gameId).handleInput(playerId, direction);
    }
}


function ready(data) {
    if (!['local', 'remote', 'solo'].includes(data.mode)) {
        throw "Invalid game mode";
    }

    switch (data.mode) {
        case 'local':
            games.get(data.gameId).markPlayerReady();
        case 'solo':
            games.get(data.gameId).markPlayerReady();
    }
}


function selectMode(data, WebSocketHandler) {
    if (!['local', 'remote', 'solo'].includes(data.mode)) {
        throw "Invalid game mode";
    }

    const gameId = `${data.mode}_${Date.now()}`;
    let game = null;
    switch (data.mode) {
        case 'local':
            game = new LocalPongGame({ gameId: gameId, mode: data.mode }, WebSocketHandler);
            games.set(gameId, game);
        case 'solo':
            game = new SoloPongGame({ gameId: gameId, mode: data.mode }, WebSocketHandler);
            games.set(gameId, game);
    }
}

module.exports = GameController;