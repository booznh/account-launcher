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
const AdmZip = require('adm-zip');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

const childProcesses = [];
const clientProcesses = [];
const jcefProcesses = [];

const ghostliteDir = path.join(os.homedir(), '.ghostlite');
if (!fs.existsSync(ghostliteDir)) fs.mkdirSync(ghostliteDir, { recursive: true });

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log.info(`Created directory: ${dirPath}`);
    }
}

const checkVisualCppRedist = () => {
    const vcRedistPaths = [
        'C:\\Windows\\System32\\msvcp140.dll',
        'C:\\Windows\\System32\\vcruntime140.dll',
        'C:\\Windows\\System32\\vcruntime140_1.dll'
    ];

    const missing = vcRedistPaths.filter(filePath => !fs.existsSync(filePath));

    if (missing.length > 0) {
        log.warn('Missing Visual C++ Redistributable files:', missing);
        return false;
    }

    return true;
};

const promptInstallVisualCpp = async () => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Missing Dependencies',
        message: 'Visual C++ Redistributable is required for JCEF launcher',
        detail: 'The JCEF browser launcher requires Microsoft Visual C++ 2015-2022 Redistributable (x64). Would you like to download it now?',
        buttons: ['Download Now', 'Cancel'],
        defaultId: 0,
        cancelId: 1
    });

    if (result.response === 0) {
        shell.openExternal('https://aka.ms/vs/17/release/vc_redist.x64.exe');
        return false;
    }

    return false;
};

function copyRecursively(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        ensureDirectoryExists(dest);
        fs.readdirSync(src).forEach(file => {
            copyRecursively(path.join(src, file), path.join(dest, file));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

async function downloadJCEFBundle() {
    ensureDirectoryExists(ghostliteDir);

    const jcefBundlePath = path.join(ghostliteDir, 'jcef-bundle');

    if (fs.existsSync(jcefBundlePath)) {
        const contents = fs.readdirSync(jcefBundlePath);
        if (contents.length > 3) {
            log.info('JCEF bundle already exists with content');
            return true;
        }
    }

    try {
        log.info('Downloading JCEF bundle from GitHub repository...');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 0,
                status: 'Downloading JCEF bundle...'
            });
        }

        ensureDirectoryExists(jcefBundlePath);

        const jcefUrl = 'https://github.com/booznh/account-launcher/raw/main/releases/jcef-bundle.zip';

        log.info(`Downloading JCEF from: ${jcefUrl}`);

        const response = await axios({
            method: 'get',
            url: jcefUrl,
            responseType: 'arraybuffer',
            timeout: 300000,
            onDownloadProgress: (progressEvent) => {
                const percent = progressEvent.total
                    ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    : 0;

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', {
                        percent,
                        status: `Downloading JCEF... ${percent}%`
                    });
                }
            }
        });

        const archivePath = path.join(ghostliteDir, 'jcef-bundle.zip');
        fs.writeFileSync(archivePath, response.data);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 90,
                status: 'Extracting JCEF bundle...'
            });
        }

        const zip = new AdmZip(archivePath);

        const tempExtractPath = path.join(ghostliteDir, 'temp-jcef-extract');
        ensureDirectoryExists(tempExtractPath);

        zip.extractAllTo(tempExtractPath, true);
        log.info('ZIP extracted successfully');

        const extractedItems = fs.readdirSync(tempExtractPath);
        log.info('Extracted items:', extractedItems);

        if (extractedItems.length === 1 && fs.statSync(path.join(tempExtractPath, extractedItems[0])).isDirectory()) {
            const nestedFolderPath = path.join(tempExtractPath, extractedItems[0]);
            const nestedItems = fs.readdirSync(nestedFolderPath);

            for (const item of nestedItems) {
                const sourcePath = path.join(nestedFolderPath, item);
                const destPath = path.join(jcefBundlePath, item);

                if (fs.statSync(sourcePath).isDirectory()) {
                    copyRecursively(sourcePath, destPath);
                } else {
                    fs.copyFileSync(sourcePath, destPath);
                }
            }
        } else {
            for (const item of extractedItems) {
                const sourcePath = path.join(tempExtractPath, item);
                const destPath = path.join(jcefBundlePath, item);

                if (fs.statSync(sourcePath).isDirectory()) {
                    copyRecursively(sourcePath, destPath);
                } else {
                    fs.copyFileSync(sourcePath, destPath);
                }
            }
        }

        fs.rmSync(tempExtractPath, { recursive: true, force: true });
        fs.unlinkSync(archivePath);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 100,
                status: 'JCEF bundle ready!'
            });

            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', null);
                }
            }, 2000);
        }

        log.info('JCEF bundle downloaded and extracted successfully');

        try {
            const finalFiles = fs.readdirSync(jcefBundlePath);
            log.info('Final JCEF bundle contents:', finalFiles);
        } catch (err) {
            log.error('Could not read final JCEF bundle directory:', err);
        }

        return true;

    } catch (error) {
        log.error('Failed to download JCEF bundle:', error);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', null);
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            const result = await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'JCEF Download Failed',
                message: 'Failed to download JCEF bundle',
                detail: `Error: ${error.message}\n\nPlease check your internet connection and try again.`,
                buttons: ['Try Again', 'Cancel'],
                defaultId: 0
            });

            if (result.response === 0) {
                return await downloadJCEFBundle();
            }
        }

        return false;
    }
}

