// Chat module - Refactored with components
import { socket } from './socket.js';
import { Message } from '../components/Message.js';
import { getUsername, isConnected } from './auth.js';
import { appState } from '../core/State.js';

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
      Message.typing(data.username).mount(messagesEl);
      scrollToBottom();
    }
  });

  socket.on('stop typing', () => {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
  });

  // Subscribe to userCount state changes to update UI
  appState.subscribe('userCount', (count) => {
    userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
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
  Message.user(user, message, isOwn).mount(messagesEl);
  scrollToBottom();
}

export function addSystemMessage(message) {
  Message.system(message).mount(messagesEl);
  scrollToBottom();
}

export function updateUserCount(count) {
  appState.set('userCount', count);
  userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
