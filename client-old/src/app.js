// Main application entry point - Factory pattern + Puter.js auth
import { initAuth } from './modules/auth.js';
import { initChat, addSystemMessage, updateUserCount } from './modules/chat.js';
import { initWhiteboard } from './modules/whiteboard.js';
import { initAudio } from './modules/audio.js';
import { initVoice } from './modules/voice.js';
import { initLobby, leaveRoom } from './modules/lobby.js';
import { appState } from './core/State.js';
import { pageManager } from './core/PageManager.js';
import { router } from './core/Router.js';

// Initialize the application
(async function() {
  'use strict';

  // Register pages early
  pageManager
    .register('login', '.login-page')
    .register('lobby', '.lobby-page')
    .register('room', '.room-page');

  // Register routes
  router
    .register('/', () => {
      console.log('[Router] Navigating to login');
      pageManager.show('login');
    })
    .register('/lobby', () => {
      console.log('[Router] Navigating to lobby');
      pageManager.show('lobby');
    })
    .register('/room/:id', (params) => {
      console.log('[Router] Navigating to room:', params.id);
      pageManager.show('room');
    });

  // Initialize router (handles browser back/forward)
  router.init();

  // Initialize chat and audio (doesn't require auth)
  initChat();
  initAudio();

  // Initialize Puter.js authentication
  await initAuth((data) => {
    // Callback on successful auth - show lobby
    console.log('[App] Auth successful, initializing lobby...');
    initLobby();
  });

  // Setup leave room button
  const leaveRoomBtn = document.getElementById('btn-leave-room');
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', () => {
      console.log('[App] Leave room button clicked');
      leaveRoom();
    });
  }

  // Subscribe to room changes to initialize room features
  appState.subscribe('currentRoomId', (roomId) => {
    if (roomId) {
      // User entered a room
      console.log('[App] Entered room, initializing room features...');
      addSystemMessage(`Welcome to ${appState.get('currentRoomName')}!`);
      initWhiteboard();
      initVoice();

      // Update room name in header
      const roomNameEl = document.getElementById('current-room-name');
      if (roomNameEl) {
        roomNameEl.textContent = appState.get('currentRoomName');
      }
    }
  });

  // Subscribe to userCount changes
  appState.subscribe('userCount', (count) => {
    if (appState.get('currentRoomId')) {
      updateUserCount(count);
    }
  });

})();
