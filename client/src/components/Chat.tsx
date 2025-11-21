import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAppState } from '../contexts/AppStateContext';
import '../styles/Chat.css';

interface Message {
  username: string;
  message: string;
  isSystem?: boolean;
}

const Chat = () => {
  const { socket } = useSocket();
  const { state } = useAppState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { username: string; message: string }) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleTyping = (data: { username: string }) => {
      setTyping((prev) => {
        if (!prev.includes(data.username)) {
          return [...prev, data.username];
        }
        return prev;
      });
    };

    const handleStopTyping = (data: { username: string }) => {
      setTyping((prev) => prev.filter((u) => u !== data.username));
    };

    socket.on('new message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);

    // Add welcome message
    setMessages([{ username: 'System', message: `Welcome to ${state.currentRoomName}!`, isSystem: true }]);

    return () => {
      socket.off('new message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
    };
  }, [socket, state.currentRoomName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (!socket) return;

    // Emit typing event
    socket.emit('typing');

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop typing');
    }, 1000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (!socket || !inputValue.trim()) return;

    console.log('[Chat] Sending message:', inputValue);
    socket.emit('new message', inputValue.trim());
    setInputValue('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('stop typing');
  };

  return (
    <div className="chat-container">
      <h3>Chat</h3>

      <div className="messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.isSystem ? 'system-message' : ''} ${
              msg.username === state.username ? 'own-message' : ''
            }`}
          >
            <span className="username">{msg.username}:</span>
            <span className="message-text">{msg.message}</span>
          </div>
        ))}
        {typing.length > 0 && (
          <div className="typing-indicator">
            {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button type="submit" className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
