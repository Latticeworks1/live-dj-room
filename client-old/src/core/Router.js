// Router - Client-side routing with History API
import { pageManager } from './PageManager.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.isNavigating = false;
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/lobby', '/room/:id')
   * @param {Function} handler - Handler function called when route matches
   */
  register(path, handler) {
    this.routes.set(path, {
      pattern: this.pathToRegex(path),
      handler,
    });
    return this;
  }

  /**
   * Convert path pattern to regex
   * @param {string} path - Path pattern
   * @returns {RegExp}
   */
  pathToRegex(path) {
    // Convert :param to named capture groups
    const pattern = path.replace(/:\w+/g, '([^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract params from path
   * @param {string} path - Path pattern
   * @param {string} url - Actual URL
   * @returns {Object} - Params object
   */
  extractParams(path, url) {
    const paramNames = [];
    const matches = path.match(/:\w+/g);
    if (matches) {
      matches.forEach((match) => paramNames.push(match.slice(1)));
    }

    const route = this.routes.get(path);
    const values = url.match(route.pattern);

    const params = {};
    if (values) {
      paramNames.forEach((name, index) => {
        params[name] = values[index + 1];
      });
    }

    return params;
  }

  /**
   * Navigate to a path
   * @param {string} path - Path to navigate to
   * @param {Object} state - State to pass
   */
  navigate(path, state = {}) {
    if (this.isNavigating) {
      console.log('[Router] Already navigating, skipping...');
      return;
    }

    this.isNavigating = true;
    console.log('[Router] Navigating to:', path);

    // Update browser URL
    window.history.pushState(state, '', path);

    // Handle the route
    this.handleRoute(path, state);

    setTimeout(() => {
      this.isNavigating = false;
    }, 100);
  }

  /**
   * Replace current route (no history entry)
   * @param {string} path - Path to navigate to
   * @param {Object} state - State to pass
   */
  replace(path, state = {}) {
    console.log('[Router] Replacing route with:', path);

    // Update browser URL without adding history entry
    window.history.replaceState(state, '', path);

    // Handle the route
    this.handleRoute(path, state);
  }

  /**
   * Handle a route
   * @param {string} path - Path to handle
   * @param {Object} state - State object
   */
  handleRoute(path, state = {}) {
    console.log('[Router] Handling route:', path);

    // Find matching route
    for (const [routePath, route] of this.routes) {
      if (route.pattern.test(path)) {
        const params = this.extractParams(routePath, path);
        console.log('[Router] Matched route:', routePath, 'with params:', params);

        this.currentRoute = { path: routePath, params, state };

        // Call handler
        route.handler(params, state);
        return;
      }
    }

    // No route found, default to login
    console.log('[Router] No route matched, going to login');
    this.navigate('/');
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Initialize router
   */
  init() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      console.log('[Router] Browser back/forward detected');
      this.handleRoute(window.location.pathname, event.state || {});
    });

    // Handle initial route
    const initialPath = window.location.pathname || '/';
    console.log('[Router] Initial path:', initialPath);

    // Use replace for initial route to avoid duplicate history
    this.replace(initialPath, window.history.state || {});
  }

  /**
   * Get current route
   * @returns {Object|null}
   */
  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new Router();
