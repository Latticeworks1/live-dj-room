// Button Component - Reusable button factory

import { Component } from '../core/Component.js';

export class Button extends Component {
  constructor(text, options = {}) {
    super('button', { text, className: options.className || 'btn' });

    if (options.onClick) {
      this.on('click', options.onClick);
    }

    if (options.disabled) {
      this.element.disabled = true;
    }
  }

  disable() {
    this.element.disabled = true;
    return this;
  }

  enable() {
    this.element.disabled = false;
    return this;
  }

  setLoading(loading = true) {
    if (loading) {
      this.originalText = this.element.textContent;
      this.setText('...');
      this.disable();
    } else {
      this.setText(this.originalText || '');
      this.enable();
    }
    return this;
  }
}

// Preset button types
export const PrimaryButton = (text, onClick) =>
  new Button(text, { className: 'btn btn-primary', onClick });

export const SecondaryButton = (text, onClick) =>
  new Button(text, { className: 'btn btn-secondary', onClick });