async function downloadGhostliteLauncher() {
    ensureDirectoryExists(ghostliteDir);

    const launcherJarPath = path.join(ghostliteDir, 'ghostlite-launcher.jar');

    if (fs.existsSync(launcherJarPath)) {
        log.info('ghostlite-launcher.jar already exists');
        return true;
    }

    try {
        log.info('Downloading ghostlite-launcher.jar...');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 0,
                status: 'Downloading ghostlite-launcher.jar...'
            });
        }

        const launcherUrl = 'https://github.com/booznh/account-launcher/releases/download/ghostlite-launcher/ghostlite-launcher.jar';
        log.info(`Downloading launcher from: ${launcherUrl}`);

        const response = await axios({
            method: 'get',
            url: launcherUrl,
            responseType: 'arraybuffer',
            timeout: 300000,
            onDownloadProgress: (progressEvent) => {
                const percent = progressEvent.total
                    ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    : 0;

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', {
                        percent,
                        status: `Downloading ghostlite-launcher.jar... ${percent}%`
                    });
                }
            }
        });

        fs.writeFileSync(launcherJarPath, response.data);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 100,
                status: 'ghostlite-launcher.jar downloaded successfully!'
            });

            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', null);
                }
            }, 2000);
        }

        log.info('ghostlite-launcher.jar downloaded successfully');
        return true;

    } catch (error) {
        log.error('Failed to download ghostlite-launcher.jar:', error);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', null);
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            const result = await dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Download Failed',
                message: 'Failed to download ghostlite-launcher.jar',
                detail: `Error: ${error.message}\n\nPlease check your internet connection and try again.`,
                buttons: ['Try Again', 'Cancel'],
                defaultId: 0
            });

            if (result.response === 0) {
                return await downloadGhostliteLauncher();
            }
        }

        return false;
    }
}

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

function setupAutoDownloadOnStartup() {
    const ensureAtLeastOneJarExists = async () => {
        try {
            const existingJars = fs.readdirSync(ghostliteDir)
                .filter(f => f.startsWith('microbot-') && f.endsWith('.jar'))
                .filter(f => f !== 'ghostlite-launcher.jar');

            if (existingJars.length > 0) {
                log.info(`Found ${existingJars.length} existing client JAR(s):`, existingJars);
                return false; // Didn't download anything new
            }

            log.info('No client JAR files found, downloading latest version...');

            const info = await getLatestVersionInfo();
            if (!info) {
                log.error('Could not get latest version info for auto-download');
                return false;
            }

            log.info(`Auto-downloading latest version: ${info.version}`);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', {
                    percent: 0,
                    status: `Auto-downloading ${info.jarName}...`
                });
            }

            const response = await axios({
                method: 'get',
                url: info.downloadUrl,
                responseType: 'arraybuffer',
                timeout: 60000,
                onDownloadProgress: (progressEvent) => {
                    const percent = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-progress', {
                            percent,
                            status: `Auto-downloading ${info.jarName}... ${percent}%`
                        });
                    }
                }
            });

            const jarPath = path.join(ghostliteDir, info.jarName);
            fs.writeFileSync(jarPath, response.data);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', {
                    percent: 100,
                    status: `${info.jarName} downloaded successfully!`
                });

                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-progress', null);
                    }
                }, 3000);
            }

            log.info(`Successfully auto-downloaded: ${info.jarName}`);
            return true; // Downloaded something new

        } catch (error) {
            log.error('Failed to auto-download latest version:', error);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', null);
            }

            return false;
        }
    };

    // Add the IPC handler
    ipcMain.handle('ensure-client-jar-exists', async () => {
        return await ensureAtLeastOneJarExists();
    });

    // IMPORTANT: Return the function so initializeApp can use it
    return { ensureAtLeastOneJarExists };
}

