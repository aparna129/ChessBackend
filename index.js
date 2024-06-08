const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const User = require("./models/User");
const Game = require("./models/Game");

app.use(express.json());

app.use(cors());

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  res.status(201).send("User registered");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ userId: user._id }, "secret");
    res.status(200).json({ token });
  } else {
    res.status(401).send("Invalid credentials");
  }
});

app.post("/game/create", async (req, res) => {
  const { token } = req.body;
  const decoded = jwt.verify(token, "secret");
  const game = new Game({
    players: [decoded.userId],
    board: initialBoardState,
  });
  await game.save();
  res.status(201).json({ gameId: game._id });
});

app.post("/game/join", async (req, res) => {
  const { token, gameId } = req.body;
  const decoded = jwt.verify(token, "secret");
  const game = await Game.findById(gameId);
  if (game.players.length < 2) {
    game.players.push(decoded.userId);
    await game.save();
    res.status(200).send("Joined game");
  } else {
    res.status(400).send("Game is full");
  }
});

app.post("/game/move", async (req, res) => {
  const { token, gameId, move } = req.body;
  const decoded = jwt.verify(token, "secret");
  const game = await Game.findById(gameId);
  game.moves.push(move);
  game.board = updateBoard(game.board, move);
  await game.save();
  io.to(gameId).emit("move", move);
  res.status(200).send("Move recorded");
});

app.get("/game/state", async (req, res) => {
  const { gameId } = req.query;
  const game = await Game.findById(gameId);
  res.status(200).json(game);
});

app.get("/game/history", async (req, res) => {
  const { gameId } = req.query;
  const game = await Game.findById(gameId);
  res.status(200).json(game.moves);
});

io.on("connection", (socket) => {
  socket.on("join", (gameId) => {
    socket.join(gameId);
  });

  socket.on("move", (gameId, move) => {
    io.to(gameId).emit("move", move);
  });
});

app.get("/", (req, res) => {
  res.send("Chess Game");
});

app.listen(process.env.PORT, () => {
  mongoose
    .connect(process.env.MONGODB_URL)
    .then(() => console.log("Database and Server connected successfully"))
    .catch((error) => console.log(error));
});
