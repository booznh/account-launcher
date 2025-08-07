import React, { useState, useEffect, useCallback } from 'react';
import { Play, Plus, Trash2, Server, X, UploadCloud, Download, Check, Users, Fingerprint, CheckCircle, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

// --- Reusable Sub-components ---

// A dedicated component for the update notification bar
const UpdateNotification = ({ status, onRestart }) => {
    if (!status) return null;

    if (status === 'downloaded') {
        return (
            <div className="bg-emerald-500/90 text-white p-3 rounded-lg flex items-center justify-between shadow-lg mb-4">
                <div className="flex items-center space-x-2">
                    <Sparkles size={18} />
                    <span className="font-medium text-sm">A new version is ready!</span>
                </div>
                <button
                    onClick={onRestart}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm font-semibold"
                >
                    Restart & Update
                </button>
            </div>
        );
    }

    if (status === 'available') {
        return (
            <div className="bg-custom-blue/90 text-white p-3 rounded-lg flex items-center space-x-2 shadow-lg mb-4">
                <Download size={16} className="animate-pulse" />
                <span className="font-medium text-sm">Update found, downloading now...</span>
            </div>
        );
    }

    return null;
};

const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);
    const typeStyles = {
        success: 'bg-emerald-500/90 border-emerald-400',
        error: 'bg-red-500/90 border-red-400',
        info: 'bg-custom-blue/90 border-custom-blue',
    };
    return (
        <div className={`fixed top-5 right-5 p-4 rounded-lg text-white shadow-lg z-50 flex items-center space-x-2 backdrop-blur-md border ${typeStyles[type] || 'bg-gray-800/80'}`}>
            <span>{message}</span><button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/20"><X size={16}/></button>
        </div>
    );
};
const ProgressBar = ({ percent, status }) => (
    <div className="mt-3 overflow-hidden">
        <div className="p-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-gray-300">{status}</span><span className="text-xs font-mono text-custom-blue">{Math.round(percent)}%</span></div>
            <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden"><div className="h-1.5 bg-custom-blue rounded-full" style={{ width: `${percent}%` }} /></div>
        </div>
    </div>
);
const ProxySettingsModal = ({ account, onClose, onSave }) => {
    const [proxy, setProxy] = useState(account.proxy || { ip: '', type: 'http' });
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onClose}>
            <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-white">Proxy for {account.displayName}</h2><button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800/50"><X size={18} /></button></div>
                <div className="space-y-3">
                    <input type="text" placeholder="ip:port:user:pass (optional)" value={proxy.ip} onChange={(e) => setProxy({ ...proxy, ip: e.target.value })} className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-1.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-custom-blue" />
                    <select value={proxy.type} onChange={(e) => setProxy({ ...proxy, type: e.target.value })} className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-2 focus:ring-custom-blue"><option value="http">HTTP</option><option value="socks">SOCKS</option></select>
                </div>
                <div className="mt-5 flex justify-end space-x-2"><button onClick={onClose} className="px-3 py-1.5 rounded-md bg-gray-700 text-white hover:bg-gray-600">Cancel</button><button onClick={() => { onSave(account.accountId, proxy); onClose(); }} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90">Save</button></div>
            </div>
        </div>
    );
};
const VersionSelectionModal = ({ onClose, onDownload, latestVersionInfo, allVersionsInfo, clientVersions }) => {
    const [selectedVersion, setSelectedVersionLocal] = useState('');
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onClose}>
            <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-5 w-full max-w-xl mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-white">Select Version</h2><button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800/50"><X size={18} /></button></div>
                {latestVersionInfo && <div className="mb-3 p-3 bg-emerald-900/20 rounded-lg border border-emerald-800/50"><p className="text-sm text-emerald-300">Recommended: <span className="font-medium text-emerald-200">v{latestVersionInfo.version}</span></p></div>}
                <div className="space-y-2">
                    {allVersionsInfo.allVersions?.map(v => (<div key={v} className={`p-2 rounded-lg border cursor-pointer ${selectedVersion === v ? 'border-custom-blue bg-custom-blue/10' : 'border-gray-700 hover:bg-gray-800/50'}`} onClick={() => setSelectedVersionLocal(v)}><div className="flex items-center justify-between"><div className="flex items-center space-x-3"><span className="font-medium text-white">v{v}</span>{v === latestVersionInfo?.version && <span className="px-2 py-0.5 text-xs bg-emerald-900/30 text-emerald-200 rounded-full">Latest</span>}</div>{clientVersions.includes(`microbot-${v}.jar`) && <span className="text-xs text-gray-400">Downloaded</span>}</div></div>))}
                </div>
                <div className="mt-5 flex justify-end space-x-2"><button onClick={onClose} className="px-3 py-1.5 rounded-md bg-gray-700 text-white hover:bg-gray-600">Cancel</button><button onClick={() => { if (selectedVersion) { onDownload(selectedVersion); onClose(); } }} disabled={!selectedVersion} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90 disabled:opacity-50">Download</button></div>
            </div>
        </div>
    );
};

