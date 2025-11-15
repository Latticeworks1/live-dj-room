// State Management - Simple reactive state

export class State {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Map();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;

    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        callback(value, oldValue);
      });
    }
  }

  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  getAll() {
    return { ...this.state };
  }
}

// Global app state
export const appState = new State({
  username: '',
  connected: false,
  typing: false,
  userCount: 0,

  // Room state
  currentRoomId: null,
  currentRoomName: '',
  currentRoomHost: '',
  isHost: false,
  rooms: [], // Array of available rooms in lobby
});
