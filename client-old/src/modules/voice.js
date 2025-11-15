// Voice Chat (Push-to-Talk) module
import { socket } from './socket.js';

const talkBtn = document.getElementById('btn-talk');
const voiceStatus = document.getElementById('voice-status');

let mediaStream;
let mediaRecorder;
let audioChunks = [];

export function initVoice() {
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

  talkBtn.addEventListener('mousedown', startTalking);
  talkBtn.addEventListener('mouseup', stopTalking);
  talkBtn.addEventListener('touchstart', startTalking);
  talkBtn.addEventListener('touchend', stopTalking);

  // Socket events
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
}

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
