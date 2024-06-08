const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  board: {
    type: String,
    required: true,
  },
  moves: [
    {
      type: Object,
    },
  ],
});

const Game = mongoose.model("Game", gameSchema);

module.exports = Game;
