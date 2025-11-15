// Login module
import { socket } from './socket.js';

let username = '';
let connected = false;

const loginPage = document.querySelector('.login-page');
const roomPage = document.querySelector('.room-page');
const usernameInput = document.querySelector('.username-input');
const loginBtn = document.querySelector('.login-btn');

export function initLogin(onLoginSuccess) {
  loginBtn.addEventListener('click', () => login(onLoginSuccess));
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login(onLoginSuccess);
  });

  socket.on('login', (data) => {
    connected = true;
    loginPage.style.display = 'none';
    roomPage.style.display = 'flex';
    onLoginSuccess(data);
  });
}

function login(callback) {
  const name = usernameInput.value.trim();
  if (name) {
    username = name;
    socket.emit('add user', username);
  }
}

export function getUsername() {
  return username;
}

export function isConnected() {
  return connected;
}

export function setConnected(value) {
  connected = value;
}
