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
    .register('lobby', '.lobby-page')
    .register('room', '.room-page');

  // Wait for Puter to be ready
  await waitForPuter();

  // Set up sign-in button
  loginBtn.addEventListener('click', async () => {
    try {
      authStatus.textContent = 'Signing in...';
      // signIn() will redirect to Puter, then redirect back
      // On redirect back, page reloads and checkAuthStatus() runs
      await puter.auth.signIn();
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

  // Check if already signed in (handles redirect back from Puter)
  await checkAuthStatus(onAuthSuccess);
}

// Wait for Puter SDK to be ready
async function waitForPuter() {
  return new Promise((resolve) => {
    if (typeof puter !== 'undefined' && puter.auth) {
      resolve();
    } else {
      // Poll for puter to be available
      const checkInterval = setInterval(() => {
        if (typeof puter !== 'undefined' && puter.auth) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.error('Puter SDK failed to load');
        resolve();
      }, 10000);
    }
  });
}

// Check authentication status
async function checkAuthStatus(onAuthSuccess) {
  try {
    console.log('[Auth] Checking auth status...');
    if (puter.auth.isSignedIn()) {
      console.log('[Auth] User is signed in, getting user info...');
      const user = await puter.auth.getUser();
      console.log('[Auth] User info:', user);
      authStatus.textContent = `Welcome back, ${user.username}!`;
      handleAuthSuccess(user, onAuthSuccess);
    } else {
      console.log('[Auth] User is not signed in');
      authStatus.textContent = 'Sign in to join the room';
      pageManager.show('login');
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    authStatus.textContent = 'Sign in to join the room';
    pageManager.show('login');
  }
}

function handleAuthSuccess(user, callback) {
  console.log('[Auth] Handling auth success for user:', user.username);

  appState.update({
    connected: true,
    username: user.username,
  });

  currentUserEl.textContent = `Signed in as: ${user.username}`;

  console.log('[Auth] Emitting add user event to socket...');
  socket.emit('add user', user.username);

  // Socket event for login confirmation
  socket.once('login', (data) => {
    console.log('[Auth] Received login confirmation from server:', data);
    console.log('[Auth] Showing lobby page...');
    pageManager.show('lobby');
    callback(data);
  });
}

// Getters using state
export const getUsername = () => appState.get('username');
export const isConnected = () => appState.get('connected');
export const setConnected = (value) => appState.set('connected', value);