const JagexAccountManager = ({ jagexAccounts, selectedJagexAccounts, setSelectedJagexAccounts, handleMultiLaunch, handleLaunch, setProxyModalAccount, handleDeleteJagex }) => {
    const toggle = (id) => setSelectedJagexAccounts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    return (
        <section>
            <div className="flex items-center space-x-2 mb-3">
                <button onClick={handleMultiLaunch} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90 disabled:opacity-50 flex items-center space-x-1.5 text-sm font-medium" disabled={selectedJagexAccounts.size === 0}><Play size={14} /><span>Launch Selected</span></button>
                <button onClick={() => window.electron?.openLauncher()} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90 flex items-center space-x-1.5 text-sm font-medium"><Plus size={14} /><span>Add Account</span></button>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead><tr className="border-b border-gray-700"><th className="p-2 w-8"><input type="checkbox" onChange={(e) => setSelectedJagexAccounts(e.target.checked ? new Set(jagexAccounts.map(a => a.accountId)) : new Set())} className="rounded-full border-gray-500 bg-gray-800 text-custom-blue focus:ring-custom-blue" /></th><th className="p-2 text-gray-300">Display Name</th><th className="p-2 text-gray-300">Proxy</th><th className="p-2 text-right text-gray-300">Actions</th></tr></thead>
                <tbody>
                    {jagexAccounts.map(acc => (
                        <tr key={acc.accountId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-2"><input type="checkbox" checked={selectedJagexAccounts.has(acc.accountId)} onChange={() => toggle(acc.accountId)} className="rounded-full border-gray-500 bg-gray-800 text-custom-blue focus:ring-custom-blue" /></td>
                            <td className="p-2 text-white font-medium">{acc.displayName}</td>
                            <td className="p-2 font-mono text-xs text-gray-400">{acc.proxy?.ip ? 'Configured' : 'None'}</td>
                            <td className="p-2 text-right space-x-1.5">
                                <button onClick={() => setProxyModalAccount(acc)} className="p-1.5 rounded-md text-white bg-gray-600 hover:bg-gray-500"><Server size={14}/></button>
                                <button onClick={() => handleLaunch(acc)} className="p-1.5 rounded-md text-white bg-custom-blue hover:brightness-90"><Play size={14}/></button>
                                <button onClick={() => handleDeleteJagex(acc)} className="p-1.5 rounded-md text-white bg-red-600 hover:bg-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {jagexAccounts.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-400"><div className="flex flex-col items-center space-y-2"><Fingerprint size={28} className="text-gray-500" /><span>No Jagex accounts found</span><span className="text-xs">Click "Add Account"</span></div></td></tr>}
                </tbody>
            </table></div>
        </section>
    );
};
const LegacyAccountManager = ({ legacyAccounts, setLegacyAccounts, handleLaunch }) => {
    const change = (id, f, v) => setLegacyAccounts(c => c.map(a => a.id === id ? { ...a, [f]: v } : a));
    const add = () => setLegacyAccounts(c => [...c, { id: `new-${Date.now()}`, username: '', password: '', proxy: '' }]);
    const del = (id) => setLegacyAccounts(c => c.filter(a => a.id !== id));
    const save = () => window.electron?.saveLegacyAccounts(legacyAccounts).then(r => r.success && setLegacyAccounts(r.accounts));
    return (
        <section>
            <div className="flex items-center space-x-2 mb-3">
                <button onClick={save} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90 flex items-center space-x-1.5 text-sm font-medium"><Check size={14} /><span>Save Changes</span></button>
                <button onClick={add} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90 flex items-center space-x-1.5 text-sm font-medium"><Plus size={14} /><span>Add Account</span></button>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead><tr className="border-b border-gray-700"><th className="p-2">Username</th><th className="p-2">Password</th><th className="p-2">Proxy</th><th className="p-2 text-right">Actions</th></tr></thead>
                <tbody>
                    {legacyAccounts.map(acc => (
                        <tr key={acc.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            {['username', 'password', 'proxy'].map(f => <td className="p-1.5" key={f}><input type={f === 'password' ? 'password' : 'text'} value={acc[f]} onChange={e => change(acc.id, f, e.target.value)} className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-2 py-1 text-white text-sm focus:ring-1 focus:ring-custom-blue" placeholder={f.charAt(0).toUpperCase() + f.slice(1)} /></td>)}
                            <td className="p-2 text-right space-x-1.5">
                                <button onClick={() => handleLaunch({ username: acc.username, password: acc.password, proxy: { ip: acc.proxy, type: 'http' } })} className="p-1.5 rounded-md text-white bg-custom-blue hover:brightness-90"><Play size={14}/></button>
                                <button onClick={() => del(acc.id)} className="p-1.5 rounded-md text-white bg-red-600 hover:bg-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {legacyAccounts.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-400"><div className="flex flex-col items-center space-y-2"><Users size={28} className="text-gray-500" /><span>No legacy accounts configured</span><span className="text-xs">Click "Add Account"</span></div></td></tr>}
                </tbody>
            </table></div>
        </section>
    );
};

const GhostliteLauncher = () => {
    const [jagexAccounts, setJagexAccounts] = useState([]);
    const [legacyAccounts, setLegacyAccounts] = useState([]);
    const [selectedJagexAccounts, setSelectedJagexAccounts] = useState(new Set());
    const [clientVersions, setClientVersions] = useState([]);
    const [selectedVersion, setSelectedVersionState] = useState('');
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('jagex');
    const [proxyModalAccount, setProxyModalAccount] = useState(null);
    const [latestVersionInfo, setLatestVersionInfo] = useState(null);
    const [allVersionsInfo, setAllVersionsInfo] = useState({ allVersions: [] });
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [launcherVersion, setLauncherVersion] = useState('');
    const [updateStatus, setUpdateStatus] = useState(null); // 'available' | 'downloaded' | null

    const setSelectedVersion = useCallback(async (v) => { if (window.electron) { setSelectedVersionState(v); await window.electron.writeProperties({ version_pref: v }); } }, []);
    const fetchClientVersions = useCallback(async () => { if (!window.electron) return []; const jars = await window.electron.listJars() || []; setClientVersions(jars); return jars; }, []);
    const fetchJagexAccounts = useCallback(async () => { if (!window.electron) return; setJagexAccounts(await window.electron.readAccounts() || []); }, []);
    const fetchLegacyAccounts = useCallback(async () => { if (!window.electron) return; setLegacyAccounts(await window.electron.readLegacyAccounts() || []); }, []);
    const getVersionStatus = useCallback(() => {
        if (!latestVersionInfo || !selectedVersion) return 'unknown';
        const current = selectedVersion.replace('microbot-', '').replace('.jar', '');
        const comp = current.localeCompare(latestVersionInfo.version, undefined, { numeric: true, sensitivity: 'base' });
        if (comp === 0) return 'latest'; if (comp < 0) return 'outdated'; return 'newer';
    }, [latestVersionInfo, selectedVersion]);

    const checkForUpdates = useCallback(async (showToast = false) => {
        if (!window.electron) return;
        setIsCheckingUpdate(true);
        try {
            const [latest, all] = await Promise.all([window.electron.checkLatestVersion(), window.electron.getAllVersions()]);
            setLatestVersionInfo(latest); setAllVersionsInfo(all);
            if (showToast) setToast({ type: 'info', message: latest ? `Latest version is v${latest.version}` : 'Update check failed.' });
        } catch (e) { if (showToast) setToast({ type: 'error', message: 'Failed to check for updates.' }); }
        finally { setIsCheckingUpdate(false); }
    }, []);

    useEffect(() => {
        if (window.electron) {
            const init = async () => {
                try {
                    const version = await window.electron.getLauncherVersion();
                    setLauncherVersion(version);
                    await Promise.all([fetchJagexAccounts(), fetchLegacyAccounts()]);
                    const [props, jars] = await Promise.all([window.electron.readProperties(), fetchClientVersions()]);
                    if (jars.length > 0) setSelectedVersionState(props.version_pref && jars.includes(props.version_pref) ? props.version_pref : jars[0]);
                } catch (error) {
                    console.error("Initialization failed:", error);
                    setToast({ type: 'error', message: 'Could not load local app data. Check logs.'});
                }
            };
            init();

            // Listen for events from main.js
            const cleanupUpdateAvailable = window.electron.on('update-available', () => setUpdateStatus('available'));
            const cleanupUpdateDownloaded = window.electron.on('update-downloaded', () => setUpdateStatus('downloaded'));
            const cleanupAccountsChanged = window.electron.on('accounts-file-changed', fetchJagexAccounts);
            const cleanupDownloadProgress = window.electron.on('download-progress', setDownloadProgress);

            // Cleanup listeners when component unmounts
            return () => {
                cleanupUpdateAvailable();
                cleanupUpdateDownloaded();
                cleanupAccountsChanged();
                cleanupDownloadProgress();
            };
        }
    }, [fetchJagexAccounts, fetchLegacyAccounts, fetchClientVersions]);

    const handleDownload = async (promise) => {
        if (!window.electron) return;
        setDownloadProgress({ percent: 0, status: 'Starting...' });
        try {
            const res = await promise;
            if (res.success && res.fileName) {
                setDownloadProgress({ percent: 100, status: 'Complete!' });
                await window.electron.deleteJars({ keep: [res.fileName] });
                await fetchClientVersions();
                setSelectedVersion(res.fileName);
                setTimeout(() => {
                    setDownloadProgress(null);
                    setToast({ type: 'success', message: `v${res.fileName.match(/(\d+\.?)+/)?.[0]} is ready!` });
                    checkForUpdates();
                }, 1500);
            } else { throw new Error(res.error || 'Download failed.'); }
        } catch (e) { setDownloadProgress(null); setToast({ type: 'error', message: `Download failed: ${e.message}` }); }
    };

    const handleLaunch = async (opts) => {
        if (!window.electron) return;
        if (!selectedVersion) { setToast({ type: 'error', message: 'No client version selected.' }); return; }
        if (opts.accountId) await window.electron.overwriteCredentialProperties(opts);
        await window.electron.openClient({
            version: selectedVersion,
            proxy: opts.proxy,
            username: opts.username,
            password: opts.password
        });
    };

    const handleMultiLaunch = async () => {
        if (!window.electron || selectedJagexAccounts.size === 0) return;
        const toLaunch = jagexAccounts.filter(a => selectedJagexAccounts.has(a.accountId));
        for (const acc of toLaunch) { await handleLaunch(acc); await new Promise(r => setTimeout(r, 2000)); }
    };

    const handleDeleteJagex = async (acc) => {
        if (!window.electron) return;
        if (window.confirm(`Are you sure you want to remove ${acc.displayName}? This cannot be undone.`)) {
            const res = await window.electron.removeJagexAccount(acc.accountId);
            if (res.success) { setToast({ type: 'success', message: 'Account removed.' }); fetchJagexAccounts(); }
            else { setToast({ type: 'error', message: `Failed to remove: ${res.error}` }); }
        }
    };

    const TabButton = ({ id, label, icon: Icon, activeTab, setActiveTab }) => (
        <button onClick={() => setActiveTab(id)} className={`relative px-3 py-2 text-sm font-medium transition-colors ${activeTab === id ? 'text-custom-blue' : 'text-gray-400 hover:text-gray-200'}`}>
            <span className="flex items-center space-x-1.5"><Icon size={14} /><span>{label}</span></span>
            {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-custom-blue" />}
        </button>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-gray-200 font-sans">
            <div className="relative z-10 p-4 sm:p-5 lg:p-6">
                {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
                {proxyModalAccount && <ProxySettingsModal account={proxyModalAccount} onClose={() => setProxyModalAccount(null)} onSave={(id, proxy) => window.electron.saveAccountProxy({ accountId: id, proxy }).then(fetchJagexAccounts)} />}
                {showVersionModal && <VersionSelectionModal onClose={() => setShowVersionModal(false)} onDownload={(v) => handleDownload(window.electron.downloadVersion(v))} {...{ latestVersionInfo, allVersionsInfo, clientVersions }} />}

                <main className="space-y-4 max-w-5xl mx-auto">
                    <header className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white">Ghostlite Launcher</h1>
                        {launcherVersion && (
                            <span className="text-xs font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded-md">
                                v{launcherVersion}
                            </span>
                        )}
                    </header>

                    <UpdateNotification
                        status={updateStatus}
                        onRestart={() => window.electron.restartApp()}
                    />

                    <div className="p-4 bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-xl">
                        <h2 className="text-lg font-semibold mb-3 text-white">Client Settings</h2>
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                            <div className="flex-1 min-w-48 flex items-center space-x-2"><Download size={16} className="text-gray-400 flex-shrink-0"/><select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)} className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-custom-blue"><option hidden>Select Version</option>{clientVersions.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                            {(() => { const s = getVersionStatus(); const m = { latest: ["Latest", "text-emerald-400", CheckCircle], outdated: ["Update", "text-amber-400", AlertCircle], newer: ["Custom", "text-custom-blue", CheckCircle], unknown: ["...", "text-gray-400", AlertCircle] }; const [t, c, I] = m[s]; return <div className={`flex items-center space-x-1.5 ${c} pr-2`}><I size={16} /><span className="text-xs font-medium">{t}</span></div>; })()}
                            {getVersionStatus() === 'outdated' && latestVersionInfo && <button onClick={() => handleDownload(window.electron.downloadLatestVersion())} disabled={!!downloadProgress} className="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 flex items-center space-x-1.5 disabled:opacity-50 text-sm font-medium"><Download size={14} /><span>Update to v{latestVersionInfo.version}</span></button>}
                            <button onClick={() => setShowVersionModal(true)} className="px-3 py-1.5 rounded-md bg-custom-blue text-white hover:brightness-90 flex items-center space-x-1.5 text-sm font-medium"><Download size={14} /><span>Browse</span></button>
                            <button onClick={() => checkForUpdates(true)} disabled={isCheckingUpdate} className="p-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"><RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin' : ''} /></button>
                            <button onClick={() => window.electron.loadCustomJar().then(fetchClientVersions)} className="px-3 py-1.5 rounded-md bg-gray-600 text-white hover:bg-gray-700 flex items-center space-x-1.5 text-sm font-medium"><UploadCloud size={14} /><span>Custom</span></button>
                        </div>
                        {downloadProgress && <ProgressBar {...downloadProgress} />}
                    </div>
                    <div className="p-4 bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-xl">
                        <div className="flex border-b border-gray-700 mb-4">
                            <TabButton id="jagex" label="Jagex Accounts" icon={Fingerprint} activeTab={activeTab} setActiveTab={setActiveTab} />
                            <TabButton id="legacy" label="Legacy Accounts" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} />
                        </div>
                        {activeTab === 'jagex' ? <JagexAccountManager {...{ jagexAccounts, selectedJagexAccounts, setSelectedJagexAccounts, handleMultiLaunch, handleLaunch, setProxyModalAccount, handleDeleteJagex }} /> : <LegacyAccountManager {...{ legacyAccounts, setLegacyAccounts, handleLaunch }} />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default GhostliteLauncher;