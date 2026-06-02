// ===== ROUTER =====
// Roteamento SPA baseado em hash

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    window.addEventListener('hashchange', () => this._handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = path;
  }

  start(defaultPath = 'login') {
    if (!window.location.hash) {
      window.location.hash = defaultPath;
    } else {
      this._handleRoute();
    }
  }

  _handleRoute() {
    const hash = window.location.hash.slice(1) || 'login';
    const [path, ...params] = hash.split('/');
    
    if (this.routes[path]) {
      this.currentRoute = path;
      this.routes[path](params);
    } else {
      this.navigate('login');
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new Router();
