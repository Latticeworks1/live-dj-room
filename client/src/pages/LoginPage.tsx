import { usePuter } from '../hooks/usePuter';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const { isLoading, signIn } = usePuter();

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h1>Live DJ Room</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Live DJ Room</h1>
        <p className="subtitle">Multi-room voice chat, audio sync, and collaborative whiteboard</p>

        <div className="features">
          <div className="feature">
            <span className="icon">🎵</span>
            <span>Synchronized Audio</span>
          </div>
          <div className="feature">
            <span className="icon">🎙️</span>
            <span>Push-to-Talk Voice</span>
          </div>
          <div className="feature">
            <span className="icon">🎨</span>
            <span>Collaborative Whiteboard</span>
          </div>
          <div className="feature">
            <span className="icon">💬</span>
            <span>Real-time Chat</span>
          </div>
        </div>

        <button className="btn-primary btn-large" onClick={signIn}>
          Sign in with Puter
        </button>

        <p className="info-text">
          Secure authentication powered by Puter.js
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
