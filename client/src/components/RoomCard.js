// Room Card Component
export class RoomCard {
  static create(room, onJoin) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.dataset.roomId = room.id;

    const isFull = room.userCount >= room.maxUsers;

    card.innerHTML = `
      <div class="room-card-header">
        <h3 class="room-name">${escapeHtml(room.name)}</h3>
        <span class="room-status">
          ${room.userCount}/${room.maxUsers}
          ${room.hasPassword ? '🔒' : '🌐'}
        </span>
      </div>
      <div class="room-card-body">
        <p class="room-host">Host: ${escapeHtml(room.host)}</p>
        <p class="room-age">Created ${timeAgo(room.createdAt)}</p>
      </div>
      <button class="btn-join-room" ${isFull ? 'disabled' : ''}>
        ${isFull ? 'Full' : 'Join'}
      </button>
    `;

    if (!isFull) {
      const joinBtn = card.querySelector('.btn-join-room');
      joinBtn.addEventListener('click', () => onJoin(room.id));
    }

    return card;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
