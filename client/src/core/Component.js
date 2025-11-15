// Component Factory - Creates reusable UI elements

export class Component {
  constructor(tag = 'div', options = {}) {
    this.element = document.createElement(tag);
    this.children = [];

    if (options.className) this.addClass(options.className);
    if (options.id) this.element.id = options.id;
    if (options.text) this.setText(options.text);
    if (options.html) this.setHTML(options.html);
    if (options.attributes) this.setAttributes(options.attributes);
  }

  addClass(className) {
    this.element.className = className;
    return this;
  }

  setText(text) {
    this.element.textContent = text;
    return this;
  }

  setHTML(html) {
    this.element.innerHTML = html;
    return this;
  }

  setAttributes(attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      this.element.setAttribute(key, value);
    });
    return this;
  }

  on(event, handler) {
    this.element.addEventListener(event, handler);
    return this;
  }

  append(...components) {
    components.forEach(comp => {
      const el = comp instanceof Component ? comp.element : comp;
      this.element.appendChild(el);
      if (comp instanceof Component) this.children.push(comp);
    });
    return this;
  }

  remove() {
    this.element.remove();
    this.children.forEach(child => child.remove());
    this.children = [];
  }

  show() {
    this.element.style.display = '';
    return this;
  }

  hide() {
    this.element.style.display = 'none';
    return this;
  }

  mount(parent) {
    const parentEl = parent instanceof Component ? parent.element : parent;
    parentEl.appendChild(this.element);
    return this;
  }
}

// Factory functions for common elements
export const div = (options) => new Component('div', options);
export const button = (text, options = {}) =>
  new Component('button', { ...options, text });
export const input = (options) => new Component('input', options);
export const span = (text, options = {}) =>
  new Component('span', { ...options, text });
