const RemotePongGame = require('../modules/PongGame/RemotePongGame');

class MatchmakingService {
    constructor() {
        this.queue = [];
        this.activeGames = new Map();
    }

    addToQueue(WebSocketHandler, data) {
        console.log(`[Matchmaking] Player ${connectionId} added to queue`);

        if (this.queue.some(p => p.WebSocketHandler.connectionId === WebSocketHandler.connectionId)) {
            console.log('already queued');
            return;
        }

        const player = {
            WebSocketHandler,
            data,
            joinedAt: Date.now(),
        }

        player.timeoutID = setTimeout(() => {
            const still = this.queue.find(p => p.WebSocketHandler.connectionId === WebSocketHandler.connectionId);
            if (!still) return;
            WebSocketHandler.send(JSON.stringify({
                type: 'matchmakingTimeout',
                data: {
                    status: 'waiting',
                    position: this.queue.length
                }
            }))
        }, 30000);

        this.queue.push(player);
        socket.send(JSON.stringify({
            type: 'queueStatus',
            data: {
                status: 'waiting',
                position: this.queue.length
            }
        }));
        this.tryMatch();
    }

    tryMatch() {
        if (this.queue.length < 2) {
            return;
        }

        const player1Data = this.queue.shift();
        const player2Data = this.queue.shift();

        clearTimeout(player1Data.timeoutID);
        clearTimeout(player2Data.timeoutID);

        const gameId = `remote_${Date.now()}`;
        const game = new RemotePongGame('remote', gameId);

        game.addPlayer1(player1Data);
        game.addPlayer2(player2Data);

        this.activeGames.set(gameId, game);

        game.notify();

        console.log(`[Matchmaking] Match created: ${gameId}`);
    }

    removeFromQueue(socket) {
        const index = this.queue.findIndex(p => p.socket === socket);
        if (index !== -1) {
            this.queue.splice(index, 1);
            console.log(`[Matchmaking] Player removed from queue`);
        }
    }

    getGame(gameId) {
        return this.activeGames.get(gameId);
    }

    removeGame(gameId) {
        const game = this.activeGames.get(gameId);
        if (game) {
            game.cleanup();
            this.activeGames.delete(gameId);
            console.log(`[Matchmaking] Game ${gameId} removed`);
        }
    }

    handleDisconnect(socket) {
        this.removeFromQueue(socket);

        for (const [gameId, game] of this.activeGames.entries()) {
            if (game.players.includes(socket)) {
                game.players.forEach(playerSocket => {
                    if (playerSocket !== socket && playerSocket.readyState === 1) {
                        playerSocket.send(JSON.stringify({
                            type: 'opponentDisconnected',
                            data: { message: 'Your opponent has disconnected' }
                        }));
                    }
                });

                this.removeGame(gameId);
                break;
            }
        }
    }

    getQueueSize() {
        return this.queue.length;
    }

    getActiveGamesCount() {
        return this.activeGames.size;
    }
}

const matchmakingService = new MatchmakingService();

module.exports = matchmakingService;