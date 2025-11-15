// Puter.js Authentication Module
import { pageManager } from '../core/PageManager.js';
import { appState } from '../core/State.js';
import { socket } from './socket.js';

const loginBtn = document.querySelector('.login-btn');
const signOutBtn = document.getElementById('btn-signout');
const authStatus = document.getElementById('auth-status');
const currentUserEl = document.getElementById('current-user');

export async function initAuth(onAuthSuccess) {
  // Register pages
  pageManager
    .register('login', '.login-page')
    .register('room', '.room-page');

  // Set up sign-in button
  loginBtn.addEventListener('click', async () => {
    try {
      authStatus.textContent = 'Signing in...';
      await puter.auth.signIn();

      const user = await puter.auth.getUser();
      handleAuthSuccess(user, onAuthSuccess);
    } catch (error) {
      console.error('Sign in failed:', error);
      authStatus.textContent = 'Sign in failed. Please try again.';
    }
  });

  // Set up sign-out button
  signOutBtn.addEventListener('click', () => {
    puter.auth.signOut();
    appState.update({
      connected: false,
      username: '',
    });
    pageManager.show('login');
    authStatus.textContent = 'Signed out. Sign in to join the room.';
  });

  // Check if already signed in
  if (puter.auth.isSignedIn()) {
    const user = await puter.auth.getUser();
    authStatus.textContent = `Welcome back, ${user.username}!`;
    handleAuthSuccess(user, onAuthSuccess);
  } else {
    authStatus.textContent = 'Sign in to join the room';
    pageManager.show('login');
  }
}

function handleAuthSuccess(user, callback) {
  appState.update({
    connected: true,
    username: user.username,
  });

  currentUserEl.textContent = `Signed in as: ${user.username}`;
  socket.emit('add user', user.username);

  // Socket event for login confirmation
  socket.once('login', (data) => {
    appState.set('userCount', data.numUsers);
    pageManager.show('room');
    callback(data);
  });
}

// Getters using state
export const getUsername = () => appState.get('username');
export const isConnected = () => appState.get('connected');
export const setConnected = (value) => appState.set('connected', value);
