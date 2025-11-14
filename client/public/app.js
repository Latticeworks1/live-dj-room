(function() {
  'use strict';

  const socket = io();

  // DOM Elements
  const loginPage = document.querySelector('.login-page');
  const roomPage = document.querySelector('.room-page');
  const usernameInput = document.querySelector('.username-input');
  const loginBtn = document.querySelector('.login-btn');
  const userCountEl = document.querySelector('.user-count');
  const messagesEl = document.getElementById('messages');
  const messageInput = document.querySelector('.message-input');
  const sendBtn = document.querySelector('.send-btn');
  const canvas = document.querySelector('.whiteboard');
  const context = canvas.getContext('2d');
  const colors = document.querySelectorAll('.color');
  const clearCanvasBtn = document.querySelector('.btn-clear-canvas');
  const audioFileInput = document.getElementById('audio-file-input');
  const mainAudio = document.getElementById('main-audio');
  const playlistItems = document.querySelector('.playlist-items');
  const talkBtn = document.getElementById('btn-talk');
  const voiceStatus = document.getElementById('voice-status');

  // State
  let username = '';
  let connected = false;
  let typing = false;
  let lastTypingTime;
  const TYPING_TIMER_LENGTH = 400;

  // Whiteboard state
  let drawing = false;
  let currentColor = 'black';
  let current = { x: 0, y: 0 };

  // Voice state
  let mediaStream;
  let mediaRecorder;
  let audioChunks = [];

  // ===== LOGIN =====
  loginBtn.addEventListener('click', login);
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });

  function login() {
    const name = usernameInput.value.trim();
    if (name) {
      username = name;
      socket.emit('add user', username);
    }
  }

  socket.on('login', (data) => {
    connected = true;
    loginPage.style.display = 'none';
    roomPage.style.display = 'flex';
    updateUserCount(data.numUsers);
    addSystemMessage('Welcome to the Live DJ Room!');
    initializeWhiteboard();
    initializeVoice();
  });

  // ===== CHAT =====
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  messageInput.addEventListener('input', () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = Date.now();
      setTimeout(() => {
        const typingTimer = Date.now();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  });

  function sendMessage() {
    const message = messageInput.value.trim();
    if (message && connected) {
      messageInput.value = '';
      addChatMessage(username, message, true);
      socket.emit('new message', message);
      socket.emit('stop typing');
      typing = false;
    }
  }

  function addChatMessage(user, message, isOwn = false) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message' + (isOwn ? ' own' : '');
    messageEl.innerHTML = `
      <div class="username">${escapeHtml(user)}</div>
      <div class="text">${escapeHtml(message)}</div>
    `;
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addSystemMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message system';
    messageEl.textContent = message;
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateUserCount(count) {
    userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Socket events for chat
  socket.on('new message', (data) => {
    addChatMessage(data.username, data.message);
  });

  socket.on('user joined', (data) => {
    updateUserCount(data.numUsers);
    addSystemMessage(`${data.username} joined the room`);
  });

  socket.on('user left', (data) => {
    updateUserCount(data.numUsers);
    addSystemMessage(`${data.username} left the room`);
  });

  socket.on('typing', (data) => {
    const indicator = document.querySelector('.typing-indicator');
    if (!indicator) {
      const el = document.createElement('div');
      el.className = 'typing-indicator';
      el.textContent = `${data.username} is typing...`;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  socket.on('stop typing', () => {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
  });

  // ===== WHITEBOARD =====
  function initializeWhiteboard() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseout', onMouseUp);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10));

    canvas.addEventListener('touchstart', onMouseDown);
    canvas.addEventListener('touchend', onMouseUp);
    canvas.addEventListener('touchcancel', onMouseUp);
    canvas.addEventListener('touchmove', throttle(onMouseMove, 10));

    colors.forEach(color => {
      color.addEventListener('click', () => {
        colors.forEach(c => c.classList.remove('selected'));
        color.classList.add('selected');
        currentColor = color.dataset.color;
      });
    });

    clearCanvasBtn.addEventListener('click', () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit('clear canvas');
    });
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 40;
    canvas.height = rect.height - 120;
  }

  function onMouseDown(e) {
    drawing = true;
    const pos = getMousePos(e);
    current.x = pos.x;
    current.y = pos.y;
  }

  function onMouseUp(e) {
    if (!drawing) return;
    drawing = false;
    const pos = getMousePos(e);
    drawLine(current.x, current.y, pos.x, pos.y, currentColor, true);
  }

  function onMouseMove(e) {
    if (!drawing) return;
    const pos = getMousePos(e);
    drawLine(current.x, current.y, pos.x, pos.y, currentColor, true);
    current.x = pos.x;
    current.y = pos.y;
  }

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX || e.touches[0].clientX) - rect.left,
      y: (e.clientY || e.touches[0].clientY) - rect.top
    };
  }

  function drawLine(x0, y0, x1, y1, color, emit) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();
    context.closePath();

    if (!emit) return;

    const w = canvas.width;
    const h = canvas.height;
    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }

  function throttle(callback, delay) {
    let previousCall = Date.now();
    return function() {
      const time = Date.now();
      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  socket.on('drawing', (data) => {
    const w = canvas.width;
    const h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  });

  socket.on('clear canvas', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  });

  // ===== AUDIO PLAYER =====
  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('/upload-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      addSystemMessage(`You uploaded: ${data.originalName}`);
    } catch (error) {
      addSystemMessage('Error uploading audio: ' + error.message);
    }

    e.target.value = '';
  });

  socket.on('new audio', (fileInfo) => {
    addPlaylistItem(fileInfo);
    addSystemMessage(`New audio available: ${fileInfo.originalName}`);
  });

  function addPlaylistItem(fileInfo) {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    item.textContent = fileInfo.originalName;
    item.addEventListener('click', () => {
      mainAudio.src = fileInfo.url;
      mainAudio.play();
      socket.emit('play audio', { url: fileInfo.url });
    });
    playlistItems.appendChild(item);
  }

  // Audio sync events
  mainAudio.addEventListener('play', () => {
    if (!mainAudio.src) return;
    socket.emit('play audio', { url: mainAudio.src });
  });

  mainAudio.addEventListener('pause', () => {
    if (!mainAudio.src) return;
    socket.emit('pause audio', { currentTime: mainAudio.currentTime });
  });

  mainAudio.addEventListener('seeked', () => {
    if (!mainAudio.src) return;
    socket.emit('seek audio', { currentTime: mainAudio.currentTime });
  });

  socket.on('play audio', (data) => {
    if (mainAudio.src !== data.url) {
      mainAudio.src = data.url;
    }
    mainAudio.play().catch(e => console.log('Auto-play blocked:', e));
  });

  socket.on('pause audio', (data) => {
    mainAudio.currentTime = data.currentTime;
    mainAudio.pause();
  });

  socket.on('seek audio', (data) => {
    mainAudio.currentTime = data.currentTime;
  });

  socket.on('stop audio', () => {
    mainAudio.pause();
    mainAudio.src = '';
  });

  socket.on('sync playback', (data) => {
    if (data.url && data.playing) {
      mainAudio.src = data.url;
      const elapsed = (Date.now() - data.startedAt) / 1000;
      mainAudio.currentTime = elapsed;
      mainAudio.play().catch(e => console.log('Auto-play blocked:', e));
    }
  });

  // ===== VOICE CHAT (Push-to-Talk) =====
  function initializeVoice() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaStream = stream;
        talkBtn.disabled = false;
        updateVoiceStatus('Microphone ready. Hold button to talk.');
      })
      .catch(err => {
        console.error('Microphone access denied:', err);
        talkBtn.disabled = true;
        updateVoiceStatus('Microphone access denied.');
      });
  }

  talkBtn.addEventListener('mousedown', startTalking);
  talkBtn.addEventListener('mouseup', stopTalking);
  talkBtn.addEventListener('touchstart', startTalking);
  talkBtn.addEventListener('touchend', stopTalking);

  function startTalking() {
    if (!mediaStream) return;

    talkBtn.classList.add('talking');
    talkBtn.textContent = 'Talking...';
    audioChunks = [];

    socket.emit('voice start');

    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioBlob.arrayBuffer().then(buffer => {
        socket.emit('voice data', new Uint8Array(buffer));
      });
      socket.emit('voice end');
    };

    mediaRecorder.start();
    updateVoiceStatus('You are talking...');
  }

  function stopTalking() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      talkBtn.classList.remove('talking');
      talkBtn.textContent = 'Push to Talk';
      updateVoiceStatus('Microphone ready. Hold button to talk.');
    }
  }

  function updateVoiceStatus(message) {
    voiceStatus.textContent = message;
  }

  // Voice events from other users
  socket.on('voice start', (data) => {
    const indicator = document.createElement('div');
    indicator.className = 'voice-indicator active';
    indicator.id = 'voice-' + data.userId;
    indicator.textContent = `${data.username} is talking...`;
    voiceStatus.appendChild(indicator);
  });

  socket.on('voice data', (data) => {
    const audio = new Audio();
    const blob = new Blob([data.audioData], { type: 'audio/webm' });
    audio.src = URL.createObjectURL(blob);
    audio.play().catch(e => console.log('Voice playback error:', e));
  });

  socket.on('voice end', (data) => {
    const indicator = document.getElementById('voice-' + data.userId);
    if (indicator) {
      indicator.remove();
    }
  });

})();
