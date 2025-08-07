const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const http = require('http');
const log = require('electron-log');
const { spawn, exec } = require('child_process');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { autoUpdater } = require('electron-updater');

// --- Main Process Setup ---

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// GitLab configuration (for JARs, not launcher updates)
const GITLAB_CONFIG = {
    projectUrl: 'https://gitlab.com/osrsislamg-group/ghostlite-launcher',
    configUrl: 'https://gitlab.com/osrsislamg-group/ghostlite-launcher/-/raw/main/launcher-config.json'
};

const childProcesses = [];
const clientProcesses = []; // For game clients that should keep running
const jcefProcesses = []; // For JCEF browser windows that should close with launcher

const microbotDir = path.join(os.homedir(), '.microbot');
if (!fs.existsSync(microbotDir)) fs.mkdirSync(microbotDir, { recursive: true });

async function getLatestVersionInfo() {
    try {
        const configUrl = 'https://gitlab.com/osrsislamg-group/microbot-releases/-/raw/main/version.json';
        const response = await axios.get(configUrl, { timeout: 15000, headers: { 'Cache-Control': 'no-cache' } });
        const config = response.data;
        if (config.latest) {
            const jarName = `microbot-${config.latest}.jar`;
            return {
                version: config.latest, jarName,
                downloadUrl: `https://gitlab.com/osrsislamg-group/microbot-releases/-/raw/main/${jarName}`,
                allVersions: config.allVersions || [config.latest]
            };
        }
    } catch (error) {
        log.error('Failed to fetch JAR version info:', error.message);
        return null;
    }
    return null;
}

let mainWindow;

// --- Auto-Updater Event Handling ---
autoUpdater.on('update-available', () => {
  log.info('Update available.');
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  log.info('Update downloaded.');
  mainWindow.webContents.send('update-downloaded');
});

ipcMain.on('restart-app', () => {
  log.info('Restarting app to install update.');
  autoUpdater.quitAndInstall();
});


