// Utility functions

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function throttle(callback, delay) {
  let previousCall = Date.now();
  return function() {
    const time = Date.now();
    if ((time - previousCall) >= delay) {
      previousCall = time;
      callback.apply(null, arguments);
    }
  };
}
