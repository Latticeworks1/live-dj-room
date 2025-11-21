import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import '../styles/VoiceChat.css';

const VoiceChat = () => {
  const { socket } = useSocket();
  const [isPushing, setIsPushing] = useState(false);
  const [isTalking, setIsTalking] = useState<{ [username: string]: boolean }>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleVoiceStart = (data: { username: string }) => {
      console.log('[Voice] User started talking:', data.username);
      setIsTalking((prev) => ({ ...prev, [data.username]: true }));
    };

    const handleVoiceData = async (data: { username: string; audio: ArrayBuffer }) => {
      console.log('[Voice] Received voice data from:', data.username);

      try {
        // Convert ArrayBuffer to Blob
        const audioBlob = new Blob([data.audio], { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio
        const audio = new Audio(audioUrl);
        await audio.play();

        // Clean up
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      } catch (error) {
        console.error('[Voice] Error playing audio:', error);
      }
    };

    const handleVoiceEnd = (data: { username: string }) => {
      console.log('[Voice] User stopped talking:', data.username);
      setIsTalking((prev) => ({ ...prev, [data.username]: false }));
    };

    socket.on('voice start', handleVoiceStart);
    socket.on('voice data', handleVoiceData);
    socket.on('voice end', handleVoiceEnd);

    return () => {
      socket.off('voice start', handleVoiceStart);
      socket.off('voice data', handleVoiceData);
      socket.off('voice end', handleVoiceEnd);

      // Clean up media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [socket]);

  const startRecording = async () => {
    if (!socket) return;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Combine audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Send to server
        socket.emit('voice data', arrayBuffer);
        socket.emit('voice end');

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      // Start recording
      mediaRecorder.start();
      setIsPushing(true);

      // Notify server
      socket.emit('voice start');
    } catch (error) {
      console.error('[Voice] Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsPushing(false);
    }
  };

  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    stopRecording();
  };

  const talkingUsers = Object.entries(isTalking)
    .filter(([_, talking]) => talking)
    .map(([username]) => username);

  return (
    <div className="voice-chat-container">
      <h3>Voice Chat (Push to Talk)</h3>

      <div className="voice-status">
        {talkingUsers.length > 0 ? (
          <div className="talking-indicator">
            {talkingUsers.map((username) => (
              <div key={username} className="talking-user">
                🎤 {username}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-voice">No one talking</p>
        )}
      </div>

      <button
        className={`btn-voice ${isPushing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {isPushing ? '🔴 Recording...' : '🎙️ Hold to Talk'}
      </button>

      <p className="voice-hint">Hold the button to speak, release to send</p>
    </div>
  );
};

export default VoiceChat;
