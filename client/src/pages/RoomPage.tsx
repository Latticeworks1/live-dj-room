import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAppState } from '../contexts/AppStateContext';
import Chat from '../components/Chat';
import Whiteboard from '../components/Whiteboard';
import AudioPlayer from '../components/AudioPlayer';
import VoiceChat from '../components/VoiceChat';
import '../styles/RoomPage.css';

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { state, setCurrentRoom, updateState } = useAppState();

  useEffect(() => {
    if (!socket) return;

    // Listen for room events
    const handleUserJoined = (data: { username: string; userCount: number }) => {
      console.log('[Room] User joined:', data.username);
      updateState({ userCount: data.userCount });
    };

    const handleUserLeft = (data: { username: string; userCount: number; newHost?: string }) => {
      console.log('[Room] User left:', data.username);
      updateState({ userCount: data.userCount });

      if (data.newHost) {
        updateState({
          currentRoomHost: data.newHost,
          isHost: data.newHost === state.username,
        });
      }
    };

    socket.on('user joined', handleUserJoined);
    socket.on('user left', handleUserLeft);

    return () => {
      socket.off('user joined', handleUserJoined);
      socket.off('user left', handleUserLeft);
    };
  }, [socket, state.username, updateState]);

  const handleLeaveRoom = () => {
    if (!socket) return;

    console.log('[Room] Leaving room...');
    socket.emit('leave room');
    setCurrentRoom(null);
    navigate('/lobby');
  };

  if (!state.currentRoomId || state.currentRoomId !== roomId) {
    return (
      <div className="room-page">
        <div className="loading">Not in room or loading...</div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <div className="room-header">
        <div className="room-info">
          <h1>{state.currentRoomName}</h1>
          <span className="user-count">{state.userCount} users</span>
          <span className="host-badge">Host: {state.currentRoomHost}</span>
        </div>
        <button className="btn-danger" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>

      <div className="room-content">
        <div className="left-panel">
          <AudioPlayer />
          <Whiteboard />
        </div>

        <div className="right-panel">
          <VoiceChat />
          <Chat />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
