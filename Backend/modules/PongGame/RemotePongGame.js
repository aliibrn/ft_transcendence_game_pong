const PongGame = require('./PongGame')
const Player = require('../player')

class RemotePongGame extends PongGame {
    constructor(data, WebsocketHandler) {
        super(data, WebsocketHandler)
    }
}
