const GamePong = require('../modules/GamePong');

games = new Map();

function GameController(data, connectionData) {
    switch (data.state) {
        case 'selectMode':
            selectMode(data, connectionData);
            break;
    }
}

function selectMode(data, connectionData) {
    if (!['local', 'remote', 'solo'].includes(mode)) {
        this.send('error', { message: 'Invalid game mode' });
        throw "Invalid game mode";
    }

    GamePong = new GamePong();
}