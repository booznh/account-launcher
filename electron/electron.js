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

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

const GITLAB_CONFIG = {
    projectUrl: 'https://gitlab.com/osrsislamg-group/ghostlite-launcher',
    configUrl: 'https://gitlab.com/osrsislamg-group/ghostlite-launcher/-/raw/main/launcher-config.json'
};

const childProcesses = [];
const clientProcesses = [];
const jcefProcesses = [];

const microbotDir = path.join(os.homedir(), '.microbot');
if (!fs.existsSync(microbotDir)) fs.mkdirSync(microbotDir, { recursive: true });

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

async function downloadMicrobotLauncher() {
    const launcherJarPath = path.join(microbotDir, 'microbot-launcher.jar');

    if (fs.existsSync(launcherJarPath)) {
        log.info('microbot-launcher.jar already exists');
        return true;
    }

    try {
        log.info('Downloading microbot-launcher.jar...');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 0,
                status: 'Downloading microbot-launcher.jar...'
            });
        }

        const filestorage = 'https://files.microbot.cloud';
        const launcherUrl = `${filestorage}/assets/microbot-launcher/microbot-launcher.jar`;

        log.info(`Downloading launcher from: ${launcherUrl}`);

        const response = await axios({
            method: 'get',
            url: launcherUrl,
            responseType: 'arraybuffer',
            timeout: 300000, // 5 minutes
            onDownloadProgress: (progressEvent) => {
                const percent = progressEvent.total
                    ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    : 0;

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', {
                        percent,
                        status: `Downloading microbot-launcher.jar... ${percent}%`
                    });
                }
            }
        });

        fs.writeFileSync(launcherJarPath, response.data);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 100,
                status: 'microbot-launcher.jar downloaded successfully!'
            });

            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', null);
                }
            }, 2000);
        }

        log.info('microbot-launcher.jar downloaded successfully');
        return true;

    } catch (error) {
        log.error('Failed to download microbot-launcher.jar:', error);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', null);
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            const result = await dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Download Failed',
                message: 'Failed to download microbot-launcher.jar',
                detail: `Error: ${error.message}\n\nPlease check your internet connection and try again.`,
                buttons: ['Try Again', 'Cancel'],
                defaultId: 0
            });

            if (result.response === 0) {
                return await downloadMicrobotLauncher();
            }
        }

        return false;
    }
}

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

