// debug-manager.js
class DebugManager {
    constructor() {
        this.isEnabled = localStorage.getItem('aewDebug') === 'true';
        this.metrics = new Map();
        this.performanceMarks = new Map();
        this.stateSnapshots = [];
        this.maxSnapshots = 100;
        
        this.init();
    }

    init() {
        if (!this.isEnabled) return;
        
        this.createDebugPanel();
        this.injectDebugControls();
        this.setupGlobalErrorHandling();
        this.log('Debug system initialized');
    }

    createDebugPanel() {
        if (document.getElementById('debug-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div style="position: fixed; bottom: 0; left: 0; width: 100%; max-height: 200px; 
                       background: rgba(0,0,0,0.9); color: #0f0; font-family: monospace; 
                       font-size: 12px; padding: 10px; z-index: 9999; border-top: 2px solid #0f0;
                       overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>Debug Console</strong>
                    <div>
                        <button onclick="debug.clear()" style="background: #ff4444; color: white; border: none; padding: 2px 8px; margin-left: 5px;">Clear</button>
                        <button onclick="debug.toggle()" style="background: #4444ff; color: white; border: none; padding: 2px 8px; margin-left: 5px;">Hide</button>
                    </div>
                </div>
                <div id="debug-content"></div>
            </div>
        `;
        document.body.appendChild(panel);
    }

    injectDebugControls() {
        const header = document.querySelector('header');
        if (header && !header.querySelector('.debug-toggle')) {
            const toggle = document.createElement('button');
            toggle.className = 'debug-toggle';
            toggle.textContent = '🐛';
            toggle.title = 'Toggle Debug Mode';
            toggle.style.cssText = `
                position: absolute; right: 10px; top: 10px;
                background: #333; color: white; border: none;
                border-radius: 50%; width: 30px; height: 30px;
                cursor: pointer; font-size: 16px;
            `;
            toggle.addEventListener('click', () => this.toggleEnabled());
            header.style.position = 'relative';
            header.appendChild(toggle);
        }
    }

    log(message, data = null) {
        if (!this.isEnabled) return;
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.style.cssText = 'margin: 2px 0; padding: 2px; border-bottom: 1px solid #333;';
        if (data) {
            entry.innerHTML = `
                <span style="color: #888">[${timestamp}]</span> ${message}
                <button onclick="debug.expandData(this)" style="margin-left: 10px; font-size: 10px; background: #555; color: white; border: none;">+</button>
                <pre style="display: none; background: #222; padding: 5px; margin: 5px 0; overflow: auto;">${JSON.stringify(data, null, 2)}</pre>
            `;
        } else {
            entry.innerHTML = `<span style="color: #888">[${timestamp}]</span> ${message}`;
        }
        const content = document.getElementById('debug-content');
        if (content) {
            content.appendChild(entry);
            content.scrollTop = content.scrollHeight;
        }
        console.log(`[DEBUG] ${message}`, data || '');
    }

    error(message, error = null) { this.log(`❌ ERROR: ${message}`, error); console.error(`[DEBUG ERROR] ${message}`, error); }
    warn(message, data = null) { this.log(`⚠️ WARN: ${message}`, data); console.warn(`[DEBUG WARN] ${message}`, data); }

    startTimer(name) { if (this.isEnabled) this.performanceMarks.set(name, performance.now()); }
    endTimer(name) {
        if (!this.isEnabled) return;
        const start = this.performanceMarks.get(name);
        if (start) {
            const duration = performance.now() - start;
            this.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
            this.performanceMarks.delete(name);
        }
    }
    
    captureStateSnapshot(label) { /* Implementation as provided */ }
    
    clear() {
        const content = document.getElementById('debug-content');
        if (content) content.innerHTML = '';
    }

    toggle() {
        const panel = document.getElementById('debug-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    toggleEnabled() {
        this.isEnabled = !this.isEnabled;
        localStorage.setItem('aewDebug', this.isEnabled.toString());
        location.reload();
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => this.error('Global Error', { message: event.message, filename: event.filename, lineno: event.lineno }));
        window.addEventListener('unhandledrejection', (event) => this.error('Unhandled Promise Rejection', event.reason));
    }

    expandData(button) {
        const pre = button.nextElementSibling;
        pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
        button.textContent = pre.style.display === 'block' ? '-' : '+';
    }
}
window.debug = new DebugManager();
export default window.debug;