async function initializeApp() {
    try {
        const { ensureAtLeastOneJarExists } = setupAutoDownloadOnStartup();

        log.info('Checking for existing client JARs...');
        const downloadedNewJar = await ensureAtLeastOneJarExists();

        log.info('App initialization complete');

        // Notify frontend that initialization is complete
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-initialized', { downloadedNewJar });
        }

    } catch (error) {
        log.error('Failed to initialize app:', error);
    }
}

let mainWindow;

autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('checking-for-update');
    }
});

autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available');
    }
});

autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available');
    }
});

autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', err.message);
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded');
    }
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
        title: `Account Launcher & Manager v${app.getVersion()}`,
        center: true,
        icon: path.join(__dirname, 'images', process.platform === 'win32' ? 'app-icon.ico' : 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
    await mainWindow.loadURL(startUrl);

    mainWindow.setMenu(null);
    log.info('URL loaded, showing window.');

    if (!isDev) {
        setTimeout(() => {
            autoUpdater.checkForUpdates();
        }, 3000);
    }

    if (isDev) mainWindow.webContents.openDevTools();
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    mainWindow.on('closed', () => (mainWindow = null));
    watchAccountsFile(mainWindow);

    setTimeout(async () => {
        await initializeApp();
    }, 2000);
}

