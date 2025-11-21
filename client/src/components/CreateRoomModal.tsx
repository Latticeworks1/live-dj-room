import { useState } from 'react';
import '../styles/CreateRoomModal.css';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (name: string, maxUsers: number, isPublic: boolean, password: string) => void;
}

const CreateRoomModal = ({ onClose, onCreate }: CreateRoomModalProps) => {
  const [name, setName] = useState('');
  const [maxUsers, setMaxUsers] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a room name');
      return;
    }

    if (!isPublic && !password.trim()) {
      alert('Please enter a password for private room');
      return;
    }

    onCreate(name.trim(), maxUsers, isPublic, password);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Room</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="room-name">Room Name</label>
            <input
              type="text"
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="max-users">Max Users</label>
            <input
              type="number"
              id="max-users"
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value) || 10)}
              min="2"
              max="50"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={!isPublic}
                onChange={(e) => setIsPublic(!e.target.checked)}
              />
              Private Room (requires password)
            </label>
          </div>

          {!isPublic && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
