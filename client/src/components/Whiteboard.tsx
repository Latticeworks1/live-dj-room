import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import '../styles/Whiteboard.css';

interface DrawData {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
}

const Whiteboard = () => {
  const { socket } = useSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!socket || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const handleDrawing = (data: DrawData) => {
      if (!ctx) return;

      // Scale normalized coordinates (0-1) to canvas size
      const x0 = data.x0 * canvas.width;
      const y0 = data.y0 * canvas.height;
      const x1 = data.x1 * canvas.width;
      const y1 = data.y1 * canvas.height;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    const handleClearCanvas = () => {
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('drawing', handleDrawing);
    socket.on('clear canvas', handleClearCanvas);

    return () => {
      socket.off('drawing', handleDrawing);
      socket.off('clear canvas', handleClearCanvas);
    };
  }, [socket]);

  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, emit: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (emit && socket) {
      // Normalize coordinates (0-1) for transmission
      const data: DrawData = {
        x0: x0 / canvas.width,
        y0: y0 / canvas.height,
        x1: x1 / canvas.width,
        y1: y1 / canvas.height,
        color,
      };
      socket.emit('drawing', data);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    lastPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawLine(lastPosRef.current.x, lastPosRef.current.y, x, y, currentColor, true);

    lastPosRef.current = { x, y };
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleClear = () => {
    if (!socket) return;
    socket.emit('clear canvas');

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

  return (
    <div className="whiteboard-container">
      <div className="whiteboard-header">
        <h3>Whiteboard</h3>
        <div className="whiteboard-controls">
          <div className="color-palette">
            {colors.map((color) => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
          <button className="btn-secondary btn-small" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default Whiteboard;
