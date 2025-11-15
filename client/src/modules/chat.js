// Chat module
import { socket } from './socket.js';
import { escapeHtml } from './utils.js';
import { getUsername, isConnected, setConnected } from './login.js';

const messagesEl = document.getElementById('messages');
const messageInput = document.querySelector('.message-input');
const sendBtn = document.querySelector('.send-btn');
const userCountEl = document.querySelector('.user-count');

let typing = false;
let lastTypingTime;
const TYPING_TIMER_LENGTH = 400;

export function initChat() {
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  messageInput.addEventListener('input', handleTyping);

  // Socket events
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
}

function handleTyping() {
  if (isConnected()) {
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
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (message && isConnected()) {
    messageInput.value = '';
    addChatMessage(getUsername(), message, true);
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

export function addSystemMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message system';
  messageEl.textContent = message;
  messagesEl.appendChild(messageEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

export function updateUserCount(count) {
  userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
}
