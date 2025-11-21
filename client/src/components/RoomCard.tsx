import { Room } from '../contexts/AppStateContext';
import '../styles/RoomCard.css';

interface RoomCardProps {
  room: Room;
  onJoin: (roomId: string) => void;
}

const RoomCard = ({ room, onJoin }: RoomCardProps) => {
  return (
    <div className="room-card">
      <div className="room-header">
        <h3 className="room-name">{room.name}</h3>
        {room.hasPassword && <span className="lock-icon">🔒</span>}
        {!room.isPublic && <span className="private-badge">Private</span>}
      </div>

      <div className="room-info">
        <span className="room-host">Host: {room.host}</span>
        <span className="room-users">
          {room.userCount} / {room.maxUsers} users
        </span>
      </div>

      <button
        className="btn-join"
        onClick={() => onJoin(room.id)}
        disabled={room.userCount >= room.maxUsers}
      >
        {room.userCount >= room.maxUsers ? 'Full' : 'Join'}
      </button>
    </div>
  );
};

export default RoomCard;