function setupIpcHandlers() {
    const deps = { ipcMain, ghostliteDir, fs, path, log, spawn, dialog, shell, axios, http, os };

    ipcMain.handle('get-launcher-version', () => app.getVersion());

    ipcMain.handle('check-for-updates', async () => {
        log.info('Manual update check requested');
        try {
            const result = await autoUpdater.checkForUpdates();
            log.info('Update check result:', result);
            return { success: true };
        } catch (error) {
            log.error('Update check failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-dependencies', async () => {
        const vcppInstalled = checkVisualCppRedist();
        const jcefBundlePath = path.join(ghostliteDir, 'jcef-bundle');
        const jcefInstalled = fs.existsSync(jcefBundlePath);

        return {
            vcppInstalled,
            jcefInstalled,
            dependencies: {
                'Visual C++ 2015-2022 Redistributable': vcppInstalled,
                'JCEF Bundle': jcefInstalled
            }
        };
    });

    setupAccountsHandlers(deps);
    setupLegacyAccountsHandlers(deps);
    setupGameLaunchHandlers(deps);
    setupPropertiesHandlers(deps);
    setupVersionHandlers(deps);
    setupDownloadHandlers(deps);
}

function watchAccountsFile(window) {
    const accountsPath = path.resolve(ghostliteDir, 'accounts.json');
    if (fs.existsSync(accountsPath)) {
        fs.watch(accountsPath, (e) => {
            if (e === 'change' && window && !window.isDestroyed()) {
                window.webContents.send('accounts-file-changed');
            }
        });
    }
}

function setupAccountsHandlers({ ipcMain, ghostliteDir, fs, path, log, os }) {
    const accountsPath = path.resolve(ghostliteDir, 'accounts.json');

    const readAccounts = () => {
        if (!fs.existsSync(accountsPath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(accountsPath, 'utf8').trim();
            if (!content) {
                return [];
            }
            return JSON.parse(content);
        } catch (error) {
            log.error('Error parsing accounts.json:', error.message);
            log.info('Creating backup and resetting accounts.json');

            const backupPath = path.resolve(ghostliteDir, `accounts_backup_${Date.now()}.json`);
            try {
                fs.copyFileSync(accountsPath, backupPath);
                log.info(`Backed up corrupted file to: ${backupPath}`);
            } catch (backupError) {
                log.error('Failed to create backup:', backupError.message);
            }

            fs.writeFileSync(accountsPath, '[]', 'utf8');
            return [];
        }
    };

    ipcMain.handle('read-accounts', async () => readAccounts());

    ipcMain.handle('save-account-proxy', async (event, { accountId, proxy }) => {
        let accounts = readAccounts();
        const i = accounts.findIndex(a => a.accountId === accountId);
        if (i > -1) {
            accounts[i].proxy = proxy;
            fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf8');
            return { success: true };
        }
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

function setupLegacyAccountsHandlers({ ipcMain, ghostliteDir, fs, path }) {
    const legacyPath = path.resolve(ghostliteDir, 'legacy_accounts.json');

    ipcMain.handle('read-legacy-accounts', async () =>
        fs.existsSync(legacyPath) ? JSON.parse(fs.readFileSync(legacyPath, 'utf8')) : []
    );

    ipcMain.handle('save-legacy-accounts', async (event, accounts) => {
        const withIds = accounts.map(a => a.id && !a.id.startsWith('new-') ? a : { ...a, id: uuidv4() });
        fs.writeFileSync(legacyPath, JSON.stringify(withIds, null, 2), 'utf8');
        return { success: true, accounts: withIds };
    });
}

function setupGameLaunchHandlers({ ipcMain, spawn, path, ghostliteDir, log, dialog, shell, http, os }) {
    const startCredServer = (user, pass) => new Promise((res) =>
        http.createServer((req, resp) => {
            resp.writeHead(200, { 'Content-Type': 'application/json' });
            resp.end(JSON.stringify({ username: user, password: pass }));
            req.socket.server.close();
        }).listen(0, function() { res(this.address().port); })
    );

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
            // Add JCEF close event emission
            if (processType === 'jcef') {
                log.info('JCEF process closed, notifying frontend...');
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('jcef-closed');
                }
            }

            [childProcesses, clientProcesses, jcefProcesses].forEach(arr => {
                const i = arr.indexOf(p);
                if (i > -1) arr.splice(i, 1);
            });
        });
    };

    const run = (args, processType = 'other') => isJava(ok => ok ? execJar(args, processType) :
        dialog.showMessageBox({
            type: 'error',
            title: 'Java Not Found',
            message: 'Java is required. Download now?',
            buttons: ['Yes', 'No']
        }).then(r => r.response === 0 && shell.openExternal('https://www.oracle.com/java/technologies/downloads/'))
    );

    const ensureJarExists = async (version) => {
        const jarPath = path.join(ghostliteDir, version);

        if (fs.existsSync(jarPath)) {
            log.info(`JAR file already exists: ${version}`);
            return true;
        }

        log.info(`JAR file missing, downloading: ${version}`);

        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', {
                    percent: 0,
                    status: `Downloading ${version}...`
                });
            }

            const versionMatch = version.match(/microbot-(.+)\.jar$/);
            if (!versionMatch) {
                throw new Error(`Invalid JAR filename format: ${version}`);
            }

            const versionNumber = versionMatch[1];
            const downloadUrl = `https://gitlab.com/osrsislamg-group/microbot-releases/-/raw/main/microbot-${versionNumber}.jar`;

            log.info(`Downloading from: ${downloadUrl}`);

            const response = await axios({
                method: 'get',
                url: downloadUrl,
                responseType: 'arraybuffer',
                timeout: 60000,
                onDownloadProgress: (progressEvent) => {
                    const percent = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-progress', {
                            percent,
                            status: `Downloading ${version}... ${percent}%`
                        });
                    }
                }
            });

            fs.writeFileSync(jarPath, response.data);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', {
                    percent: 100,
                    status: `${version} downloaded successfully!`
                });

                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-progress', null);
                    }
                }, 2000);
            }

            log.info(`Successfully downloaded: ${version}`);
            return true;

        } catch (error) {
            log.error(`Failed to download ${version}:`, error);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', null);

                await dialog.showMessageBox(mainWindow, {
                    type: 'error',
                    title: 'Download Failed',
                    message: `Failed to download ${version}`,
                    detail: `Error: ${error.message}\n\nPlease try again or download manually.`,
                    buttons: ['OK']
                });
            }

            return false;
        }
    };

    ipcMain.handle('open-client', async (event, options) => {
        log.info('open-client called with options:', JSON.stringify(options));
        const { version, proxy, username, password, clientType = 'microbot' } = options || {};

        if (!version) {
            log.error('No version specified for client launch');
            return { success: false, error: 'Version is required' };
        }

        // Determine which JAR to use based on clientType
        let jarToLaunch;
        let isExecutable = false;

        if (clientType === 'runelite') {
            // Look for RuneLite in common locations
            const possiblePaths = [
                path.join(ghostliteDir, 'runelite-client.jar'),
                path.join(ghostliteDir, 'RuneLite.jar'),
                path.join(os.homedir(), '.runelite', 'RuneLite.jar'),
                path.join(os.homedir(), 'Downloads', 'RuneLite.jar'),
            ];

            // Add Windows-specific paths (including .exe)
            if (process.platform === 'win32') {
                const username = os.userInfo().username;
                possiblePaths.push(
                    // Check for the .exe file first (most common)
                    path.join('C:\\Users', username, 'AppData\\Local\\RuneLite\\RuneLite.exe'),
                    path.join(os.homedir(), 'AppData', 'Local', 'RuneLite', 'RuneLite.exe'),
                    // Also check for JAR files in RuneLite directory
                    path.join('C:\\Users', username, 'AppData\\Local\\RuneLite\\RuneLite.jar'),
                    path.join(os.homedir(), 'AppData', 'Local', 'RuneLite', 'RuneLite.jar'),
                    // Other possible locations
                    'C:\\Program Files\\RuneLite\\RuneLite.jar',
                    'C:\\Program Files (x86)\\RuneLite\\RuneLite.jar'
                );
            }

            // Add macOS-specific paths
            if (process.platform === 'darwin') {
                possiblePaths.push('/Applications/RuneLite.app/Contents/MacOS/RuneLite.jar');
            }

            let foundRuneLite = false;
            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    jarToLaunch = possiblePath;
                    isExecutable = possiblePath.endsWith('.exe');
                    foundRuneLite = true;
                    log.info(`Found RuneLite at: ${possiblePath}`);
                    break;
                }
            }

            if (!foundRuneLite) {
                // Try to find any runelite jar in the launcher directory
                try {
                    const availableJars = fs.readdirSync(ghostliteDir)
                        .filter(f => f.toLowerCase().includes('runelite') && f.endsWith('.jar'));

                    if (availableJars.length > 0) {
                        jarToLaunch = path.join(ghostliteDir, availableJars[0]);
                        foundRuneLite = true;
                        log.info(`Found RuneLite JAR: ${availableJars[0]}`);
                    }
                } catch (error) {
                    log.error('Error scanning for RuneLite JARs:', error);
                }
            }

            if (!foundRuneLite) {
                return {
                    success: false,
                    error: 'RuneLite not found. Please install RuneLite or place RuneLite.jar in the launcher directory.'
                };
            }
        } else {
            // Use microbot JAR (existing behavior)
            const jarExists = await ensureJarExists(version);
            if (!jarExists) {
                return { success: false, error: `Failed to download ${version}` };
            }
            jarToLaunch = version;
        }

        const args = [];

        // Handle different account types
        if (username && password) {
            if (options.accountId) {
                // JAGEX ACCOUNT
                log.info(`Launching Jagex account with ${clientType}`);

                if (clientType === 'runelite') {
                    args.push(`-Drunelite.api.port=${await startCredServer(username, password)}`);
                    args.push('--jagex-launcher');
                } else {
                    args.push(`-Drunelite.api.port=${await startCredServer(username, password)}`);
                    args.push('--clean-jagex-launcher');
                }

                // Write Jagex credentials to credentials.properties
                const rlDir = path.join(os.homedir(), '.runelite');
                if (!fs.existsSync(rlDir)) {
                    fs.mkdirSync(rlDir, { recursive: true });
                }

                const accountsPath = path.resolve(ghostliteDir, 'accounts.json');
                const readAccounts = () => {
                    if (!fs.existsSync(accountsPath)) return [];
                    try {
                        const content = fs.readFileSync(accountsPath, 'utf8').trim();
                        return content ? JSON.parse(content) : [];
                    } catch (error) {
                        log.error('Error reading accounts for launch:', error.message);
                        return [];
                    }
                };

                const jagexAccounts = readAccounts();
                const account = jagexAccounts.find(acc => acc.accountId === options.accountId);

                if (account) {
                    const credentialsProps = `#Do not share this file\n#${new Date()}\nJX_CHARACTER_ID=${account.accountId}\nJX_SESSION_ID=${account.sessionId}\nJX_DISPLAY_NAME=${account.displayName}\n`;
                    fs.writeFileSync(path.join(rlDir, 'credentials.properties'), credentialsProps, 'utf8');
                    log.info('Updated credentials.properties for Jagex account');
                }
            } else {
                // LEGACY ACCOUNT
                log.info(`Launching legacy account with ${clientType} - clearing Jagex credentials`);

                const rlDir = path.join(os.homedir(), '.runelite');
                const credentialsPath = path.join(rlDir, 'credentials.properties');

                if (fs.existsSync(credentialsPath)) {
                    try {
                        fs.unlinkSync(credentialsPath);
                        log.info('Cleared credentials.properties file');
                    } catch (error) {
                        log.warn('Failed to clear credentials.properties:', error.message);
                        try {
                            const emptyCredentials = `#Cleared for legacy account\n#${new Date()}\n`;
                            fs.writeFileSync(credentialsPath, emptyCredentials, 'utf8');
                            log.info('Overwrote credentials.properties with empty content');
                        } catch (writeError) {
                            log.error('Failed to overwrite credentials.properties:', writeError.message);
                        }
                    }
                }

                if (clientType === 'microbot') {
                    args.push(`-Dmb.user=${username}`);
                    args.push(`-Dmb.pass=${password}`);
                    log.info('Added auto-login VM arguments for legacy account');
                } else {
                    args.push(`-Drunelite.api.port=${await startCredServer(username, password)}`);
                    log.info('Added RuneLite API credentials for legacy account');
                }
            }
        }

        // Add the executable/JAR file and arguments
        if (clientType === 'runelite') {
            if (isExecutable) {
                log.info(`Launching RuneLite executable: ${jarToLaunch}`);

                const execArgs = [];
                if (proxy?.ip) {
                    execArgs.push(`--proxy=${proxy.ip}`, `--proxy-type=${proxy.type || 'http'}`);
                }

                const p = spawn(jarToLaunch, execArgs, { stdio: 'ignore', detached: true });
                clientProcesses.push(p);
                p.unref();

                p.on('close', () => {
                    const i = clientProcesses.indexOf(p);
                    if (i > -1) clientProcesses.splice(i, 1);
                });

                log.info(`Launched RuneLite executable: ${jarToLaunch} ${execArgs.join(' ')}`);
                return { success: true, clientType };
            } else {
                args.push('-jar', jarToLaunch);
            }
        } else {
            args.push('-jar', path.join(ghostliteDir, jarToLaunch));
        }

        // Add proxy arguments if provided (only for JAR files)
        if (proxy?.ip && !isExecutable) {
            args.push(`--proxy=${proxy.ip}`, `--proxy-type=${proxy.type || 'http'}`);
        }

        if (!isExecutable) {
            const safeArgs = args.map(arg =>
                arg.includes('-Dmb.pass=') ? '-Dmb.pass=***' :
                    arg.includes('password') ? '***' : arg
            );
            log.info(`Launching ${clientType} client: java ${safeArgs.join(' ')}`);

            run(args, 'client');
        }

        return { success: true, clientType };
    });

    ipcMain.handle('check-runelite-availability', async () => {
        const possiblePaths = [
            path.join(ghostliteDir, 'runelite-client.jar'),
            path.join(ghostliteDir, 'RuneLite.jar'),
            path.join(os.homedir(), '.runelite', 'RuneLite.jar'),
            path.join(os.homedir(), 'Downloads', 'RuneLite.jar'),
        ];

        if (process.platform === 'win32') {
            const username = os.userInfo().username;
            possiblePaths.push(
                path.join('C:\\Users', username, 'AppData\\Local\\RuneLite\\RuneLite.exe'),
                path.join(os.homedir(), 'AppData', 'Local', 'RuneLite', 'RuneLite.exe'),
                path.join('C:\\Users', username, 'AppData\\Local\\RuneLite\\RuneLite.jar'),
                path.join(os.homedir(), 'AppData', 'Local', 'RuneLite', 'RuneLite.jar'),
            );
        }

        if (process.platform === 'darwin') {
            possiblePaths.push('/Applications/RuneLite.app/Contents/MacOS/RuneLite.jar');
        }

        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                log.info(`Found RuneLite at: ${possiblePath}`);
                return { available: true, path: possiblePath };
            }
        }

        // Try to find any runelite jar in the launcher directory
        try {
            const availableJars = fs.readdirSync(ghostliteDir)
                .filter(f => f.toLowerCase().includes('runelite') && f.endsWith('.jar'));

            if (availableJars.length > 0) {
                const foundPath = path.join(ghostliteDir, availableJars[0]);
                log.info(`Found RuneLite JAR: ${availableJars[0]}`);
                return { available: true, path: foundPath };
            }
        } catch (error) {
            log.error('Error scanning for RuneLite JARs:', error);
        }

        return { available: false, path: null };
    });

    ipcMain.handle('browse-for-runelite', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select RuneLite JAR',
            filters: [
                { name: 'JAR Files', extensions: ['jar'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled) {
            return { canceled: true };
        }

        const selectedPath = result.filePaths[0];
        const fileName = path.basename(selectedPath);
        const targetPath = path.join(ghostliteDir, fileName);

        try {
            fs.copyFileSync(selectedPath, targetPath);
            log.info(`Copied RuneLite JAR to: ${targetPath}`);
            return { success: true, path: targetPath, fileName: fileName };
        } catch (error) {
            log.error('Failed to copy RuneLite JAR:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-latest-version-and-download', async () => {
        const info = await getLatestVersionInfo();
        if (!info) {
            return { success: false, error: 'Could not get latest version info' };
        }

        const isDownloaded = fs.existsSync(path.join(ghostliteDir, info.jarName));

        if (!isDownloaded) {
            log.info('Latest version not found locally, downloading...');
            const downloaded = await ensureJarExists(info.jarName);
            return {
                ...info,
                isDownloaded: downloaded,
                justDownloaded: downloaded
            };
        }

        return { ...info, isDownloaded: true };
    });

    ipcMain.handle('open-launcher', async () => {
        try {
            if (!checkVisualCppRedist()) {
                log.warn('Visual C++ Redistributable not found');
                const installed = await promptInstallVisualCpp();
                if (!installed) {
                    return {
                        success: false,
                        error: 'Visual C++ Redistributable is required. Please install it and try again.'
                    };
                }
            }

            const jcefReady = await downloadJCEFBundle();
            if (!jcefReady) {
                return {
                    success: false,
                    error: 'Failed to prepare JCEF bundle. Please check your internet connection.'
                };
            }

            const launcherReady = await downloadGhostliteLauncher();
            if (!launcherReady) {
                return {
                    success: false,
                    error: 'Failed to download ghostlite-launcher.jar. Please check your internet connection.'
                };
            }

            const launcherJar = 'ghostlite-launcher.jar';
            const jcefBundlePath = path.join(ghostliteDir, 'jcef-bundle');

            const launcherJarPath = path.join(ghostliteDir, launcherJar);
            if (!fs.existsSync(launcherJarPath)) {
                return {
                    success: false,
                    error: 'ghostlite-launcher.jar not found after download attempt.'
                };
            }

            const args = [
                `-Djava.library.path=${jcefBundlePath}`,
                '-jar',
                launcherJarPath
            ];

            log.info('Launching JCEF with:', args.join(' '));
            run(args, 'jcef');

            return { success: true };

        } catch (error) {
            log.error('Failed to launch JCEF:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupPropertiesHandlers({ ipcMain, ghostliteDir, fs, path }) {
    const propsPath = path.resolve(ghostliteDir, 'resource_versions.json');
    const defaults = { version_pref: '' };

    ipcMain.handle('read-properties', async () =>
        fs.existsSync(propsPath) ? JSON.parse(fs.readFileSync(propsPath, 'utf8')) :
            (fs.writeFileSync(propsPath, JSON.stringify(defaults)), defaults)
    );

    ipcMain.handle('write-properties', async (event, data) => {
        fs.writeFileSync(propsPath, JSON.stringify(data, null, 2));
        return { success: true };
    });
}

function setupVersionHandlers({ ipcMain, ghostliteDir, fs, path }) {
    const listJars = () => fs.readdirSync(ghostliteDir)
        .filter(f => f.startsWith('microbot-') && f.endsWith('.jar'))
        .filter(f => f !== 'ghostlite-launcher.jar')
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    ipcMain.handle('list-jars', async () => listJars());

    ipcMain.handle('delete-jars', async (event, { keep = [] }) => {
        listJars().filter(j => !keep.includes(j)).forEach(j => fs.unlinkSync(path.join(ghostliteDir, j)));
        return { success: true };
    });

    ipcMain.handle('check-latest-version', async () => {
        const info = await getLatestVersionInfo();
        if (info) return { ...info, isDownloaded: fs.existsSync(path.join(ghostliteDir, info.jarName)) };
        return null;
    });

    ipcMain.handle('get-all-versions', async () => {
        const info = await getLatestVersionInfo();
        return { latest: info, allVersions: info?.allVersions || [] };
    });
}

function setupDownloadHandlers({ ipcMain, axios, fs, path, ghostliteDir, dialog }) {
    const dl = async (fName, url, sender) => {
        const fPath = path.join(ghostliteDir, fName);
        if (fs.existsSync(fPath)) return { success: true, fileName: fName, alreadyExists: true };

        const res = await axios({
            method: 'get',
            url,
            responseType: 'arraybuffer',
            timeout: 60000,
            onDownloadProgress: e => sender.send('download-progress', {
                percent: e.total ? Math.round((e.loaded * 100) / e.total) : 0,
                status: `Downloading ${fName}...`
            })
        });

        fs.writeFileSync(fPath, res.data);
        return { success: true, fileName: fName };
    };

    ipcMain.handle('download-version', async (e, v) =>
        dl(`microbot-${v}.jar`, `https://gitlab.com/osrsislamg-group/microbot-releases/-/raw/main/microbot-${v}.jar`, e.sender)
    );

    ipcMain.handle('download-latest-version', async (e) => {
        const info = await getLatestVersionInfo();
        if (!info) throw new Error('Could not get latest version');
        return dl(info.jarName, info.downloadUrl, e.sender);
    });

    ipcMain.handle('load-custom-jar', async () => {
        const res = await dialog.showOpenDialog({
            title: 'Select JAR',
            filters: [{ name: 'JAR Files', extensions: ['jar'] }],
            properties: ['openFile']
        });

        if (res.canceled) return { canceled: true };

        const fName = path.basename(res.filePaths[0]);
        fs.copyFileSync(res.filePaths[0], path.join(ghostliteDir, fName));
        return { success: true, fileName: fName };
    });
}

app.whenReady().then(() => { setupIpcHandlers(); createWindow(); });
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());

const killJcefProcesses = () => {
    log.info('Killing all JCEF-related processes...');
    if (process.platform === 'win32') {
        exec('taskkill /f /im jcef_helper.exe', (error) => {
            if (error && !error.message.includes('not found')) {
                log.warn('Could not kill jcef_helper.exe:', error.message);
            } else {
                log.info('jcef_helper.exe processes terminated');
            }
        });

        const jcefCommands = [
            'wmic process where "name=\'java.exe\' and commandline like \'%jcef%\'" delete',
            'wmic process where "name=\'java.exe\' and commandline like \'%ghostlite-launcher%\'" delete',
            'wmic process where "name=\'javaw.exe\' and commandline like \'%jcef%\'" delete',
            'wmic process where "name=\'javaw.exe\' and commandline like \'%ghostlite-launcher%\'" delete'
        ];

        jcefCommands.forEach(cmd => {
            exec(cmd, (error) => {
                if (error && !error.message.includes('not found')) {
                    log.warn(`Command failed: ${cmd}`, error.message);
                }
            });
        });
    } else {
        exec('pkill -f jcef', (error) => {
            if (error && error.code !== 1) {
                log.warn('Could not kill JCEF processes on Unix:', error.message);
            }
        });
        exec('pkill -f ghostlite-launcher', (error) => {
            if (error && error.code !== 1) {
                log.warn('Could not kill launcher processes on Unix:', error.message);
            }
        });
    }
};

app.on('before-quit', () => {
    log.info('Launcher closing - killing JCEF processes but leaving game clients running');
    jcefProcesses.forEach(p => {
        try {
            p.kill('SIGTERM');
            setTimeout(() => {
                try {
                    p.kill('SIGKILL');
                } catch (e) {
                    /* Process might already be dead */
                }
            }, 2000);
        } catch (e) {
            log.error('Error killing JCEF process:', e);
        }
    });

    childProcesses.forEach(p => {
        try {
            p.kill('SIGTERM');
        } catch (e) {
            log.error('Error killing child process:', e);
        }
    });

    killJcefProcesses();
});

app.on('window-all-closed', () => {
    killJcefProcesses();
    if (process.platform !== 'darwin') app.quit();
});