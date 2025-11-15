// Lobby Module - Room browsing and creation
import { socket } from './socket.js';
import { appState } from '../core/State.js';
import { pageManager } from '../core/PageManager.js';
import { router } from '../core/Router.js';
import { RoomCard } from '../components/RoomCard.js';

let refreshInterval;
let isInitialized = false;
let isJoining = false; // Prevent duplicate joins

export function initLobby() {
  // Prevent duplicate initialization
  if (isInitialized) {
    console.log('[Lobby] Already initialized, just refreshing...');
    loadRooms();
    return;
  }

  console.log('[Lobby] Initializing lobby for the first time...');
  isInitialized = true;

  const createRoomBtn = document.getElementById('btn-create-room');
  const refreshBtn = document.getElementById('btn-refresh-rooms');
  const roomNameInput = document.getElementById('room-name-input');
  const maxUsersInput = document.getElementById('max-users-input');
  const searchInput = document.getElementById('search-rooms-input');
  const privateCheckbox = document.getElementById('private-room-checkbox');
  const passwordInput = document.getElementById('room-password-input');
  const signOutBtn = document.getElementById('btn-signout-lobby');

  // Remove any existing listeners by cloning and replacing
  const newCreateBtn = createRoomBtn.cloneNode(true);
  createRoomBtn.parentNode.replaceChild(newCreateBtn, createRoomBtn);
  newCreateBtn.addEventListener('click', createRoom);

  const newRefreshBtn = refreshBtn.cloneNode(true);
  refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
  newRefreshBtn.addEventListener('click', loadRooms);

  // Toggle password input
  privateCheckbox.addEventListener('change', (e) => {
    passwordInput.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) {
      passwordInput.value = '';
    }
  });

  // Search filter
  searchInput.addEventListener('input', renderRoomList);

  // Sign out from lobby
  const newSignOutBtn = signOutBtn.cloneNode(true);
  signOutBtn.parentNode.replaceChild(newSignOutBtn, signOutBtn);
  newSignOutBtn.addEventListener('click', () => {
    puter.auth.signOut();
    appState.update({
      connected: false,
      username: '',
      currentRoomId: null,
    });
    isInitialized = false;
    router.navigate('/');
  });

  // Remove any existing socket listeners before adding new ones
  socket.off('rooms list');
  socket.off('room created');
  socket.off('room updated');
  socket.off('room deleted');

  // Socket events
  socket.on('rooms list', updateRoomList);
  socket.on('room created', (room) => {
    console.log('[Lobby] Room created:', room);
    loadRooms(); // Refresh list
  });
  socket.on('room updated', (room) => {
    console.log('[Lobby] Room updated:', room);
    loadRooms(); // Refresh list
  });
  socket.on('room deleted', ({ roomId }) => {
    console.log('[Lobby] Room deleted:', roomId);
    loadRooms(); // Refresh list
  });

  // Auto-refresh every 5 seconds
  startAutoRefresh();

  // Update user display
  const currentUserEl = document.getElementById('current-user-lobby');
  currentUserEl.textContent = `Signed in as: ${appState.get('username')}`;
}

function createRoom() {
  const roomNameInput = document.getElementById('room-name-input');
  const maxUsersInput = document.getElementById('max-users-input');
  const privateCheckbox = document.getElementById('private-room-checkbox');
  const passwordInput = document.getElementById('room-password-input');

  const name = roomNameInput.value.trim();
  if (!name) {
    alert('Please enter a room name');
    return;
  }

  const settings = {
    maxUsers: parseInt(maxUsersInput.value) || 10,
    isPublic: !privateCheckbox.checked,
    password: privateCheckbox.checked ? passwordInput.value : null,
  };

  console.log('[Lobby] Creating room:', name, settings);

  socket.emit('create room', { name, settings }, (response) => {
    if (response.success) {
      console.log('[Lobby] Room created successfully:', response.room);
      enterRoom(response.room);
    } else {
      console.error('[Lobby] Failed to create room:', response.error);
      alert('Failed to create room: ' + response.error);
    }
  });
}

function joinRoom(roomId) {
  // Prevent duplicate join requests
  if (isJoining) {
    console.log('[Lobby] Already joining a room, please wait...');
    return;
  }

  const rooms = appState.get('rooms') || [];
  const room = rooms.find((r) => r.id === roomId);
  if (!room) {
    console.error('[Lobby] Room not found:', roomId);
    return;
  }

  let password = null;
  if (room.hasPassword) {
    password = prompt('Enter room password:');
    if (!password) return;
  }

  console.log('[Lobby] Joining room:', room.name);
  isJoining = true;

  socket.emit('join room', { roomId, password }, (response) => {
    isJoining = false;

    if (response.success) {
      console.log('[Lobby] Joined room successfully:', response.room);
      enterRoom(response.room);
    } else {
      console.error('[Lobby] Failed to join room:', response.error);
      alert('Failed to join room: ' + response.error);
    }
  });
}

function enterRoom(room) {
  console.log('[Lobby] Entering room:', room);

  appState.update({
    currentRoomId: room.id,
    currentRoomName: room.name,
    currentRoomHost: room.host,
    isHost: room.host === appState.get('username'),
    userCount: room.userCount,
  });

  stopAutoRefresh();
  router.navigate(`/room/${room.id}`);
}

function loadRooms() {
  console.log('[Lobby] Requesting rooms list...');
  socket.emit('get rooms');
}

function updateRoomList(rooms) {
  console.log('[Lobby] Received rooms list:', rooms);
  appState.set('rooms', rooms);
  renderRoomList();
}

function renderRoomList() {
  const roomListEl = document.getElementById('room-list');
  const searchInput = document.getElementById('search-rooms-input');
  const rooms = appState.get('rooms') || [];
  const searchTerm = (searchInput?.value || '').toLowerCase();

  roomListEl.innerHTML = '';

  const filtered = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    roomListEl.innerHTML =
      '<p class="no-rooms">No rooms available. Create one!</p>';
    return;
  }

  filtered.forEach((room) => {
    const card = RoomCard.create(room, joinRoom);
    roomListEl.appendChild(card);
  });
}

function startAutoRefresh() {
  refreshInterval = setInterval(loadRooms, 5000);
  loadRooms(); // Initial load
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

export function leaveLobby() {
  console.log('[Lobby] Leaving lobby...');
  stopAutoRefresh();
  isInitialized = false;
}

export function leaveRoom() {
  console.log('[Lobby] Leaving current room...');
  socket.emit('leave room');

  appState.update({
    currentRoomId: null,
    currentRoomName: '',
    currentRoomHost: '',
    isHost: false,
    userCount: 0,
  });

  isJoining = false; // Reset join flag
  router.navigate('/lobby');
  loadRooms(); // Just refresh the room list
  startAutoRefresh(); // Resume auto-refresh
}
