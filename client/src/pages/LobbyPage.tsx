import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAppState, Room } from '../contexts/AppStateContext';
import { usePuter } from '../hooks/usePuter';
import RoomCard from '../components/RoomCard';
import CreateRoomModal from '../components/CreateRoomModal';
import '../styles/LobbyPage.css';

const LobbyPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { state, setRooms, setCurrentRoom } = useAppState();
  const { user, signOut } = usePuter();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Load rooms from server
  const loadRooms = useCallback(() => {
    if (socket) {
      console.log('[Lobby] Requesting rooms list...');
      socket.emit('get rooms');
    }
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomsList = (rooms: Room[]) => {
      console.log('[Lobby] Received rooms list:', rooms);
      setRooms(rooms);
    };

    const handleRoomCreated = () => {
      console.log('[Lobby] Room created event');
      loadRooms();
    };

    const handleRoomUpdated = () => {
      console.log('[Lobby] Room updated event');
      loadRooms();
    };

    const handleRoomDeleted = () => {
      console.log('[Lobby] Room deleted event');
      loadRooms();
    };

    socket.on('rooms list', handleRoomsList);
    socket.on('room created', handleRoomCreated);
    socket.on('room updated', handleRoomUpdated);
    socket.on('room deleted', handleRoomDeleted);

    // Initial load and auto-refresh
    loadRooms();
    const interval = setInterval(loadRooms, 5000);

    return () => {
      socket.off('rooms list', handleRoomsList);
      socket.off('room created', handleRoomCreated);
      socket.off('room updated', handleRoomUpdated);
      socket.off('room deleted', handleRoomDeleted);
      clearInterval(interval);
    };
  }, [socket, loadRooms, setRooms]);

  const handleCreateRoom = (name: string, maxUsers: number, isPublic: boolean, password: string) => {
    if (!socket) return;

    const settings = {
      maxUsers,
      isPublic,
      password: !isPublic ? password : null,
    };

    console.log('[Lobby] Creating room:', name, settings);

    socket.emit('create room', { name, settings }, (response: { success: boolean; room?: Room; error?: string }) => {
      if (response.success && response.room) {
        console.log('[Lobby] Room created successfully:', response.room);
        setCurrentRoom(response.room);
        navigate(`/room/${response.room.id}`);
      } else {
        alert('Failed to create room: ' + response.error);
      }
    });

    setShowCreateModal(false);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket || isJoining) return;

    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return;

    let password: string | null = null;
    if (room.hasPassword) {
      password = prompt('Enter room password:');
      if (!password) return;
    }

    console.log('[Lobby] Joining room:', room.name);
    setIsJoining(true);

    socket.emit('join room', { roomId, password }, (response: { success: boolean; room?: Room; error?: string }) => {
      setIsJoining(false);

      if (response.success && response.room) {
        console.log('[Lobby] Joined room successfully:', response.room);
        setCurrentRoom(response.room);
        navigate(`/room/${response.room.id}`);
      } else {
        alert('Failed to join room: ' + response.error);
      }
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredRooms = state.rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h1>Live DJ Room - Lobby</h1>
        <div className="user-info">
          <span>Signed in as: {user?.username || state.username}</span>
          <button className="btn-secondary" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="lobby-controls">
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          Create Room
        </button>
        <button className="btn-secondary" onClick={loadRooms}>
          Refresh
        </button>
      </div>

      <div className="room-list">
        {filteredRooms.length === 0 ? (
          <p className="no-rooms">No rooms available. Create one!</p>
        ) : (
          filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  );
};

export default LobbyPage;
