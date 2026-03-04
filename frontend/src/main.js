import './style.css';

// Import Wails runtime
import { GetCurrentDirectory, CheckProxiFyreExists, GetConfig, SaveConfig, RunProxiFyre, StopProxiFyre, DownloadProxiFyre, InstallService, UninstallService, StartService, StopService, GetServiceStatus, GetTimestamp } from '../wailsjs/go/main/App';

// Global variables
let currentConfig = null;
let currentApps = [];
let isInitialized = false; // Flag to prevent re-initialization
let selectedProxyIndex = 0;

// Helper function for error handling
function getErrorMessage(error) {
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object') {
        if (error.message) {
            errorMessage = error.message;
        } else if (error.error) {
            errorMessage = error.error;
        } else if (error.toString) {
            errorMessage = error.toString();
        }
    } else if (error) {
        errorMessage = String(error);
    }
    return errorMessage;
}

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize application
async function initializeApp() {
    if (isInitialized) {
        return; // Prevent re-initialization
    }
    
    try {
        logToConsole('🚀 ProxiFyre Configuration Editor started');
        
        // Check current directory
        const currentDir = await GetCurrentDirectory();
        console.log('Current directory:', currentDir);
        
        // Load configuration
        await loadCurrentConfig();
        
        // Check ProxiFyre status
        await checkProxiFyreStatus();
        
        isInitialized = true;
        
    } catch (error) {
        console.error('Initialization error:', error);
        logToConsole(`❌ Initialization error: ${error.message}`);
    }
}

// Setup event handlers
function setupEventListeners() {
    console.log('Setting up event handlers...');
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Control buttons
    const saveBtn = document.getElementById('saveBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveConfiguration);
        console.log('✅ Event handler for "Save" button added');
    } else {
        console.error('❌ "Save" button not found');
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadCurrentConfig);
        console.log('✅ Event handler for "Refresh" button added');
    } else {
        console.error('❌ "Refresh" button not found');
    }

    // Application control buttons
    const runBtn = document.getElementById('runBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (runBtn) {
        runBtn.addEventListener('click', runProxiFyre);
        console.log('✅ Event handler for "Run" button added');
    } else {
        console.error('❌ "Run" button not found');
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopProxiFyre);
        console.log('✅ Event handler for "Stop" button added');
    } else {
        console.error('❌ "Stop" button not found');
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadProxiFyre);
        console.log('✅ Event handler for "Download" button added');
    } else {
        console.error('❌ "Download" button not found');
    }

    // Application management buttons
    const addAppBtn = document.getElementById('addAppBtn');
    
    if (addAppBtn) {
        addAppBtn.addEventListener('click', addApplication);
        console.log('✅ Event handler for "Add" button added');
    } else {
        console.error('❌ "Add" button not found');
    }

    // Console management buttons
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    const copyConsoleBtn = document.getElementById('copyConsoleBtn');
    
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
        console.log('✅ Event handler for "Clear" button added');
    } else {
        console.error('❌ "Clear" button not found');
    }
    
    if (copyConsoleBtn) {
        copyConsoleBtn.addEventListener('click', copyConsoleOutput);
        console.log('✅ Event handler for "Copy" button added');
    } else {
        console.error('❌ "Copy" button not found');
    }

    // Service management buttons
    const installServiceBtn = document.getElementById('installServiceBtn');
    const uninstallServiceBtn = document.getElementById('uninstallServiceBtn');
    const startServiceBtn = document.getElementById('startServiceBtn');
    const stopServiceBtn = document.getElementById('stopServiceBtn');
    const refreshStatusBtn = document.getElementById('refreshStatusBtn');
    
    if (installServiceBtn) {
        installServiceBtn.addEventListener('click', installService);
        console.log('✅ Event handler for "Install Service" button added');
    } else {
        console.error('❌ "Install Service" button not found');
    }
    
    if (uninstallServiceBtn) {
        uninstallServiceBtn.addEventListener('click', uninstallService);
        console.log('✅ Event handler for "Uninstall Service" button added');
    } else {
        console.error('❌ "Uninstall Service" button not found');
    }
    
    if (startServiceBtn) {
        startServiceBtn.addEventListener('click', startService);
        console.log('✅ Event handler for "Start Service" button added');
    } else {
        console.error('❌ "Start Service" button not found');
    }
    
    if (stopServiceBtn) {
        stopServiceBtn.addEventListener('click', stopService);
        console.log('✅ Event handler for "Stop Service" button added');
    } else {
        console.error('❌ "Stop Service" button not found');
    }
    
    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', updateServiceStatus);
        console.log('✅ Event handler for "Refresh Status" button added');
    } else {
        console.error('❌ "Refresh Status" button not found');
    }

    // Field change handlers
    const endpoint = document.getElementById('endpoint');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const logLevel = document.getElementById('logLevel');
    
    if (endpoint) {
        endpoint.addEventListener('input', updateConfigFromUI);
        console.log('✅ Event handler for "endpoint" field added');
    }
    
    if (username) {
        username.addEventListener('input', updateConfigFromUI);
        console.log('✅ Event handler for "username" field added');
    }
    
    if (password) {
        password.addEventListener('input', updateConfigFromUI);
        console.log('✅ Event handler for "password" field added');
    }
    
    if (logLevel) {
        logLevel.addEventListener('change', updateConfigFromUI);
        console.log('✅ Event handler for "logLevel" field added');
    }
    
    console.log('Event handlers setup completed');
}

