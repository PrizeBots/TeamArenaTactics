import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..')));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? '*' : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store connected players
const players = new Map();

// Track team sizes
const teams = {
  red: 0,
  green: 0
};

function assignTeam() {
  return teams.red <= teams.green ? 'red' : 'green';
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  const team = assignTeam();
  console.log(`Assigning player ${socket.id} to team ${team}`);
  teams[team]++;

  // Set initial position based on team
  const baseX = team === 'red' ? -20 : 20;
  const randomZ = Math.random() * 8 - 4;  // Random position within base
  
  // Create new player with random position and team
  const player = {
    id: socket.id,
    position: { x: baseX, y: 0.5, z: randomZ },
    team
  };
  
  console.log('Current team sizes:', teams);
  players.set(socket.id, player);
  
  // Send the new player their ID and current players list
  socket.emit('init', {
    id: socket.id,
    players: Array.from(players.values())
  });
  
  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', player);
  
  // Handle player movement
  socket.on('move', (position) => {
    const player = players.get(socket.id);
    if (player) {
      // Update player position in server state
      player.position = position;
      // Broadcast to all clients including sender for consistency
      io.emit('playerMoved', {
        id: socket.id,
        position
      });
    }
  });
  
  // Handle bullet firing
  socket.on('bulletFired', (bulletData) => {
    socket.broadcast.emit('bulletFired', {
      ...bulletData,
      playerId: socket.id
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = players.get(socket.id);
    if (player) {
      teams[player.team]--;
    }
    players.delete(socket.id);
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});