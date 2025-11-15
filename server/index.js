const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

  // Broadcast new audio to all clients
  io.emit('new audio', fileInfo);

  res.json(fileInfo);
});

// Room state
let numUsers = 0;
let currentPlayback = {
  url: null,
  playing: false,
  currentTime: 0,
  startedAt: null,
};

io.on('connection', (socket) => {
  let addedUser = false;

  console.log('User connected:', socket.id);

  // Send current playback state to new user
  if (currentPlayback.url) {
    socket.emit('sync playback', currentPlayback);
  }

  // Chat: Add user
  socket.on('add user', (username) => {
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    addedUser = true;

    socket.emit('login', { numUsers });
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers,
    });
  });

  // Chat: New message
  socket.on('new message', (data) => {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data,
    });
  });

  // Chat: Typing indicators
  socket.on('typing', () => {
    socket.broadcast.emit('typing', { username: socket.username });
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', { username: socket.username });
  });

  // Whiteboard: Drawing events
  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data);
  });

  socket.on('clear canvas', () => {
    socket.broadcast.emit('clear canvas');
  });

  // Audio playback synchronization
  socket.on('play audio', (data) => {
    currentPlayback = {
      url: data.url,
      playing: true,
      currentTime: 0,
      startedAt: Date.now(),
    };
    socket.broadcast.emit('play audio', data);
  });

  socket.on('pause audio', (data) => {
    currentPlayback.playing = false;
    currentPlayback.currentTime = data.currentTime;
    socket.broadcast.emit('pause audio', data);
  });

  socket.on('seek audio', (data) => {
    if (currentPlayback.playing) {
      currentPlayback.startedAt = Date.now() - data.currentTime * 1000;
    } else {
      currentPlayback.currentTime = data.currentTime;
    }
    socket.broadcast.emit('seek audio', data);
  });

  socket.on('stop audio', () => {
    currentPlayback = {
      url: null,
      playing: false,
      currentTime: 0,
      startedAt: null,
    };
    socket.broadcast.emit('stop audio');
  });

  // Push-to-talk voice
  socket.on('voice start', () => {
    socket.broadcast.emit('voice start', {
      userId: socket.id,
      username: socket.username,
    });
  });

  socket.on('voice data', (audioData) => {
    socket.broadcast.emit('voice data', { userId: socket.id, audioData });
  });

  socket.on('voice end', () => {
    socket.broadcast.emit('voice end', { userId: socket.id });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers,
      });
    }
    console.log('User disconnected:', socket.id);
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
