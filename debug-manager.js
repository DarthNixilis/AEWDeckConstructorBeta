// debug-manager.js
class DebugManager {
    constructor() {
        this.isEnabled = localStorage.getItem('aewDebug') === 'true';
        this.logHistory = [];
        // Only initialize if enabled.
        if (this.isEnabled) {
            this.init();
        }
    }

    init() {
        // Run on DOMContentLoaded to ensure body exists.
        document.addEventListener('DOMContentLoaded', () => {
            this.createDebugPanel();
            this.injectDebugControls();
            this.setupGlobalErrorHandling();
            this.log('Debug system initialized.');
        });
    }

    createDebugPanel() {
        if (document.getElementById('debug-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div style="position: fixed; bottom: 0; left: 0; width: 100%; max-height: 200px; 
                       background: rgba(0,0,0,0.9); color: #0f0; font-family: monospace; 
                       font-size: 12px; padding: 10px; z-index: 9999; border-top: 2px solid #0f0;
                       overflow-y: auto; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong>Debug Console</strong>
                    <div>
                        <button onclick="debug.printLog()" style="background: #0099cc; color: white; border: none; padding: 2px 8px; margin-left: 5px; cursor: pointer;">Print</button>
                        <button onclick="debug.clear()" style="background: #ff4444; color: white; border: none; padding: 2px 8px; margin-left: 5px; cursor: pointer;">Clear</button>
                        <button onclick="debug.toggle()" style="background: #4444ff; color: white; border: none; padding: 2px 8px; margin-left: 5px; cursor: pointer;">Hide</button>
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
            toggle.style.cssText = `position: absolute; right: 10px; top: 10px; background: #333; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;`;
            toggle.addEventListener('click', () => this.toggleEnabled());
            header.style.position = 'relative';
            header.appendChild(toggle);
        }
    }

    log(message, data = null) {
        if (!this.isEnabled) return;
        const timestamp = new Date().toLocaleTimeString();
        this.logHistory.push({ timestamp, message, data });
        const content = document.getElementById('debug-content');
        if (content) {
            const entry = document.createElement('div');
            entry.innerHTML = `<span style="color: #888">[${timestamp}]</span> ${message}`;
            content.appendChild(entry);
            content.scrollTop = content.scrollHeight;
        }
        console.log(`[DEBUG] ${message}`, data || '');
    }
    
    printLog() {
        let report = 'AEW Deck Constructor - Debug Log\n========================================\n\n';
        this.logHistory.forEach(entry => {
            report += `[${entry.timestamp}] ${entry.message}\n`;
            if (entry.data) {
                try {
                    report += `  Data: ${JSON.stringify(entry.data, null, 2)}\n`;
                } catch (e) { report += `  Data: Could not stringify.\n`; }
            }
            report += '\n';
        });
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug_log_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ... (All other debug functions: error, warn, clear, toggle, etc. are correct)
    error(message, error = null) { this.log(`❌ ERROR: ${message}`, error); console.error(`[DEBUG ERROR] ${message}`, error); }
    warn(message, data = null) { this.log(`⚠️ WARN: ${message}`, data); console.warn(`[DEBUG WARN] ${message}`, data); }
    clear() { const content = document.getElementById('debug-content'); if (content) content.innerHTML = ''; this.logHistory = []; }
    toggle() { const panel = document.getElementById('debug-panel'); if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; }
    toggleEnabled() { this.isEnabled = !this.isEnabled; localStorage.setItem('aewDebug', this.isEnabled.toString()); location.reload(); }
    setupGlobalErrorHandling() { window.addEventListener('error', (event) => this.error('Global Error', { message: event.message, filename: event.filename, lineno: event.lineno })); window.addEventListener('unhandledrejection', (event) => this.error('Unhandled Promise Rejection', event.reason)); }
}

window.debug = new DebugManager();
export default window.debug;

