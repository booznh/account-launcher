const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readAccounts: () => ipcRenderer.invoke('read-accounts'),
    saveAccountProxy: (data) => ipcRenderer.invoke('save-account-proxy', data),
    overwriteCredentialProperties: (character) => ipcRenderer.invoke('overwrite-credential-properties', character),
    removeJagexAccount: (accountId) => ipcRenderer.invoke('remove-jagex-account', accountId),
    readLegacyAccounts: () => ipcRenderer.invoke('read-legacy-accounts'),
    saveLegacyAccounts: (accounts) => ipcRenderer.invoke('save-legacy-accounts', accounts),

    openLauncher: () => ipcRenderer.invoke('open-launcher'),
    openClient: (launchOptions) => ipcRenderer.invoke('open-client', launchOptions),

    listJars: () => ipcRenderer.invoke('list-jars'),
    loadCustomJar: () => ipcRenderer.invoke('load-custom-jar'),
    downloadVersion: (version) => ipcRenderer.invoke('download-version', version),
    deleteJars: (options) => ipcRenderer.invoke('delete-jars', options),
    checkLatestVersion: () => ipcRenderer.invoke('check-latest-version'),
    getAllVersions: () => ipcRenderer.invoke('get-all-versions'),
    downloadLatestVersion: () => ipcRenderer.invoke('download-latest-version'),
    checkLatestVersionAndDownload: () => ipcRenderer.invoke('check-latest-version-and-download'),
    ensureClientJarExists: () => ipcRenderer.invoke('ensure-client-jar-exists'),

    readProperties: () => ipcRenderer.invoke('read-properties'),
    writeProperties: (data) => ipcRenderer.invoke('write-properties', data),

    getLauncherVersion: () => ipcRenderer.invoke('get-launcher-version'),
    restartApp: () => ipcRenderer.send('restart-app'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    checkDependencies: () => ipcRenderer.invoke('check-dependencies'),

    debugAccountLocations: () => ipcRenderer.invoke('debug-account-locations'),

    on: (channel, callback) => {
        const newCallback = (_, data) => callback(data);
        ipcRenderer.on(channel, newCallback);
        return () => ipcRenderer.removeListener(channel, newCallback);
    }
});