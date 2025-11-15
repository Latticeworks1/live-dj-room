const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Room = require('./Room');
const port = process.env.PORT || 3000;

// Serve static files from Parcel build output
const distPath = path.join(__dirname, '../client/dist');

if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist/ directory not found!');
  console.error('Run "npm run build" in the client directory first.');
  process.exit(1);
}

console.log(`Serving static files from: ${distPath}`);
app.use(express.static(distPath));
app.use('/uploads', express.static(path.join(__dirname, '../client/uploads')));

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../client/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|ogg|webm|m4a/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed!'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Audio upload endpoint
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileInfo = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size,
  };

  // Broadcast new audio to all clients (global for now, can be room-specific later)
  io.emit('new audio', fileInfo);

  res.json(fileInfo);
});

// Room management
const rooms = new Map(); // roomId → Room instance

// Helper: Get public rooms list for lobby
function getPublicRooms() {
  return Array.from(rooms.values())
    .filter((room) => room.settings.isPublic)
    .map((room) => room.toJSON());
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ===== LOBBY EVENTS =====

  // Add user (initial connection, set username)
  socket.on('add user', (username) => {
    socket.username = username;
    console.log(`User ${username} (${socket.id}) added`);
    socket.emit('login', { numUsers: 0 }); // Lobby doesn't have user count
  });

  // Get rooms list
  socket.on('get rooms', () => {
    const roomList = getPublicRooms();
    socket.emit('rooms list', roomList);
  });

  // Create room
  socket.on('create room', ({ name, settings }, callback) => {
    if (!socket.username) {
      return callback({ success: false, error: 'Not authenticated' });
    }

    const roomId = uuidv4();
    const room = new Room(roomId, name, socket.username, settings);
    rooms.set(roomId, room);

    console.log(`Room "${name}" created by ${socket.username} (ID: ${roomId})`);

    // Auto-join creator
    try {
      room.addUser(socket.id, socket.username);
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Notify creator
      callback({ success: true, room: room.toJSON() });

      // Broadcast new room to lobby
      io.emit('room created', room.toJSON());

      // Send room state to creator
      socket.emit('sync playback', room.currentPlayback);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Join room
  socket.on('join room', ({ roomId, password }, callback) => {
    if (!socket.username) {
      return callback({ success: false, error: 'Not authenticated' });
    }

    // If already in the requested room, return success (idempotent)
    if (socket.currentRoom === roomId) {
      const room = rooms.get(roomId);
      if (room) {
        console.log(
          `${socket.username} already in room "${roomId}" - returning success`
        );
        return callback({ success: true, room: room.toJSON() });
      }
    }

    // If in a different room, leave it first
    if (socket.currentRoom && socket.currentRoom !== roomId) {
      console.log(
        `${socket.username} leaving room "${socket.currentRoom}" to join "${roomId}"`
      );
      const currentRoom = rooms.get(socket.currentRoom);
      if (currentRoom) {
        currentRoom.removeUser(socket.id);
        socket.leave(socket.currentRoom);
        socket.to(socket.currentRoom).emit('user left', {
          username: socket.username,
          numUsers: currentRoom.getUserCount(),
        });
      }
    }

    const room = rooms.get(roomId);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Check password
    if (room.settings.password && room.settings.password !== password) {
      return callback({ success: false, error: 'Invalid password' });
    }

    // Try to add user
    try {
      room.addUser(socket.id, socket.username);
      socket.join(roomId);
      socket.currentRoom = roomId;

      console.log(`${socket.username} joined room "${room.name}"`);

      // Notify existing room users
      socket.to(roomId).emit('user joined', {
        username: socket.username,
        numUsers: room.getUserCount(),
      });

      // Send room state to new user
      socket.emit('sync playback', room.currentPlayback);

      // Confirm join to user
      callback({ success: true, room: room.toJSON() });

      // Update room list in lobby
      io.emit('room updated', room.toJSON());
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Leave room
  socket.on('leave room', () => {
    if (!socket.currentRoom) return;

    const room = rooms.get(socket.currentRoom);
    if (room) {
      const shouldDelete = room.removeUser(socket.id);

      console.log(`${socket.username} left room "${room.name}"`);

      // Notify remaining users
      socket.to(socket.currentRoom).emit('user left', {
        username: socket.username,
        numUsers: room.getUserCount(),
      });

      if (shouldDelete) {
        console.log(`Room "${room.name}" deleted (empty)`);
        rooms.delete(socket.currentRoom);
        io.emit('room deleted', { roomId: socket.currentRoom });
      } else {
        // Update room list if host changed
        io.emit('room updated', room.toJSON());
      }
    }

    socket.leave(socket.currentRoom);
    socket.currentRoom = null;
  });

  // ===== ROOM EVENTS (scoped to current room) =====

  // Helper to get current room
  const getCurrentRoom = () => {
    if (!socket.currentRoom) return null;
    return rooms.get(socket.currentRoom);
  };

  // Chat: New message
  socket.on('new message', (data) => {
    const room = getCurrentRoom();
    if (!room) return;

    socket.to(socket.currentRoom).emit('new message', {
      username: socket.username,
      message: data,
    });
  });

  // Chat: Typing indicators
  socket.on('typing', () => {
    const room = getCurrentRoom();
    if (!room) return;

    socket.to(socket.currentRoom).emit('typing', { username: socket.username });
  });

  socket.on('stop typing', () => {
    const room = getCurrentRoom();
    if (!room) return;

    socket
      .to(socket.currentRoom)
      .emit('stop typing', { username: socket.username });
  });

  // Whiteboard: Drawing events
  socket.on('drawing', (data) => {
    const room = getCurrentRoom();
    if (!room) return;

    socket.to(socket.currentRoom).emit('drawing', data);
  });

  socket.on('clear canvas', () => {
    const room = getCurrentRoom();
    if (!room) return;

    socket.to(socket.currentRoom).emit('clear canvas');
  });

  // Audio playback synchronization
  socket.on('play audio', (data) => {
    const room = getCurrentRoom();
    if (!room) return;

    room.currentPlayback = {
      url: data.url,
      playing: true,
      currentTime: 0,
      startedAt: Date.now(),
    };

    socket.to(socket.currentRoom).emit('play audio', data);
  });

  socket.on('pause audio', (data) => {
    const room = getCurrentRoom();
    if (!room) return;

    room.currentPlayback.playing = false;
    room.currentPlayback.currentTime = data.currentTime;

    socket.to(socket.currentRoom).emit('pause audio', data);
  });

  socket.on('seek audio', (data) => {
    const room = getCurrentRoom();
    if (!room) return;

    if (room.currentPlayback.playing) {
      room.currentPlayback.startedAt = Date.now() - data.currentTime * 1000;
    } else {
      room.currentPlayback.currentTime = data.currentTime;
    }

    socket.to(socket.currentRoom).emit('seek audio', data);
  });

  socket.on('stop audio', () => {
    const room = getCurrentRoom();
    if (!room) return;

    room.currentPlayback = {
      url: null,
      playing: false,
      currentTime: 0,
      startedAt: null,
    };

    socket.to(socket.currentRoom).emit('stop audio');
  });

  // Push-to-talk voice
  socket.on('voice start', () => {
    const room = getCurrentRoom();
    if (!room) return;

    socket.to(socket.currentRoom).emit('voice start', {
      userId: socket.id,
      username: socket.username,
    });
  });

  socket.on('voice data', (audioData) => {
    const room = getCurrentRoom();
    if (!room) return;

    socket
      .to(socket.currentRoom)
      .emit('voice data', { userId: socket.id, audioData });
  });

  socket.on('voice end', () => {
    const room = getCurrentRoom();
    if (!room) return;

    socket.to(socket.currentRoom).emit('voice end', { userId: socket.id });
  });

  // ===== DISCONNECT =====
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Clean up room if user was in one
    if (socket.currentRoom) {
      const room = rooms.get(socket.currentRoom);
      if (room) {
        const shouldDelete = room.removeUser(socket.id);

        socket.to(socket.currentRoom).emit('user left', {
          username: socket.username,
          numUsers: room.getUserCount(),
        });

        if (shouldDelete) {
          console.log(`Room "${room.name}" deleted (empty)`);
          rooms.delete(socket.currentRoom);
          io.emit('room deleted', { roomId: socket.currentRoom });
        } else {
          io.emit('room updated', room.toJSON());
        }
      }
    }
  });
});

http.listen(port, '0.0.0.0', () => {
  console.log('Live DJ Room server listening on port ' + port);
  console.log('Local: http://localhost:' + port);
  console.log('');
  console.log(' Access your server at:');
  console.log('   - Localhost: http://localhost:' + port);
  console.log("   - Network: Check your server's IP address");
  console.log(
    '   - With domain: Configure your domain to point to this server'
  );
  console.log('');
  console.log('️  Make sure the port is open in your firewall!');
});
