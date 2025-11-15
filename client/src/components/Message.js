// Message Component - Chat message factory

import { Component } from '../core/Component.js';
import { escapeHtml } from '../modules/utils.js';

export class Message extends Component {
  constructor(options = {}) {
    super('div', { className: 'message' });

    if (options.type === 'system') {
      this.addClass('message system');
      this.setText(options.text);
    } else if (options.type === 'typing') {
      this.addClass('typing-indicator');
      this.setText(`${options.username} is typing...`);
    } else {
      // Regular message
      if (options.isOwn) this.addClass('message own');

      const username = new Component('div', {
        className: 'username',
        html: escapeHtml(options.username),
      });

      const text = new Component('div', {
        className: 'text',
        html: escapeHtml(options.text),
      });

      this.append(username, text);
    }
  }

  static system(text) {
    return new Message({ type: 'system', text });
  }

  static typing(username) {
    return new Message({ type: 'typing', username });
  }

  static user(username, text, isOwn = false) {
    return new Message({ username, text, isOwn });
  }
}
