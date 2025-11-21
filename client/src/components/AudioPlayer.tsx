import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAppState } from '../contexts/AppStateContext';
import '../styles/AudioPlayer.css';

interface PlaybackState {
  url: string | null;
  playing: boolean;
  currentTime: number;
  startedAt: number;
}

const AudioPlayer = () => {
  const { socket } = useSocket();
  const { state } = useAppState();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    url: null,
    playing: false,
    currentTime: 0,
    startedAt: 0,
  });
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleSyncPlayback = (data: PlaybackState) => {
      console.log('[Audio] Syncing playback:', data);
      setPlaybackState(data);

      if (!audioRef.current) return;

      if (data.url) {
        audioRef.current.src = data.url;

        if (data.playing) {
          // Calculate elapsed time since started
          const elapsed = (Date.now() - data.startedAt) / 1000;
          audioRef.current.currentTime = elapsed;
          audioRef.current.play();
        } else {
          audioRef.current.currentTime = data.currentTime;
        }
      }
    };

    const handlePlayAudio = (data: { url: string }) => {
      console.log('[Audio] Play audio:', data.url);
      if (!audioRef.current) return;
      audioRef.current.src = data.url;
      audioRef.current.play();
    };

    const handlePauseAudio = () => {
      console.log('[Audio] Pause audio');
      audioRef.current?.pause();
    };

    const handleSeekAudio = (data: { time: number }) => {
      console.log('[Audio] Seek audio:', data.time);
      if (!audioRef.current) return;
      audioRef.current.currentTime = data.time;
    };

    const handleStopAudio = () => {
      console.log('[Audio] Stop audio');
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      setPlaybackState({ url: null, playing: false, currentTime: 0, startedAt: 0 });
    };

    socket.on('sync playback', handleSyncPlayback);
    socket.on('play audio', handlePlayAudio);
    socket.on('pause audio', handlePauseAudio);
    socket.on('seek audio', handleSeekAudio);
    socket.on('stop audio', handleStopAudio);

    return () => {
      socket.off('sync playback', handleSyncPlayback);
      socket.off('play audio', handlePlayAudio);
      socket.off('pause audio', handlePauseAudio);
      socket.off('seek audio', handleSeekAudio);
      socket.off('stop audio', handleStopAudio);
    };
  }, [socket]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentFile(file);
    }
  };

  const handleUpload = async () => {
    if (!currentFile || !socket) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', currentFile);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log('[Audio] File uploaded:', data.filePath);

      // Emit play event
      socket.emit('play audio', data.filePath);
      setCurrentFile(null);
    } catch (error) {
      console.error('[Audio] Upload error:', error);
      alert('Failed to upload file');
    }
  };

  const handlePlay = () => {
    if (!socket || !audioRef.current?.src) return;
    socket.emit('play audio', audioRef.current.src);
  };

  const handlePause = () => {
    if (!socket) return;
    socket.emit('pause audio');
  };

  const handleStop = () => {
    if (!socket) return;
    socket.emit('stop audio');
  };

  return (
    <div className="audio-player-container">
      <h3>Audio Player</h3>

      {state.isHost && (
        <div className="audio-upload">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="file-input"
          />
          {currentFile && (
            <button className="btn-primary btn-small" onClick={handleUpload}>
              Upload & Play
            </button>
          )}
        </div>
      )}

      <audio ref={audioRef} controls className="audio-element" />

      {playbackState.url && state.isHost && (
        <div className="audio-controls">
          <button className="btn-secondary btn-small" onClick={handlePlay}>
            Play
          </button>
          <button className="btn-secondary btn-small" onClick={handlePause}>
            Pause
          </button>
          <button className="btn-danger btn-small" onClick={handleStop}>
            Stop
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
