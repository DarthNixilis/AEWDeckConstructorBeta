// debug-manager.js
class DebugManager {
    constructor() {
        this.isEnabled = localStorage.getItem('aewDebug') === 'true';
        this.logHistory = []; // Store logs for printing
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

    injectDebugControls() { /* ... same as before ... */ }

    log(message, data = null) {
        if (!this.isEnabled) return;
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, data };
        this.logHistory.push(logEntry); // Save to history

        const entry = document.createElement('div');
        entry.style.cssText = 'margin: 2px 0; padding: 2px; border-bottom: 1px solid #333;';
        
        let dataString = '';
        if (data) {
            try {
                dataString = JSON.stringify(data, null, 2);
            } catch (e) {
                dataString = 'Could not stringify data (circular reference?).';
            }
            entry.innerHTML = `
                <span style="color: #888">[${timestamp}]</span> ${message}
                <button onclick="debug.expandData(this)" style="margin-left: 10px; font-size: 10px; background: #555; color: white; border: none; cursor: pointer;">+</button>
                <pre style="display: none; background: #222; padding: 5px; margin: 5px 0; overflow: auto;">${dataString}</pre>
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

    error(message, error = null) { /* ... same as before ... */ }
    warn(message, data = null) { /* ... same as before ... */ }
    startTimer(name) { /* ... same as before ... */ }
    endTimer(name) { /* ... same as before ... */ }
    captureStateSnapshot(label) { /* ... same as before ... */ }

    clear() {
        const content = document.getElementById('debug-content');
        if (content) content.innerHTML = '';
        this.logHistory = [];
    }

    toggle() { /* ... same as before ... */ }
    toggleEnabled() { /* ... same as before ... */ }
    setupGlobalErrorHandling() { /* ... same as before ... */ }
    expandData(button) { /* ... same as before ... */ }

    // --- NEW: Print Log Function ---
    printLog() {
        let report = 'AEW Deck Constructor - Debug Log\n';
        report += `Timestamp: ${new Date().toISOString()}\n`;
        report += '========================================\n\n';

        this.logHistory.forEach(entry => {
            report += `[${entry.timestamp}] ${entry.message}\n`;
            if (entry.data) {
                try {
                    report += `  Data: ${JSON.stringify(entry.data, null, 2)}\n`;
                } catch (e) {
                    report += `  Data: Could not stringify.\n`;
                }
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
}

window.debug = new DebugManager();
export default window.debug;

