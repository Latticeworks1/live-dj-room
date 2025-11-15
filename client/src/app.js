// Main application entry point - Factory pattern + Puter.js auth
import { initAuth } from './modules/auth.js';
import { initChat, addSystemMessage, updateUserCount } from './modules/chat.js';
import { initWhiteboard } from './modules/whiteboard.js';
import { initAudio } from './modules/audio.js';
import { initVoice } from './modules/voice.js';

// Initialize the application
(async function() {
  'use strict';

  // Initialize chat and audio (doesn't require auth)
  initChat();
  initAudio();

  // Initialize Puter.js authentication
  await initAuth((data) => {
    // Callback on successful auth
    updateUserCount(data.numUsers);
    addSystemMessage('Welcome to the Live DJ Room!');
    initWhiteboard();
    initVoice();
  });

})();
