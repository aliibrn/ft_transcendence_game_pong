const game_map = require("./map");

class PongGame {
  constructor(mode) {
    this.mode = mode;
    this.player = [];
    this.game_map = new game_map();
    // this.ball = 
  }

  addPlayer(player) {
    this.players.push(player);
  }
}

function createGame(mode, socket = null) {
  const game = new PongGame(mode);

  if (mode === "solo") {
    // game.addPlayer(new LocalPlayer("bottom", { left: "ArrowLeft", right: "ArrowRight" }));
    // game.addPlayer(new AIPlayer("top", game.ball));
  }
  else if (mode === "local") {
    // game.addPlayer(new LocalPlayer("bottom", { left: "ArrowLeft", right: "ArrowRight" }));
    // game.addPlayer(new LocalPlayer("top", { left: "KeyA", right: "KeyD" }));
  }
  else if (mode === "remote") {
    // game.addPlayer(new LocalPlayer("bottom", { left: "ArrowLeft", right: "ArrowRight" }));
    // game.addPlayer(new RemotePlayer("top", socket));
  }

  return game;
}

function startSoloGame(socket, games, ID) {
  games.set(ID, { gameRoom: createGame("solo") });
  // games[ID].gameRoom.StartGame();
}

module.exports = { PongGame, createGame, StartGame };