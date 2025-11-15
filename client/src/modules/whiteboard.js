// Whiteboard module
import { socket } from './socket.js';
import { throttle } from './utils.js';

const canvas = document.querySelector('.whiteboard');
const context = canvas.getContext('2d');
const colors = document.querySelectorAll('.color');
const clearCanvasBtn = document.querySelector('.btn-clear-canvas');

let drawing = false;
let currentColor = 'black';
let current = { x: 0, y: 0 };

export function initWhiteboard() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseout', onMouseUp);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10));

  canvas.addEventListener('touchstart', onMouseDown);
  canvas.addEventListener('touchend', onMouseUp);
  canvas.addEventListener('touchcancel', onMouseUp);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10));

  colors.forEach(color => {
    color.addEventListener('click', () => {
      colors.forEach(c => c.classList.remove('selected'));
      color.classList.add('selected');
      currentColor = color.dataset.color;
    });
  });

  clearCanvasBtn.addEventListener('click', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear canvas');
  });

  // Socket events
  socket.on('drawing', (data) => {
    const w = canvas.width;
    const h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  });

  socket.on('clear canvas', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 40;
  canvas.height = rect.height - 120;
}

function onMouseDown(e) {
  drawing = true;
  const pos = getMousePos(e);
  current.x = pos.x;
  current.y = pos.y;
}

function onMouseUp(e) {
  if (!drawing) return;
  drawing = false;
  const pos = getMousePos(e);
  drawLine(current.x, current.y, pos.x, pos.y, currentColor, true);
}

function onMouseMove(e) {
  if (!drawing) return;
  const pos = getMousePos(e);
  drawLine(current.x, current.y, pos.x, pos.y, currentColor, true);
  current.x = pos.x;
  current.y = pos.y;
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX || e.touches[0].clientX) - rect.left,
    y: (e.clientY || e.touches[0].clientY) - rect.top
  };
}

function drawLine(x0, y0, x1, y1, color, emit) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();
  context.closePath();

  if (!emit) return;

  const w = canvas.width;
  const h = canvas.height;
  socket.emit('drawing', {
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    color: color
  });
}
