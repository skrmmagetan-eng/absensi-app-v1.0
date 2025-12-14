// Simple SPA Router
class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        this.middleware = [];
    }

    addRoute(path, handler) {
        this.routes[path] = handler;
    }

    addMiddleware(callback) {
        this.middleware.push(callback);
    }

    async navigate(path, skipHistory = false) {
        // Run middleware
        for (const mw of this.middleware) {
            const result = await mw(path);
            if (result === false) {
                return; // Middleware blocked navigation
            }
        }

        const handler = this.routes[path] || this.routes['/404'];
        if (handler) {
            this.currentPage = path;
            if (!skipHistory) {
                window.history.pushState({ path }, '', path);
            }
            // 3. Render page
            const app = document.getElementById('app');

            // Animation trigger: Fade out/in slightly
            app.classList.remove('page-transition-enter', 'page-transition-enter-active');
            void app.offsetWidth; // Trigger reflow
            app.classList.add('page-transition-enter');

            await handler();

            // Animate In
            requestAnimationFrame(() => {
                app.classList.add('page-transition-enter-active');
            });

            // Update active nav state
            this.updateActiveNavLinks();
        }
    }

    updateActiveNavLinks() {
        document.querySelectorAll('.nav-link, .bottom-nav-item').forEach((link) => {
            link.classList.remove('active');
            if (link.dataset.route === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const path = e.state?.path || '/';
            this.navigate(path, true);
        });

        // Handle initial load
        const initialPath = window.location.pathname;
        this.navigate(initialPath, true);
    }
}

export const router = new Router();

// State Management
class StateManager {
    constructor() {
        this.state = {
            user: null,
            profile: null,
            isAuthenticated: false,
            customers: [],
            attendance: [],
            orders: [],
            kpi: null,
        };
        this.listeners = {};
    }

    getState(key) {
        return key ? this.state[key] : this.state;
    }

    setState(key, value) {
        this.state[key] = value;
        this.notify(key, value);
    }

    updateState(updates) {
        Object.keys(updates).forEach((key) => {
            this.state[key] = updates[key];
            this.notify(key, updates[key]);
        });
    }

    subscribe(key, callback) {
        if (!this.listeners[key]) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[key] = this.listeners[key].filter((cb) => cb !== callback);
        };
    }

    notify(key, value) {
        if (this.listeners[key]) {
            this.listeners[key].forEach((callback) => callback(value));
        }
    }

    reset() {
        this.state = {
            user: null,
            profile: null,
            isAuthenticated: false,
            customers: [],
            attendance: [],
            orders: [],
            kpi: null,
        };
        Object.keys(this.listeners).forEach((key) => {
            this.notify(key, this.state[key]);
        });
    }
}

export const state = new StateManager();
