// Main application entry point
import { initLogin } from './modules/login.js';
import { initChat, addSystemMessage, updateUserCount } from './modules/chat.js';
import { initWhiteboard } from './modules/whiteboard.js';
import { initAudio } from './modules/audio.js';
import { initVoice } from './modules/voice.js';

// Initialize the application
(function() {
  'use strict';

  // Initialize chat first (doesn't require login)
  initChat();
  initAudio();

  // Initialize login and handle successful login
  initLogin((data) => {
    updateUserCount(data.numUsers);
    addSystemMessage('Welcome to the Live DJ Room!');
    initWhiteboard();
    initVoice();
  });

})();