// Switch tabs
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activate selected tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Load current configuration
async function loadCurrentConfig() {
    try {
        const configData = await GetConfig();
        currentConfig = JSON.parse(configData);
        
        // Update UI
        updateUIFromConfig();
        
        // Log message only if not initialization
        if (isInitialized) {
            logToConsole('✅ Configuration loaded');
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        logToConsole(`❌ Error loading configuration: ${error.message}`);
    }
}

// Update UI from configuration
function updateUIFromConfig() {
    if (!currentConfig || !currentConfig.proxies || currentConfig.proxies.length === 0) {
        return;
    }

    // Populate proxy dropdown
    const proxySelect = document.getElementById('proxySelect');
    proxySelect.innerHTML = '';
    currentConfig.proxies.forEach((proxy, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Proxy ${index + 1}${proxy.socks5ProxyEndpoint ? ' - ' + proxy.socks5ProxyEndpoint : ''}`;
        proxySelect.appendChild(option);
    });

    // Ensure selected index is valid
    if (selectedProxyIndex >= currentConfig.proxies.length) {
        selectedProxyIndex = 0;
    }
    proxySelect.value = selectedProxyIndex;

    // Display the selected proxy
    const proxy = currentConfig.proxies[selectedProxyIndex];
    document.getElementById('endpoint').value = proxy.socks5ProxyEndpoint || '';
    document.getElementById('username').value = proxy.username || '';
    document.getElementById('password').value = proxy.password || '';

    // Update log level (still global)
    const logLevelSelect = document.getElementById('logLevel');
    const logLevel = currentConfig.logLevel || 'Error';
    logLevelSelect.value = logLevel;

    // Update applications list (shared across proxies? The backend stores per-proxy appNames)
    currentApps = proxy.appNames || [];
    updateAppsDisplay();
}

// Update configuration from UI
function updateConfigFromUI() {
    if (!currentConfig) {
        currentConfig = {
            logLevel: "Error",
            proxies: [{
                appNames: [],
                socks5ProxyEndpoint: "",
                username: "",
                password: "",
                supportedProtocols: ["TCP", "UDP"]
            }]
        };
    }

    // Update global log level
    currentConfig.logLevel = document.getElementById('logLevel').value;

    // Ensure at least one proxy exists
    if (!currentConfig.proxies || currentConfig.proxies.length === 0) {
        currentConfig.proxies = [{}];
        selectedProxyIndex = 0;
    }

    // Update the selected proxy
    const proxy = currentConfig.proxies[selectedProxyIndex];
    proxy.socks5ProxyEndpoint = document.getElementById('endpoint').value;
    proxy.username = document.getElementById('username').value;
    proxy.password = document.getElementById('password').value;
    proxy.appNames = currentApps; // currentApps should reflect this proxy's apps

    if (!proxy.supportedProtocols) {
        proxy.supportedProtocols = ["TCP", "UDP"];
    }
}

// Save configuration
async function saveConfiguration() {
    try {
        updateConfigFromUI();
        
        const configData = JSON.stringify(currentConfig);
        await SaveConfig(configData);
        
        logToConsole('💾 Configuration saved');
        showNotification('Configuration saved successfully!', 'success');
    } catch (error) {
        console.error('Save error:', error);
        
        // Improved error handling
        const errorMessage = getErrorMessage(error);
        console.log('📝 Processed error:', errorMessage);
        logToConsole(`❌ Save error: ${errorMessage}`);
        showNotification(`Save error: ${errorMessage}`, 'error');
    }
}

// Update applications display
function updateAppsDisplay() {
    const appsList = document.getElementById('appsList');
    appsList.innerHTML = '';
    
    currentApps.forEach((app, index) => {
        const appItem = document.createElement('div');
        appItem.className = 'app-item';
        
        // Create span with app name
        const appSpan = document.createElement('span');
        appSpan.textContent = `• ${app}`;
        
        // Create delete button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('data-index', index);
        
        // Add click handler for delete button
        removeBtn.addEventListener('click', function() {
            const buttonIndex = parseInt(this.getAttribute('data-index'));
            console.log('🔄 Click on delete button, index:', buttonIndex);
            removeAppByIndex(buttonIndex);
        });
        
        // Add elements to appItem
        appItem.appendChild(appSpan);
        appItem.appendChild(removeBtn);
        
        appsList.appendChild(appItem);
    });
}

// Add application
async function addApplication() {
    console.log('🔄 Function addApplication called');
    try {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.exe,.msi,.bat,.cmd,.com'; // Accept executable files
        fileInput.style.display = 'none';
        
        // Add file selection handler
        fileInput.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                const fileName = file.name;
                console.log('📁 File selected:', fileName);
                
                if (!currentApps.includes(fileName)) {
                    currentApps.push(fileName);
                    console.log('✅ Application added to array:', fileName);
                    updateAppsDisplay();
                    updateConfigFromUI();
                    logToConsole(`✅ Application '${fileName}' added`);
                    showNotification(`Application '${fileName}' added!`, 'success');
                } else {
                    console.log('⚠️ Application already exists in list');
                    showNotification('This application is already in the list!', 'warning');
                }
            }
            
            // Clear input to allow re-selecting the same file
            fileInput.value = '';
        };
        
        // Add input to DOM and trigger file dialog
        document.body.appendChild(fileInput);
        fileInput.click();
        
        // Remove input from DOM after use
        setTimeout(() => {
            if (fileInput.parentNode) {
                fileInput.parentNode.removeChild(fileInput);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error in addApplication:', error);
        logToConsole(`❌ Error adding application: ${error.message}`);
    }
}

// Remove application by index
function removeAppByIndex(index) {
    console.log('🔄 Function removeAppByIndex called with index:', index);
    
    if (index >= 0 && index < currentApps.length) {
        const appName = currentApps[index];
        console.log('📝 Removing application:', appName);
        
        currentApps.splice(index, 1);
        updateAppsDisplay();
        updateConfigFromUI();
        
        logToConsole(`✅ Application '${appName}' removed`);
        showNotification(`Application '${appName}' removed!`, 'success');
        
        console.log('✅ Application successfully removed from array');
    } else {
        console.error('❌ Invalid index for removal:', index);
        showNotification('Error: invalid application index!', 'error');
    }
}

// Run ProxiFyre
async function runProxiFyre() {
    console.log('🔄 Function runProxiFyre called');
    try {
        logToConsole('🚀 Starting ProxiFyre...');
        console.log('📞 Calling RunProxiFyre() from Go backend...');
        
        await RunProxiFyre();
        
        console.log('✅ RunProxiFyre() executed successfully');
        logToConsole('✅ ProxiFyre started!');
        showNotification('ProxiFyre started successfully!', 'success');
    } catch (error) {
        console.error('❌ Error in runProxiFyre:', error);
        
        // Improved error handling
        const errorMessage = getErrorMessage(error);
        console.log('📝 Processed error:', errorMessage);
        logToConsole(`❌ Start error: ${errorMessage}`);
        showNotification(`Start error: ${errorMessage}`, 'error');
    }
}

// Stop ProxiFyre
async function stopProxiFyre() {
    console.log('🔄 Function stopProxiFyre called');
    try {
        logToConsole('🛑 Stopping ProxiFyre...');
        console.log('📞 Calling StopProxiFyre() from Go backend...');
        
        await StopProxiFyre();
        
        console.log('✅ StopProxiFyre() executed successfully');
        logToConsole('✅ ProxiFyre stopped!');
        showNotification('ProxiFyre stopped successfully!', 'success');
    } catch (error) {
        console.error('❌ Error in stopProxiFyre:', error);
        
        // Improved error handling
        const errorMessage = getErrorMessage(error);
        console.log('📝 Processed error:', errorMessage);
        logToConsole(`❌ Stop error: ${errorMessage}`);
        showNotification(`Stop error: ${errorMessage}`, 'error');
    }
}

// Download ProxiFyre
async function downloadProxiFyre() {
    console.log('🔄 Function downloadProxiFyre called');
    try {
        logToConsole('⬇️ Downloading ProxiFyre...');
        console.log('📞 Calling DownloadProxiFyre() from Go backend...');
        
        await DownloadProxiFyre();
        
        console.log('✅ DownloadProxiFyre() executed successfully');
        logToConsole('✅ ProxiFyre downloaded!');
        showNotification('ProxiFyre downloaded successfully!', 'success');
    } catch (error) {
        console.error('❌ Error in downloadProxiFyre:', error);
        
        // Improved error handling
        const errorMessage = getErrorMessage(error);
        console.log('📝 Processed error:', errorMessage);
        logToConsole(`❌ Download error: ${errorMessage}`);
        showNotification(`Download error: ${errorMessage}`, 'error');
    }
}

// Install service
async function installService() {
    try {
        logToConsole('📥 Installing ProxiFyre service...');
        
        await InstallService();
        
        logToConsole('✅ ProxiFyre service installed!');
        showNotification('ProxiFyre service installed!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Error installing service:', error);
        logToConsole(`❌ Error installing service: ${error.message}`);
        showNotification(`Error installing service: ${error.message}`, 'error');
    }
}

// Uninstall service
async function uninstallService() {
    try {
        logToConsole('🗑️ Uninstalling ProxiFyre service...');
        
        await UninstallService();
        
        logToConsole('✅ ProxiFyre service uninstalled!');
        showNotification('ProxiFyre service uninstalled!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Error uninstalling service:', error);
        logToConsole(`❌ Error uninstalling service: ${error.message}`);
        showNotification(`Error uninstalling service: ${error.message}`, 'error');
    }
}

// Start service
async function startService() {
    try {
        logToConsole('▶️ Starting ProxiFyre service...');
        
        await StartService();
        
        logToConsole('✅ ProxiFyre service started!');
        showNotification('ProxiFyre service started!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Error starting service:', error);
        logToConsole(`❌ Error starting service: ${error.message}`);
        showNotification(`Error starting service: ${error.message}`, 'error');
    }
}

// Stop service
async function stopService() {
    try {
        logToConsole('⏹️ Stopping ProxiFyre service...');
        
        await StopService();
        
        logToConsole('✅ ProxiFyre service stopped!');
        showNotification('ProxiFyre service stopped!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Error stopping service:', error);
        logToConsole(`❌ Error stopping service: ${error.message}`);
        showNotification(`Error stopping service: ${error.message}`, 'error');
    }
}

// Update service status
async function updateServiceStatus() {
    try {
        const status = await GetServiceStatus();
        const statusElement = document.getElementById('serviceStatus');
        
        statusElement.textContent = `Status: ${status}`;
        
        // Update color based on status
        statusElement.className = '';
        if (status.includes('Running')) {
            statusElement.style.color = 'green';
            statusElement.style.fontWeight = 'bold';
        } else if (status.includes('Stopped')) {
            statusElement.style.color = 'red';
            statusElement.style.fontWeight = 'bold';
        } else if (status.includes('Unknown')) {
            statusElement.style.color = 'orange';
            statusElement.style.fontWeight = 'bold';
        } else {
            statusElement.style.color = 'gray';
        }
        
        logToConsole(`📊 Service status updated: ${status}`);
    } catch (error) {
        console.error('Error updating service status:', error);
        logToConsole(`❌ Error updating service status: ${error.message}`);
    }
}

// Check ProxiFyre status
async function checkProxiFyreStatus() {
    try {
        const exists = await CheckProxiFyreExists();
        if (exists) {
            // Log message only if not initialization
            if (isInitialized) {
                logToConsole('✅ ProxiFyre.exe found in current directory');
            }
        } else {
            logToConsole('⚠️ ProxiFyre.exe not found in current directory');
        }
    } catch (error) {
        console.error('Error checking ProxiFyre status:', error);
        logToConsole(`❌ Error checking ProxiFyre status: ${error.message}`);
    }
}

// Log to console
function logToConsole(message) {
    const console = document.getElementById('console');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    console.appendChild(logEntry);
    
    // Scroll to end
    console.scrollTop = console.scrollHeight;
}

// Clear console
function clearConsole() {
    document.getElementById('console').innerHTML = '';
    logToConsole('🧹 Console cleared');
}

// Copy console output
function copyConsoleOutput() {
    const console = document.getElementById('console');
    const text = console.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Console content copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy console content', 'error');
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Colors for different types
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#333';
            break;
        default:
            notification.style.backgroundColor = '#007bff';
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Auto-update service status every 10 seconds - REMOVED
// setInterval(updateServiceStatus, 10000);

// Log application start
//logToConsole('🚀 ProxiFyre Configuration Editor started');

document.getElementById('proxySelect').addEventListener('change', function(e) {
    selectedProxyIndex = parseInt(e.target.value);
    updateUIFromConfig(); // refresh fields with new proxy data
});
function addProxy() {
    if (!currentConfig) {
        currentConfig = { logLevel: "Error", proxies: [] };
    }
    const newProxy = {
        appNames: [],
        socks5ProxyEndpoint: "",
        username: "",
        password: "",
        supportedProtocols: ["TCP", "UDP"]
    };
    currentConfig.proxies.push(newProxy);
    selectedProxyIndex = currentConfig.proxies.length - 1;
    updateUIFromConfig();
    logToConsole('➕ New proxy added');
}

function removeProxy() {
    if (currentConfig.proxies.length <= 1) {
        showNotification('Cannot remove the last proxy', 'warning');
        return;
    }
    currentConfig.proxies.splice(selectedProxyIndex, 1);
    selectedProxyIndex = Math.max(0, selectedProxyIndex - 1);
    updateUIFromConfig();
    logToConsole('🗑️ Proxy removed');
}

document.getElementById('addProxyBtn').addEventListener('click', addProxy);
document.getElementById('removeProxyBtn').addEventListener('click', removeProxy);