async function downloadJCEFBundle() {
    ensureDirectoryExists(microbotDir);

    const jcefBundlePath = path.join(microbotDir, 'jcef-bundle');

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

        const archivePath = path.join(microbotDir, 'jcef-bundle.zip');
        fs.writeFileSync(archivePath, response.data);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
                percent: 90,
                status: 'Extracting JCEF bundle...'
            });
        }

        const AdmZip = require('adm-zip');
        const zip = new AdmZip(archivePath);

        const tempExtractPath = path.join(microbotDir, 'temp-jcef-extract');
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

        const essentialFiles = ['jcef.jar'];
        const missingFiles = essentialFiles.filter(file =>
            !fs.existsSync(path.join(jcefBundlePath, file))
        );

        if (missingFiles.length > 0) {
            log.warn('Some essential JCEF files are missing:', missingFiles);
        } else {
            log.info('All essential JCEF files found!');
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

async function extractRarFile(archivePath, extractPath) {
    try {
        // Option 1: Try using 7-Zip if available
        const { spawn } = require('child_process');

        // Try 7zip first (most common)
        const sevenZipPaths = [
            'C:\\Program Files\\7-Zip\\7z.exe',
            'C:\\Program Files (x86)\\7-Zip\\7z.exe',
            '7z' // If it's in PATH
        ];

        for (const zipPath of sevenZipPaths) {
            try {
                await new Promise((resolve, reject) => {
                    const extractProcess = spawn(zipPath, ['x', archivePath, `-o${extractPath}`, '-y'], {
                        stdio: 'pipe'
                    });

                    extractProcess.on('close', (code) => {
                        if (code === 0) {
                            log.info('RAR extracted successfully with 7-Zip');
                            resolve();
                        } else {
                            reject(new Error(`7-Zip extraction failed with code ${code}`));
                        }
                    });

                    extractProcess.on('error', (error) => {
                        reject(error);
                    });
                });
                return; // Success, exit function
            } catch (err) {
                log.warn(`Failed to extract with ${zipPath}:`, err.message);
                continue; // Try next path
            }
        }

        // Option 2: Try WinRAR if 7-Zip failed
        const winrarPaths = [
            'C:\\Program Files\\WinRAR\\unrar.exe',
            'C:\\Program Files (x86)\\WinRAR\\unrar.exe',
            'unrar' // If it's in PATH
        ];

        for (const rarPath of winrarPaths) {
            try {
                await new Promise((resolve, reject) => {
                    const extractProcess = spawn(rarPath, ['x', archivePath, extractPath], {
                        stdio: 'pipe'
                    });

                    extractProcess.on('close', (code) => {
                        if (code === 0) {
                            log.info('RAR extracted successfully with WinRAR');
                            resolve();
                        } else {
                            reject(new Error(`WinRAR extraction failed with code ${code}`));
                        }
                    });

                    extractProcess.on('error', (error) => {
                        reject(error);
                    });
                });
                return; // Success, exit function
            } catch (err) {
                log.warn(`Failed to extract with ${rarPath}:`, err.message);
                continue; // Try next path
            }
        }

        // If we get here, no extraction method worked
        throw new Error('No RAR extraction tool found. Please install 7-Zip or WinRAR.');

    } catch (error) {
        log.error('RAR extraction failed:', error);
        throw error;
    }
}

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log.info(`Created directory: ${dirPath}`);
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

let mainWindow;

// --- Auto-Updater Event Handling ---
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
        title: `Ghostlite Launcher v${app.getVersion()}`,
        center: true,
        icon: path.join(__dirname, 'images/rounded-icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
    await mainWindow.loadURL(startUrl);
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
}

function setupIpcHandlers() {
    const deps = { ipcMain, microbotDir, fs, path, log, spawn, dialog, shell, axios, http, os };

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
        const jcefBundlePath = path.join(microbotDir, 'jcef-bundle');
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

    // Helper function to download a specific version if missing
    const ensureJarExists = async (version) => {
        const jarPath = path.join(microbotDir, version);

        if (fs.existsSync(jarPath)) {
            log.info(`JAR file already exists: ${version}`);
            return true;
        }

        log.info(`JAR file missing, downloading: ${version}`);

        try {
            // Show download progress
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-progress', {
                    percent: 0,
                    status: `Downloading ${version}...`
                });
            }

            // Extract version number from filename (e.g., microbot-1.9.7.jar -> 1.9.7)
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

                // Clear progress after 2 seconds
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

    // UPDATED open-client handler with auto-download
    ipcMain.handle('open-client', async (event, options) => {
        log.info('open-client called with options:', JSON.stringify(options));
        const { version, proxy, username, password } = options || {};

        if (!version) {
            log.error('No version specified for client launch');
            return { success: false, error: 'Version is required' };
        }

        // Ensure the JAR file exists, download if missing
        const jarExists = await ensureJarExists(version);
        if (!jarExists) {
            return { success: false, error: `Failed to download ${version}` };
        }

        const args = [];
        if (username && password) args.push(`-Drunelite.api.port=${await startCredServer(username, password)}`);
        args.push('-jar', path.join(microbotDir, version));
        if (proxy?.ip) args.push(`--proxy=${proxy.ip}`, `--proxy-type=${proxy.type || 'http'}`);
        if (username) args.push('--clean-jagex-launcher');

        run(args, 'client');
        return { success: true };
    });

    // Updated check-latest-version to also auto-download if requested
    ipcMain.handle('check-latest-version-and-download', async () => {
        const info = await getLatestVersionInfo();
        if (!info) {
            return { success: false, error: 'Could not get latest version info' };
        }

        const isDownloaded = fs.existsSync(path.join(microbotDir, info.jarName));

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

    // Keep your existing open-launcher handler
    ipcMain.handle('open-launcher', async () => {
        try {
            // Check Visual C++ Redistributable
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

            // Check and download JCEF bundle if needed
            const jcefReady = await downloadJCEFBundle();
            if (!jcefReady) {
                return {
                    success: false,
                    error: 'Failed to prepare JCEF bundle. Please check your internet connection.'
                };
            }

            // Check and download microbot-launcher.jar if needed
            const launcherReady = await downloadMicrobotLauncher();
            if (!launcherReady) {
                return {
                    success: false,
                    error: 'Failed to download microbot-launcher.jar. Please check your internet connection.'
                };
            }

            const launcherJar = 'microbot-launcher.jar';
            const jcefBundlePath = path.join(microbotDir, 'jcef-bundle');

            // Verify the launcher JAR exists
            const launcherJarPath = path.join(microbotDir, launcherJar);
            if (!fs.existsSync(launcherJarPath)) {
                return {
                    success: false,
                    error: 'microbot-launcher.jar not found after download attempt.'
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

function setupPropertiesHandlers({ ipcMain, microbotDir, fs, path }) {
    const propsPath = path.resolve(microbotDir, 'resource_versions.json');
    const defaults = { version_pref: '' };
    ipcMain.handle('read-properties', async () => fs.existsSync(propsPath) ? JSON.parse(fs.readFileSync(propsPath, 'utf8')) : (fs.writeFileSync(propsPath, JSON.stringify(defaults)), defaults));
    ipcMain.handle('write-properties', async (event, data) => (fs.writeFileSync(propsPath, JSON.stringify(data, null, 2)), { success: true }));
}

function setupVersionHandlers({ ipcMain, microbotDir, fs, path }) {
    const listJars = () => fs.readdirSync(microbotDir)
        .filter(f => f.startsWith('microbot-') && f.endsWith('.jar'))
        .filter(f => f !== 'microbot-launcher.jar')
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    ipcMain.handle('list-jars', async () => listJars());

    ipcMain.handle('delete-jars', async (event, { keep = [] }) => {
        listJars().filter(j => !keep.includes(j)).forEach(j => fs.unlinkSync(path.join(microbotDir, j)));
        return { success: true };
    });

    ipcMain.handle('check-latest-version', async () => {
        const info = await getLatestVersionInfo();
        if (info) return { ...info, isDownloaded: fs.existsSync(path.join(microbotDir, info.jarName)) };
        return null;
    });

    ipcMain.handle('get-all-versions', async () => {
        const info = await getLatestVersionInfo();
        return { latest: info, allVersions: info?.allVersions || [] };
    });
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