async function createWindow() {
    log.info('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 800,
        show: true,
        title: `Ghostlite Launcher v${app.getVersion()}`,
        center: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
    await mainWindow.loadURL(startUrl);
    log.info('URL loaded, showing window.');

    // Check for updates without automatically notifying. Events will handle UI.
    autoUpdater.checkForUpdates();

    if (isDev) mainWindow.webContents.openDevTools();
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    mainWindow.on('closed', () => (mainWindow = null));
    watchAccountsFile(mainWindow);
}

// --- IPC Handlers ---
function setupIpcHandlers() {
    const deps = { ipcMain, microbotDir, fs, path, log, spawn, dialog, shell, axios, http, os };

    ipcMain.handle('get-launcher-version', () => app.getVersion());

    setupAccountsHandlers(deps);
    setupLegacyAccountsHandlers(deps);
    setupGameLaunchHandlers(deps);
    setupPropertiesHandlers(deps);
    setupVersionHandlers(deps);
    setupDownloadHandlers(deps);
}

function watchAccountsFile(window) {
    const accountsPath = path.resolve(microbotDir, 'accounts.json');
    if (fs.existsSync(accountsPath)) {
        fs.watch(accountsPath, (e) => {
            if (e === 'change' && window && !window.isDestroyed()) {
                window.webContents.send('accounts-file-changed');
            }
        });
    }
}

function setupAccountsHandlers({ ipcMain, microbotDir, fs, path, log, os }) {
    const accountsPath = path.resolve(microbotDir, 'accounts.json');
    const readAccounts = () => fs.existsSync(accountsPath) ? JSON.parse(fs.readFileSync(accountsPath, 'utf8')) : [];
    ipcMain.handle('read-accounts', async () => readAccounts());
    ipcMain.handle('save-account-proxy', async (event, { accountId, proxy }) => {
        let accounts = readAccounts();
        const i = accounts.findIndex(a => a.accountId === accountId);
        if (i > -1) { accounts[i].proxy = proxy; fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf8'); return { success: true }; }
        return { success: false, error: 'Account not found' };
    });
    ipcMain.handle('remove-jagex-account', async (event, accountId) => {
        let accounts = readAccounts();
        const updated = accounts.filter(a => a.accountId !== accountId);
        if (accounts.length === updated.length) return { success: false, error: 'Account not found' };
        fs.writeFileSync(accountsPath, JSON.stringify(updated, null, 2), 'utf8');
        log.info(`Removed Jagex account: ${accountId}`);
        return { success: true };
    });
    ipcMain.handle('overwrite-credential-properties', async (event, char) => {
        const rlDir = path.join(os.homedir(), '.runelite');
        if (!fs.existsSync(rlDir)) fs.mkdirSync(rlDir, { recursive: true });
        const props = `#Do not share this file\n#${new Date()}\nJX_CHARACTER_ID=${char.accountId}\nJX_SESSION_ID=${char.sessionId}\nJX_DISPLAY_NAME=${char.displayName}\n`;
        fs.writeFileSync(path.join(rlDir, 'credentials.properties'), props, 'utf8');
        return { success: true };
    });
}

function setupLegacyAccountsHandlers({ ipcMain, microbotDir, fs, path }) {
    const legacyPath = path.resolve(microbotDir, 'legacy_accounts.json');
    ipcMain.handle('read-legacy-accounts', async () => fs.existsSync(legacyPath) ? JSON.parse(fs.readFileSync(legacyPath, 'utf8')) : []);
    ipcMain.handle('save-legacy-accounts', async (event, accounts) => {
        const withIds = accounts.map(a => a.id && !a.id.startsWith('new-') ? a : { ...a, id: uuidv4() });
        fs.writeFileSync(legacyPath, JSON.stringify(withIds, null, 2), 'utf8');
        return { success: true, accounts: withIds };
    });
}

function setupGameLaunchHandlers({ ipcMain, spawn, path, microbotDir, log, dialog, shell, http }) {
    const startCredServer = (user, pass) => new Promise((res) => http.createServer((req, resp) => { resp.writeHead(200, { 'Content-Type': 'application/json' }); resp.end(JSON.stringify({ username: user, password: pass })); req.socket.server.close(); }).listen(0, function() { res(this.address().port); }));
    const isJava = (cb) => spawn('java', ['-version']).on('error', () => cb(false)).on('close', code => cb(code === 0));

    const execJar = (args, processType = 'other') => {
        log.info(`Executing: java ${args.join(' ')}`);
        const p = spawn('java', args, { stdio: 'ignore', detached: processType === 'client' });

        if (processType === 'client') {
            clientProcesses.push(p);
            p.unref();
        } else if (processType === 'jcef') {
            jcefProcesses.push(p);
        } else {
            childProcesses.push(p);
        }

        p.on('close', () => {
            [childProcesses, clientProcesses, jcefProcesses].forEach(arr => {
                const i = arr.indexOf(p);
                if (i > -1) arr.splice(i, 1);
            });
        });
    };

    const run = (args, processType = 'other') => isJava(ok => ok ? execJar(args, processType) : dialog.showMessageBox({ type: 'error', title: 'Java Not Found', message: 'Java is required. Download now?', buttons: ['Yes', 'No'] }).then(r => r.response === 0 && shell.openExternal('https://www.oracle.com/java/technologies/downloads/')));

    ipcMain.handle('open-client', async (event, options) => {
        log.info('open-client called with options:', JSON.stringify(options));
        const { version, proxy, username, password } = options || {};
        if (!version) {
            log.error('No version specified for client launch');
            return { success: false, error: 'Version is required' };
        }
        const args = [];
        if (username && password) args.push(`-Drunelite.api.port=${await startCredServer(username, password)}`);
        args.push('-jar', path.join(microbotDir, version));
        if (proxy?.ip) args.push(`--proxy=${proxy.ip}`, `--proxy-type=${proxy.type || 'http'}`);
        if (username) args.push('--clean-jagex-launcher');
        run(args, 'client');
        return { success: true };
    });

    ipcMain.handle('open-launcher', async () => {
        run([`-Djava.library.path=${path.join(microbotDir, 'jcef-bundle')}`, '-jar', path.join(microbotDir, 'microbot-launcher.jar')], 'jcef');
        return { success: true };
    });
}

function setupPropertiesHandlers({ ipcMain, microbotDir, fs, path }) {
    const propsPath = path.resolve(microbotDir, 'resource_versions.json');
    const defaults = { version_pref: '' };
    ipcMain.handle('read-properties', async () => fs.existsSync(propsPath) ? JSON.parse(fs.readFileSync(propsPath, 'utf8')) : (fs.writeFileSync(propsPath, JSON.stringify(defaults)), defaults));
    ipcMain.handle('write-properties', async (event, data) => (fs.writeFileSync(propsPath, JSON.stringify(data, null, 2)), { success: true }));
}

function setupVersionHandlers({ ipcMain, microbotDir, fs, path }) {
    const listJars = () => fs.readdirSync(microbotDir).filter(f => f.startsWith('microbot-')).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    ipcMain.handle('list-jars', async () => listJars());
    ipcMain.handle('delete-jars', async (event, { keep = [] }) => { listJars().filter(j => !keep.includes(j)).forEach(j => fs.unlinkSync(path.join(microbotDir, j))); return { success: true }; });
    ipcMain.handle('check-latest-version', async () => { const info = await getLatestVersionInfo(); if (info) return { ...info, isDownloaded: fs.existsSync(path.join(microbotDir, info.jarName)) }; return null; });
    ipcMain.handle('get-all-versions', async () => { const info = await getLatestVersionInfo(); return { latest: info, allVersions: info?.allVersions || [] }; });
}

function setupDownloadHandlers({ ipcMain, axios, fs, path, microbotDir, dialog }) {
    const dl = async (fName, url, sender) => {
        const fPath = path.join(microbotDir, fName);
        if (fs.existsSync(fPath)) return { success: true, fileName: fName, alreadyExists: true };
        const res = await axios({ method: 'get', url, responseType: 'arraybuffer', timeout: 60000, onDownloadProgress: e => sender.send('download-progress', { percent: e.total ? Math.round((e.loaded * 100) / e.total) : 0, status: `Downloading ${fName}...` }) });
        fs.writeFileSync(fPath, res.data);
        return { success: true, fileName: fName };
    };
    ipcMain.handle('download-version', async (e, v) => dl(`microbot-${v}.jar`, `https://gitlab.com/osrsislamg-group/microbot-releases/-/raw/main/microbot-${v}.jar`, e.sender));
    ipcMain.handle('download-latest-version', async (e) => { const info = await getLatestVersionInfo(); if (!info) throw new Error('Could not get latest version'); return dl(info.jarName, info.downloadUrl, e.sender); });
    ipcMain.handle('load-custom-jar', async () => {
        const res = await dialog.showOpenDialog({ title: 'Select JAR', filters: [{ name: 'JAR Files', extensions: ['jar'] }], properties: ['openFile'] });
        if (res.canceled) return { canceled: true };
        const fName = path.basename(res.filePaths[0]);
        fs.copyFileSync(res.filePaths[0], path.join(microbotDir, fName));
        return { success: true, fileName: fName };
    });
}

// --- App Lifecycle ---
app.whenReady().then(() => { setupIpcHandlers(); createWindow(); });
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());

const killJcefProcesses = () => {
    log.info('Killing all JCEF-related processes...');
    if (process.platform === 'win32') {
        exec('taskkill /f /im jcef_helper.exe', (error) => {
            if (error && !error.message.includes('not found')) { log.warn('Could not kill jcef_helper.exe:', error.message); }
            else { log.info('jcef_helper.exe processes terminated'); }
        });
        const jcefCommands = [
            'wmic process where "name=\'java.exe\' and commandline like \'%jcef%\'" delete',
            'wmic process where "name=\'java.exe\' and commandline like \'%microbot-launcher%\'" delete',
            'wmic process where "name=\'javaw.exe\' and commandline like \'%jcef%\'" delete',
            'wmic process where "name=\'javaw.exe\' and commandline like \'%microbot-launcher%\'" delete'
        ];
        jcefCommands.forEach(cmd => {
            exec(cmd, (error) => {
                if (error && !error.message.includes('not found')) { log.warn(`Command failed: ${cmd}`, error.message); }
            });
        });
    } else { // macOS/Linux
        exec('pkill -f jcef', (error) => { if (error && error.code !== 1) { log.warn('Could not kill JCEF processes on Unix:', error.message); } });
        exec('pkill -f microbot-launcher', (error) => { if (error && error.code !== 1) { log.warn('Could not kill launcher processes on Unix:', error.message); } });
    }
};

app.on('before-quit', () => {
    log.info('Launcher closing - killing JCEF processes but leaving game clients running');
    jcefProcesses.forEach(p => {
        try {
            p.kill('SIGTERM');
            setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* Process might already be dead */ }}, 2000);
        } catch (e) { log.error('Error killing JCEF process:', e); }
    });
    childProcesses.forEach(p => {
        try { p.kill('SIGTERM'); } catch (e) { log.error('Error killing child process:', e); }
    });
    killJcefProcesses();
});

app.on('window-all-closed', () => {
    killJcefProcesses();
    if (process.platform !== 'darwin') app.quit();
});