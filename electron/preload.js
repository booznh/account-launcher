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
    readProperties: () => ipcRenderer.invoke('read-properties'),
    writeProperties: (data) => ipcRenderer.invoke('write-properties', data),

    checkLauncherUpdates: () => ipcRenderer.invoke('check-launcher-updates'),
    downloadLauncherUpdate: (downloadUrl) => ipcRenderer.invoke('download-launcher-update', downloadUrl),
    installLauncherUpdate: (filePath) => ipcRenderer.invoke('install-launcher-update', filePath),
    openReleaseNotes: (url) => ipcRenderer.invoke('open-release-notes', url),

    on: (channel, callback) => {
        const newCallback = (_, data) => callback(data);
        ipcRenderer.on(channel, newCallback);
        return () => ipcRenderer.removeListener(channel, newCallback);
    }
});