// Audio Player module
import { socket } from './socket.js';
import { addSystemMessage } from './chat.js';

const audioFileInput = document.getElementById('audio-file-input');
const mainAudio = document.getElementById('main-audio');
const playlistItems = document.querySelector('.playlist-items');

export function initAudio() {
  audioFileInput.addEventListener('change', handleFileUpload);

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

  // Socket events
  socket.on('new audio', (fileInfo) => {
    addPlaylistItem(fileInfo);
    addSystemMessage(`New audio available: ${fileInfo.originalName}`);
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
}

async function handleFileUpload(e) {
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
}

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
