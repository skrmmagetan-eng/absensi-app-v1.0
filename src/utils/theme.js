/**
 * Theme Manager
 * Handles Dark, Light, and System themes
 */

export const themeManager = {
    // Key for localStorage
    STORAGE_KEY: 'skrm-theme-preference',

    init() {
        this.applyTheme(this.getStoredTheme());

        // Listen for system changes if mode is 'system'
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (this.getStoredTheme() === 'system') {
                this.applyTheme('system');
            }
        });

        // Make it globally accessible for inline onclick handlers if needed
        window.setTheme = (mode) => this.setTheme(mode);
    },

    getStoredTheme() {
        return localStorage.getItem(this.STORAGE_KEY) || 'system';
    },

    setTheme(mode) {
        localStorage.setItem(this.STORAGE_KEY, mode);
        this.applyTheme(mode);
    },

    applyTheme(mode) {
        const root = document.documentElement;
        let effectiveTheme = mode;

        if (mode === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = systemDark ? 'dark' : 'light';
        }

        // Set attribute for CSS selector
        root.setAttribute('data-theme', effectiveTheme);

        // Optional: Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0a0e27' : '#f8fafc');
        }
    },

    // Get icon for current mode to display in UI
    getCurrentIcon() {
        const mode = this.getStoredTheme();
        if (mode === 'light') return '☀️';
        if (mode === 'dark') return '🌙';
        return '💻'; // System
    },

    cycleTheme() {
        const current = this.getStoredTheme();
        const modes = ['system', 'light', 'dark'];
        const nextIndex = (modes.indexOf(current) + 1) % modes.length;
        this.setTheme(modes[nextIndex]);
        return modes[nextIndex]; // Return new mode for UI update
    }
};
