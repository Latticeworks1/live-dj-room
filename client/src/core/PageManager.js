// Page Manager - Handles page/view transitions

export class PageManager {
  constructor() {
    this.pages = new Map();
    this.currentPage = null;
  }

  register(name, element) {
    const el = element instanceof HTMLElement ? element :
               element.element || document.querySelector(element);
    this.pages.set(name, el);
    return this;
  }

  show(name) {
    if (!this.pages.has(name)) {
      console.error(`Page "${name}" not found`);
      return this;
    }

    // Hide all pages
    this.pages.forEach((page, pageName) => {
      if (pageName === name) {
        page.style.display = page.dataset.display || 'flex';
      } else {
        page.style.display = 'none';
      }
    });

    this.currentPage = name;
    return this;
  }

  getCurrent() {
    return this.currentPage;
  }

  get(name) {
    return this.pages.get(name);
  }
}

export const pageManager = new PageManager();
