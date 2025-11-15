// Room class - Manages individual DJ room state
class Room {
  constructor(id, name, host, settings = {}) {
    this.id = id; // Unique room ID (UUID)
    this.name = name; // Display name
    this.host = host; // Username of creator
    this.createdAt = Date.now();
    this.users = new Map(); // socketId → user object

    // Room settings
    this.settings = {
      maxUsers: settings.maxUsers || 10,
      isPublic: settings.isPublic !== false,
      password: settings.password || null,
    };

    // Room state - Audio playback
    this.currentPlayback = {
      url: null,
      playing: false,
      currentTime: 0,
      startedAt: null,
    };

    // Canvas state (optional - for persistence)
    this.canvasState = [];
  }

  /**
   * Add a user to the room
   * @param {string} socketId - Socket ID
   * @param {string} username - Username
   * @throws {Error} If room is full
   */
  addUser(socketId, username) {
    if (this.users.size >= this.settings.maxUsers) {
      throw new Error('Room is full');
    }
    this.users.set(socketId, {
      username,
      joinedAt: Date.now(),
    });
  }

  /**
   * Remove a user from the room
   * @param {string} socketId - Socket ID
   * @returns {boolean} True if room should be deleted (empty)
   */
  removeUser(socketId) {
    const user = this.users.get(socketId);
    this.users.delete(socketId);

    // If room is empty, signal for deletion
    if (this.users.size === 0) {
      return true;
    }

    // If host left, transfer host to oldest user
    if (user && user.username === this.host) {
      const oldestUser = Array.from(this.users.values()).sort(
        (a, b) => a.joinedAt - b.joinedAt
      )[0];
      if (oldestUser) {
        this.host = oldestUser.username;
        console.log(`Host transferred to ${this.host} in room ${this.id}`);
      }
    }

    return false;
  }

  /**
   * Get current user count
   * @returns {number}
   */
  getUserCount() {
    return this.users.size;
  }

  /**
   * Check if a user is the host
   * @param {string} username - Username to check
   * @returns {boolean}
   */
  isHost(username) {
    return this.host === username;
  }

  /**
   * Update room settings (host only in actual implementation)
   * @param {Object} newSettings - New settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Convert room to JSON for client transmission
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      userCount: this.getUserCount(),
      maxUsers: this.settings.maxUsers,
      isPublic: this.settings.isPublic,
      hasPassword: !!this.settings.password,
      createdAt: this.createdAt,
    };
  }

  /**
   * Get list of usernames in room
   * @returns {Array<string>}
   */
  getUsernames() {
    return Array.from(this.users.values()).map((u) => u.username);
  }
}

module.exports = Room;
