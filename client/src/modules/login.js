// Login module - Refactored with factory pattern
import { socket } from './socket.js';
import { pageManager } from '../core/PageManager.js';
import { appState } from '../core/State.js';

const usernameInput = document.querySelector('.username-input');
const loginBtn = document.querySelector('.login-btn');

export function initLogin(onLoginSuccess) {
  // Register pages
  pageManager
    .register('login', '.login-page')
    .register('room', '.room-page')
    .show('login');

  // Event listeners
  loginBtn.addEventListener('click', () => login(onLoginSuccess));
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login(onLoginSuccess);
  });

  // Socket event
  socket.on('login', (data) => {
    appState.update({
      connected: true,
      username: usernameInput.value.trim(),
      userCount: data.numUsers,
    });

    pageManager.show('room');
    onLoginSuccess(data);
  });
}

function login(callback) {
  const name = usernameInput.value.trim();
  if (name) {
    appState.set('username', name);
    socket.emit('add user', name);
  }
}

// Getters using state
export const getUsername = () => appState.get('username');
export const isConnected = () => appState.get('connected');
export const setConnected = (value) => appState.set('connected', value);
