import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameManager } from './game.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.get('/', (_req, res) => res.send('Scrabble server is running'));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN }
});

const manager = new GameManager(io);

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  socket.emit('connected', { id: socket.id });

  socket.on('join_game', ({ gameId, name, playerId }) => {
    manager.joinGame(socket, gameId, name || 'Player', playerId || socket.id);
  });

  socket.on('place_tiles', (payload) => {
    manager.placeTiles(socket, payload);
  });

  socket.on('chat', ({ gameId, message }) => {
    manager.chat(socket, gameId, message);
  });

  socket.on('request_state', ({ gameId }) => {
    manager.pushState(gameId);
  });

  socket.on('disconnect', () => {
    manager.disconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Scrabble server listening on :${PORT}`);
});
