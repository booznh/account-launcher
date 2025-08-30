import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Server, X, UploadCloud, Download, Check, Users, Fingerprint, CheckCircle, AlertCircle, RefreshCw, Sparkles, Eye, EyeOff, Moon, Sun } from 'lucide-react';

/* =========================
   Small UI Primitives
   ========================= */

// Enhanced Input with Eye Toggle
const SensitiveInput = ({ value, onChange, placeholder, className = "" }) => {
    const [revealed, setRevealed] = useState(false);
    return (
        <div className="relative">
            <input
                type={revealed ? "text" : "password"}
                value={value}
                onChange={onChange}
                className={`w-full bg-gray-800/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 pr-8 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 ${className}`}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={() => setRevealed(!revealed)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-700/10 dark:hover:bg-gray-700/50 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            >
                {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
        </div>
    );
};

// Modern Checkbox Component
const ModernCheckbox = ({ checked, onChange, className = "" }) => {
    return (
        <div className={`relative ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only"
            />
            <div
                onClick={() => onChange(!checked)}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center ${
                    checked
                        ? 'border-blue-600 shadow-lg shadow-blue-600/30 bg-[#008eff]'
                        : 'border-gray-400 dark:border-gray-500 hover:border-blue-400 bg-white/50 dark:bg-gray-800/50'
                }`}
            >
                {checked && (
                    <Check size={12} className="text-white" />
                )}
            </div>
        </div>
    );
};

// Client Icon (RL / Microbot)
const ClientIcon = ({ type, size, className = "" }) => {
    const iconPath = type === 'runelite'
        ? './runelite_icon.png'
        : './microbot_icon.png';
    const imageStyle = {};
    if (size) {
        imageStyle.width = `${size}px`;
        imageStyle.height = `${size}px`;
        imageStyle.minWidth = `${size}px`;
        imageStyle.minHeight = `${size}px`;
    }
    return (
        <img
            src={iconPath}
            alt={`${type} icon`}
            className={`object-contain ${className}`}
            style={imageStyle}
            onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
            }}
        />
    );
};

const PrimaryButton = ({ children, className = "", ...props }) => (
    <button
        {...props}
        className={`px-3 py-1.5 rounded-md text-white bg-[#008eff] hover:bg-[#0066cc] disabled:opacity-50 transition-colors ${className}`}
    >
        {children}
    </button>
);

const SecondaryButton = ({ children, className = "", ...props }) => (
    <button
        {...props}
        className={`px-3 py-1.5 rounded-md text-gray-900 bg-gray-100 hover:bg-gray-200 dark:text-white dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
        {children}
    </button>
);

const IconSquareButton = ({ children, className = "", ...props }) => (
    <button
        {...props}
        className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${className}`}
        style={{ width: '36px', height: '36px' }}
    >
        {children}
    </button>
);

/* =========================
   Launcher Buttons
   ========================= */

const LauncherButton = ({ type, onClick, disabled = false, className = "" }) => {
    const BUTTON_SIZE_PX = 44;
    const RUNELITE_ICON_SIZE_PX = 52;
    const MICROBOT_ICON_SIZE_PX = 32;
    const isRunelite = type === 'runelite';
    const label = isRunelite ? 'RuneLite' : 'Microbot';
    const iconSize = isRunelite ? RUNELITE_ICON_SIZE_PX : MICROBOT_ICON_SIZE_PX;
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-1 rounded-md text-gray-500 dark:text-gray-400 disabled:opacity-50 group relative flex items-center justify-center hover:bg-gray-900/5 dark:hover:bg-gray-700/40 transition-colors ${className}`}
            title={`Launch with ${label}`}
            style={{ width: `${BUTTON_SIZE_PX}px`, height: `${BUTTON_SIZE_PX}px` }}
        >
            <ClientIcon
                type={type}
                size={iconSize}
                className="transition-transform duration-150 ease-in-out group-hover:scale-110"
            />
            <span className="ml-1 sr-only">{label}</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {label}
            </div>
        </button>
    );
};

// Multi-launch button with dropdown
const MultiLaunchButton = ({ selectedCount, onRuneliteLaunch, onMicrobotLaunch, disabled = false }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    return (
        <div className="relative">
            <PrimaryButton
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={disabled}
                className="flex items-center space-x-1.5 text-sm font-medium"
            >
                <span>Launch Selected ({selectedCount})</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </PrimaryButton>
            {showDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-full overflow-hidden text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <button
                        onClick={() => { onRuneliteLaunch(); setShowDropdown(false); }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                    >
                        <ClientIcon type="runelite" size={16} />
                        <span>Launch with RuneLite</span>
                    </button>
                    <button
                        onClick={() => { onMicrobotLaunch(); setShowDropdown(false); }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                    >
                        <ClientIcon type="microbot" size={16} />
                        <span>Launch with Microbot</span>
                    </button>
                </div>
            )}
        </div>
    );
};

/* =========================
   Notifications / Progress
   ========================= */

const UpdateNotification = ({ status, onRestart }) => {
    if (!status) return null;
    if (status === 'downloaded') {
        return (
            <div className="bg-emerald-500/90 text-white p-3 rounded-lg flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-2">
                    <Sparkles size={18} />
                    <span className="font-medium text-sm">A new version is ready!</span>
                </div>
                <button
                    onClick={onRestart}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm font-semibold transition-colors"
                >
                    Restart & Update
                </button>
            </div>
        );
    }
    if (status === 'available') {
        return (
            <div className="text-white p-3 rounded-lg flex items-center space-x-2 shadow-lg bg-[#008eff]">
                <Download size={16} className="animate-pulse" />
                <span className="font-medium text-sm">Update found, downloading now...</span>
            </div>
        );
    }
    if (status === 'checking') {
        return (
            <div className="text-white p-3 rounded-lg flex items-center space-x-2 shadow-lg" style={{ backgroundColor: '#0088dd' }}>
                <RefreshCw size={16} className="animate-spin" />
                <span className="font-medium text-sm">Checking for launcher updates...</span>
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
        info: 'border-blue-500',
    };
    const bgStyle = type === 'info' ? { backgroundColor: '#008eff' } : {};
    return (
        <div
            className={`fixed top-5 right-5 p-4 rounded-lg text-white shadow-lg z-50 flex items-center space-x-2 backdrop-blur-md border ${typeStyles[type] || 'bg-gray-800/80'}`}
            style={bgStyle}
        >
            <span>{message}</span>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/20">
                <X size={16}/>
            </button>
        </div>
    );
};

const ProgressBar = ({ percent, status }) => (
    <div className="mt-3 overflow-hidden">
        <div className="p-3 bg-white/50 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-700 dark:text-gray-300">{status}</span>
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{Math.round(percent)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: '#008eff' }} />
            </div>
        </div>
    </div>
);

/* =========================
   Proxy Modal
   ========================= */

const ProxySettingsModal = ({ account, onClose, onSave }) => {
    const [proxy, setProxy] = useState(account.proxy || { ip: '', type: 'http' });
    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-black/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Proxy Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="ip:port:user:pass (optional)"
                        value={proxy.ip}
                        onChange={(e) => setProxy({ ...proxy, ip: e.target.value })}
                        className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={proxy.type}
                        onChange={(e) => setProxy({ ...proxy, type: e.target.value })}
                        className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="http">HTTP</option>
                        <option value="socks">SOCKS</option>
                    </select>
                </div>
                <div className="mt-5 flex justify-end space-x-2">
                    <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                    <PrimaryButton onClick={() => { onSave(account.accountId || account.id, proxy); onClose(); }}>
                        Save
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
};

/* =========================
   Masked Text
   ========================= */

const SensitiveText = ({ text, className = "", revealed, onToggle }) => {
    if (!text) return <span className={`text-gray-500 ${className}`}>Not set</span>;
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
      <span className="font-mono text-xs text-gray-900 dark:text-white">
        {revealed ? text : '•'.repeat(Math.min(text.length, 12))}
      </span>
            <button
                onClick={onToggle}
                className="p-1 rounded-full hover:bg-gray-700/10 dark:hover:bg-gray-700/50 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            >
                {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
        </div>
    );
};

/* =========================
   Jagex Accounts Section
   ========================= */

const JagexAccountManager = ({ jagexAccounts, selectedJagexAccounts, setSelectedJagexAccounts, handleMultiLaunch, handleLaunch, setProxyModalAccount, handleDeleteJagex, runeliteAvailable }) => {
    const [revealedAccounts, setRevealedAccounts] = useState(new Set());
    const [globalRevealMode, setGlobalRevealMode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('jagex-revealed-accounts');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRevealedAccounts(new Set(parsed));
            } catch (e) {
                console.error('Failed to parse saved reveal state:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('jagex-revealed-accounts', JSON.stringify(Array.from(revealedAccounts)));
    }, [revealedAccounts]);

    const toggle = (id) => setSelectedJagexAccounts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleReveal = (accountId) => {
        setRevealedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };

    const toggleGlobalReveal = () => {
        const newMode = !globalRevealMode;
        setGlobalRevealMode(newMode);
        if (newMode) {
            setRevealedAccounts(new Set(jagexAccounts.map(acc => acc.accountId)));
        } else {
            setRevealedAccounts(new Set());
        }
    };

    return (
        <section className="flex flex-col flex-1 min-h-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 tracking-tight mb-3">Jagex Accounts</h2>

            <div className="flex items-center space-x-2 mb-3 flex-shrink-0">
                <MultiLaunchButton
                    selectedCount={selectedJagexAccounts.size}
                    onRuneliteLaunch={() => handleMultiLaunch('runelite')}
                    onMicrobotLaunch={() => handleMultiLaunch('microbot')}
                    disabled={selectedJagexAccounts.size === 0}
                />
                <PrimaryButton onClick={() => window.electron?.openLauncher()} className="flex items-center space-x-1.5 text-sm font-medium">
                    <Plus size={14} />
                    <span>Add Account</span>
                </PrimaryButton>
                <SecondaryButton onClick={toggleGlobalReveal} className="flex items-center space-x-1.5 text-sm font-medium">
                    {globalRevealMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{globalRevealMode ? 'Hide All' : 'Show All'}</span>
                </SecondaryButton>
            </div>

            <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        <th className="p-2 w-8">
                            <ModernCheckbox
                                checked={jagexAccounts.length > 0 && selectedJagexAccounts.size === jagexAccounts.length}
                                onChange={() => {
                                    const allSelected = selectedJagexAccounts.size === jagexAccounts.length;
                                    setSelectedJagexAccounts(allSelected ? new Set() : new Set(jagexAccounts.map(a => a.accountId)));
                                }}
                            />
                        </th>
                        <th className="p-2">Display Name</th>
                        <th className="p-2">Account ID</th>
                        <th className="p-2">Proxy</th>
                        <th className="p-2 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {jagexAccounts.map(acc => (
                        <tr key={acc.accountId} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="p-2">
                                <ModernCheckbox
                                    checked={selectedJagexAccounts.has(acc.accountId)}
                                    onChange={() => toggle(acc.accountId)}
                                />
                            </td>
                            <td className="p-2">
                                <SensitiveText
                                    text={acc.displayName}
                                    className="text-gray-900 dark:text-white"
                                    revealed={revealedAccounts.has(acc.accountId)}
                                    onToggle={() => toggleReveal(acc.accountId)}
                                />
                            </td>
                            <td className="p-2">
                                <SensitiveText
                                    text={acc.accountId}
                                    revealed={revealedAccounts.has(acc.accountId)}
                                    onToggle={() => toggleReveal(acc.accountId)}
                                />
                            </td>
                            <td className="p-2 font-mono text-xs text-gray-600 dark:text-gray-400">{acc.proxy?.ip ? 'Configured' : 'None'}</td>
                            <td className="p-2 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                    <IconSquareButton
                                        onClick={() => setProxyModalAccount(acc)}
                                        className="text-white bg-gray-600 hover:bg-gray-500"
                                    >
                                        <Trash2 size={14}/>
                                    </IconSquareButton>
                                </div>
                            </td>
                        </tr>
                    ))}
                    { jagexAccounts.length === 0 && (
                        <tr>
                            <td colSpan="5" className="p-6 text-center text-gray-500 dark:text-gray-400">
                                <div className="flex flex-col items-center space-y-2">
                                    <Users size={28} className="text-gray-400 dark:text-gray-500" />
                                    <span>No legacy accounts configured</span>
                                    <span className="text-xs">Click "Add Account"</span>
                                </div>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

/* =========================
   Main Component
   ========================= */

const GhostliteLauncher = () => {
    const [jagexAccounts, setJagexAccounts] = useState([]);
    const [legacyAccounts, setLegacyAccounts] = useState([]);
    const [selectedJagexAccounts, setSelectedJagexAccounts] = useState(new Set());
    const [selectedLegacyAccounts, setSelectedLegacyAccounts] = useState(new Set());
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
    const [updateStatus, setUpdateStatus] = useState(null);
    const [runeliteAvailable, setRuneliteAvailable] = useState(false);
    const [runelitePath, setRunelitePath] = useState('');

    // THEME: dark mode toggle
    const [isDark, setIsDark] = useState(true);

    // Load theme pref
    useEffect(() => {
        const saved = localStorage.getItem('ghostlite-theme');
        if (saved === 'light') setIsDark(false);
        if (saved === 'dark') setIsDark(true);
        if (!saved) {
            // fallback to system
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(prefersDark);
        }
    }, []);

    // Apply theme to <html> for global dark variants if desired:
    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('ghostlite-theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('ghostlite-theme', 'light');
        }
    }, [isDark]);

    const setSelectedVersion = useCallback(async (v) => {
        if (window.electron) {
            setSelectedVersionState(v);
            await window.electron.writeProperties({ version_pref: v });
        }
    }, []);

    const loadJars = useCallback(async () => {
        if (!window.electron) return [];
        try {
            const jars = await window.electron.listJars() || [];
            setClientVersions(jars);
            if (jars.length > 0 && !selectedVersion) {
                setSelectedVersionState(jars[0]);
                await window.electron.writeProperties({ version_pref: jars[0] });
            }
            return jars;
        } catch (error) {
            console.error('Failed to load JARs:', error);
            return [];
        }
    }, [selectedVersion]);

    const fetchJagexAccounts = useCallback(async () => {
        if (!window.electron) return;
        setJagexAccounts(await window.electron.readAccounts() || []);
    }, []);

    const fetchLegacyAccounts = useCallback(async () => {
        if (!window.electron) return;
        setLegacyAccounts(await window.electron.readLegacyAccounts() || []);
    }, []);

    const checkRuneLiteStatus = useCallback(async () => {
        if (!window.electron) return;
        try {
            const result = await window.electron.checkRuneLiteAvailability();
            setRuneliteAvailable(result.available);
            setRunelitePath(result.path || '');
        } catch (error) {
            console.error('Failed to check RuneLite status:', error);
        }
    }, []);

    const getVersionStatus = useCallback(() => {
        if (!latestVersionInfo || !selectedVersion) return 'unknown';
        const current = selectedVersion.replace('microbot-', '').replace('.jar', '');
        const comp = current.localeCompare(latestVersionInfo.version, undefined, { numeric: true, sensitivity: 'base' });
        if (comp === 0) return 'latest';
        if (comp < 0) return 'outdated';
        return 'newer';
    }, [latestVersionInfo, selectedVersion]);

    const checkForUpdates = useCallback(async (showToast = false) => {
        if (!window.electron) return;
        setIsCheckingUpdate(true);
        try {
            const [latest, all] = await Promise.all([window.electron.checkLatestVersion(), window.electron.getAllVersions()]);
            setLatestVersionInfo(latest);
            setAllVersionsInfo(all);
            if (showToast) setToast({ type: 'info', message: latest ? `Latest version is v${latest.version}` : 'Update check failed.' });
        } catch (e) {
            if (showToast) setToast({ type: 'error', message: 'Failed to check for updates.' });
        }
        finally {
            setIsCheckingUpdate(false);
        }
    }, []);

    const checkForLauncherUpdates = useCallback(async () => {
        if (!window.electron) return;
        try {
            setUpdateStatus('checking');
            setToast({ type: 'info', message: 'Checking for launcher updates...' });
            const result = await window.electron.checkForUpdates();
            if (result.success) {
                setTimeout(() => {
                    if (updateStatus === 'checking') {
                        setUpdateStatus(null);
                        setToast({ type: 'info', message: 'You are running the latest version!' });
                    }
                }, 5000);
            } else {
                setUpdateStatus(null);
                setToast({ type: 'error', message: 'Failed to check for updates' });
            }
        } catch (error) {
            setUpdateStatus(null);
            setToast({ type: 'error', message: 'Failed to check for updates' });
        }
    }, [updateStatus]);

    useEffect(() => {
        if (window.electron) {
            const init = async () => {
                try {
                    const version = await window.electron.getLauncherVersion();
                    setLauncherVersion(version);
                    await Promise.all([fetchJagexAccounts(), fetchLegacyAccounts(), checkRuneLiteStatus()]);
                    const [props, jars] = await Promise.all([window.electron.readProperties(), loadJars()]);
                    if (jars.length > 0) setSelectedVersionState(props.version_pref && jars.includes(props.version_pref) ? props.version_pref : jars[0]);
                } catch (error) {
                    console.error("Initialization failed:", error);
                    setToast({ type: 'error', message: 'Could not load local app data. Check logs.'});
                }
            };
            init();

            const cleanupCheckingForUpdate = window.electron.on('checking-for-update', () => setUpdateStatus('checking'));
            const cleanupUpdateAvailable = window.electron.on('update-available', () => setUpdateStatus('available'));
            const cleanupUpdateDownloaded = window.electron.on('update-downloaded', () => setUpdateStatus('downloaded'));
            const cleanupUpdateNotAvailable = window.electron.on('update-not-available', () => {
                setUpdateStatus(null);
                setToast({ type: 'info', message: 'Launcher is up to date.' });
            });
            const cleanupUpdateError = window.electron.on('update-error', (error) => {
                setUpdateStatus(null);
                setToast({ type: 'error', message: `Update check failed: ${error}` });
            });
            const cleanupAccountsChanged = window.electron.on('accounts-file-changed', fetchJagexAccounts);
            const cleanupDownloadProgress = window.electron.on('download-progress', setDownloadProgress);
            const cleanupJcefClosed = window.electron.on('jcef-closed', () => {
                setTimeout(() => fetchJagexAccounts(), 500);
            });

            return () => {
                cleanupCheckingForUpdate();
                cleanupUpdateAvailable();
                cleanupUpdateDownloaded();
                cleanupUpdateNotAvailable();
                cleanupUpdateError();
                cleanupAccountsChanged();
                cleanupDownloadProgress();
                cleanupJcefClosed();
            };
        }
    }, [fetchJagexAccounts, fetchLegacyAccounts, loadJars, checkRuneLiteStatus]);

    useEffect(() => {
        if (!launcherVersion) return;
        const runStartupChecks = async () => {
            setToast({ type: 'info', message: 'Checking for launcher updates...' });
            await new Promise(resolve => setTimeout(resolve, 3000));
            setToast({ type: 'info', message: 'Checking for client updates...' });
            try {
                await checkForUpdates(false);
                const latest = await window.electron.checkLatestVersion();
                const props = await window.electron.readProperties();
                const currentVersion = props.version_pref || (clientVersions.length > 0 ? clientVersions[0] : null);
                if (latest && currentVersion) {
                    const current = currentVersion.replace('microbot-', '').replace('.jar', '');
                    const comp = current.localeCompare(latest.version, undefined, { numeric: true, sensitivity: 'base' });
                    if (comp < 0) {
                        setToast({ type: 'success', message: `New client v${latest.version} is available!` });
                    } else {
                        setToast({ type: 'info', message: 'Client is up to date.' });
                    }
                } else {
                    setToast({ type: 'info', message: 'Could not determine selected client version.' });
                }
            } catch (e) {
                setToast({ type: 'error', message: 'Failed to check for client updates.' });
            }
        };
        runStartupChecks();
    }, [launcherVersion, clientVersions, checkForUpdates]);

    const handleDownload = async (promise) => {
        if (!window.electron) return;
        setDownloadProgress({ percent: 0, status: 'Starting...' });
        try {
            const res = await promise;
            if (res.success && res.fileName) {
                setDownloadProgress({ percent: 100, status: 'Complete!' });
                await window.electron.deleteJars({ keep: [res.fileName] });
                await loadJars();
                setSelectedVersion(res.fileName);
                setTimeout(() => {
                    setDownloadProgress(null);
                    setToast({ type: 'success', message: `v${res.fileName.match(/(\d+\.?)+/)?.[0]} is ready!` });
                    checkForUpdates();
                }, 1500);
            } else {
                throw new Error(res.error || 'Download failed.');
            }
        } catch (e) {
            setDownloadProgress(null);
            setToast({ type: 'error', message: `Download failed: ${e.message}` });
        }
    };

    const handleLaunch = async (opts, clientType = 'microbot') => {
        if (!window.electron) return;
        if (clientType === 'runelite' && !runeliteAvailable) {
            setToast({ type: 'error', message: 'RuneLite not found. Please install RuneLite first.' });
            return;
        }
        if (!selectedVersion) {
            setToast({ type: 'error', message: 'No client version selected.' });
            return;
        }
        if (opts.accountId) await window.electron.overwriteCredentialProperties(opts);
        await window.electron.openClient({
            version: selectedVersion,
            proxy: opts.proxy,
            username: opts.username,
            password: opts.password,
            accountId: opts.accountId,
            clientType: clientType
        });
    };

    const handleMultiLaunchLegacy = async (clientType = 'microbot') => {
        if (!window.electron || selectedLegacyAccounts.size === 0) return;
        if (clientType === 'runelite' && !runeliteAvailable) {
            setToast({ type: 'error', message: 'RuneLite not found. Please install RuneLite first.' });
            return;
        }
        const toLaunch = legacyAccounts.filter(a => selectedLegacyAccounts.has(a.id));
        for (const acc of toLaunch) {
            await handleLaunch({ username: acc.username, password: acc.password, proxy: { ip: acc.proxy, type: 'http' } }, clientType);
            await new Promise(r => setTimeout(r, 2000));
        }
    };

    const handleMultiLaunch = async (clientType = 'microbot') => {
        if (!window.electron || selectedJagexAccounts.size === 0) return;
        if (clientType === 'runelite' && !runeliteAvailable) {
            setToast({ type: 'error', message: 'RuneLite not found. Please install RuneLite first.' });
            return;
        }
        const toLaunch = jagexAccounts.filter(a => selectedJagexAccounts.has(a.accountId));
        for (const acc of toLaunch) {
            await handleLaunch(acc, clientType);
            await new Promise(r => setTimeout(r, 2000));
        }
    };

    const handleDeleteJagex = async (acc) => {
        if (!window.electron) return;
        if (window.confirm(`Are you sure you want to remove this account? This cannot be undone.`)) {
            const res = await window.electron.removeJagexAccount(acc.accountId);
            if (res.success) {
                setToast({ type: 'success', message: 'Account removed.' });
                fetchJagexAccounts();
            } else {
                setToast({ type: 'error', message: `Failed to remove: ${res.error}` });
            }
        }
    };

    return (
        <div className={`${isDark ? 'dark' : ''}`}>
            {/* Background gradient (light/dark) */}
            <div
                className="h-screen relative text-gray-900 dark:text-gray-100 font-sans
                   bg-gradient-to-br from-sky-50 via-cyan-100 to-sky-200
                   dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950"
            >
                <div className="relative z-10 p-4 sm:p-5 lg:p-6 h-full overflow-y-auto">
                    {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
                    {proxyModalAccount && (
                        <ProxySettingsModal
                            account={proxyModalAccount}
                            onClose={() => setProxyModalAccount(null)}
                            onSave={(id, proxy) => window.electron.saveAccountProxy({ accountId: id, proxy }).then(fetchJagexAccounts)}
                        />
                    )}
                    {showVersionModal && (
                        <VersionSelectionModal
                            onClose={() => setShowVersionModal(false)}
                            onDownload={(v) => handleDownload(window.electron.downloadVersion(v))}
                            {...{ latestVersionInfo, allVersionsInfo, clientVersions }}
                        />
                    )}

                    <main className="space-y-4 max-w-5xl mx-auto">
                        {/* Header */}
                        <header className="flex justify-between items-center">
                            <h1
                                className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-sky-500 to-blue-700 bg-clip-text text-transparent font-['Inter',_'system-ui',_sans-serif] tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
                                style={{
                                    WebkitTextStroke: "1px black",
                                }}
                            >
                                Account Launcher &amp; Manager
                            </h1>

                            <div className="flex items-center space-x-3">
                                {/* Theme toggle */}
                                <button
                                    onClick={() => setIsDark(d => !d)}
                                    className="px-2.5 py-1.5 rounded-md bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors
                             dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600 flex items-center space-x-1.5 text-sm"
                                    aria-label="Toggle theme"
                                    title="Toggle light/dark theme"
                                >
                                    {isDark ? <Moon size={14}/> : <Sun size={14}/>}
                                    <span>{isDark ? 'Dark' : 'Light'}</span>
                                </button>

                                <PrimaryButton
                                    onClick={checkForLauncherUpdates}
                                    disabled={updateStatus === 'checking'}
                                    className="flex items-center space-x-1.5 text-sm font-medium"
                                >
                                    <RefreshCw size={14} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                                    <span>Check for Launcher Updates</span>
                                </PrimaryButton>

                                {launcherVersion && (
                                    <span className="text-xs font-mono text-gray-700 bg-white/70 px-2 py-1 rounded-md border border-gray-200
                                   dark:text-gray-400 dark:bg-gray-800/50 dark:border-gray-700/50">
                    v{launcherVersion}
                  </span>
                                )}
                            </div>
                        </header>

                        <UpdateNotification
                            status={updateStatus}
                            onRestart={() => window.electron.restartApp()}
                        />

                        {/* Client Settings */}
                        <div className="p-4 rounded-xl border bg-white/70 backdrop-blur-md border-gray-200
                            dark:bg-gray-900/80 dark:border-gray-700/50">
                            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Client Settings</h2>
                            <div className="mb-4 p-3 bg-white/60 rounded-lg border border-gray-200
                              dark:bg-gray-800/50 dark:border-gray-600/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-900 dark:text-white font-medium">RuneLite Status:</span>
                                        <span className={`text-sm ${runeliteAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {runeliteAvailable ? 'Available' : 'Not Found'}
                    </span>
                                    </div>
                                </div>
                                {runeliteAvailable && runelitePath && (
                                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-400 font-mono truncate">
                                        Path: {runelitePath}
                                    </div>
                                )}
                                {!runeliteAvailable && (
                                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                        RuneLite not detected. Please install RuneLite from runelite.net
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                                <div className="flex-1 min-w-48 flex items-center space-x-2">
                                    <Download size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0"/>
                                    <select
                                        value={selectedVersion}
                                        onChange={(e) => setSelectedVersion(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option hidden>Select Version</option>
                                        {clientVersions.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>

                                {(() => {
                                    const s = getVersionStatus();
                                    const m = {
                                        latest: ["Latest", "text-emerald-600 dark:text-emerald-400", CheckCircle],
                                        outdated: ["Update", "text-amber-600 dark:text-amber-400", AlertCircle],
                                        newer: ["Custom", "text-blue-600 dark:text-blue-400", CheckCircle],
                                        unknown: ["...", "text-gray-500 dark:text-gray-400", AlertCircle]
                                    };
                                    const [t, c, I] = m[s];
                                    return (
                                        <div className={`flex items-center space-x-1.5 ${c} pr-2`}>
                                            <I size={16} /><span className="text-xs font-medium">{t}</span>
                                        </div>
                                    );
                                })()}

                                {getVersionStatus() === 'outdated' && latestVersionInfo && (
                                    <button
                                        onClick={() => handleDownload(window.electron.downloadLatestVersion())}
                                        disabled={!!downloadProgress}
                                        className="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 flex items-center space-x-1.5 disabled:opacity-50 text-sm font-medium transition-colors"
                                    >
                                        <Download size={14} />
                                        <span>Update to v{latestVersionInfo.version}</span>
                                    </button>
                                )}

                                <PrimaryButton onClick={() => setShowVersionModal(true)} className="flex items-center space-x-1.5 text-sm font-medium">
                                    <Download size={14} />
                                    <span>Browse</span>
                                </PrimaryButton>

                                <PrimaryButton
                                    onClick={() => checkForUpdates(true)}
                                    disabled={isCheckingUpdate}
                                    className="p-2 text-sm"
                                    aria-label="Check for client updates"
                                    title="Check for client updates"
                                >
                                    <RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin' : ''} />
                                </PrimaryButton>

                                <SecondaryButton onClick={() => window.electron.loadCustomJar().then(loadJars)} className="flex items-center space-x-1.5 text-sm font-medium">
                                    <UploadCloud size={14} />
                                    <span>Custom</span>
                                </SecondaryButton>
                            </div>

                            {downloadProgress && <ProgressBar {...downloadProgress} />}
                        </div>

                        {/* Accounts Panel */}
                        <div className="p-4 rounded-xl border bg-white/70 backdrop-blur-md border-gray-200
                            dark:bg-gray-900/80 dark:border-gray-700/50">
                            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                                <TabButton id="jagex" label="Jagex Accounts" icon={Fingerprint} activeTab={activeTab} setActiveTab={setActiveTab} />
                                <TabButton id="legacy" label="Legacy Accounts" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} />
                            </div>
                            {activeTab === 'jagex' ? (
                                <JagexAccountManager
                                    jagexAccounts={jagexAccounts}
                                    selectedJagexAccounts={selectedJagexAccounts}
                                    setSelectedJagexAccounts={setSelectedJagexAccounts}
                                    handleMultiLaunch={handleMultiLaunch}
                                    handleLaunch={handleLaunch}
                                    setProxyModalAccount={setProxyModalAccount}
                                    handleDeleteJagex={handleDeleteJagex}
                                    runeliteAvailable={runeliteAvailable}
                                />
                            ) : (
                                <LegacyAccountManager
                                    legacyAccounts={legacyAccounts}
                                    setLegacyAccounts={setLegacyAccounts}
                                    handleLaunch={handleLaunch}
                                    setProxyModalAccount={setProxyModalAccount}
                                    selectedLegacyAccounts={selectedLegacyAccounts}
                                    setSelectedLegacyAccounts={setSelectedLegacyAccounts}
                                    handleMultiLaunchLegacy={handleMultiLaunchLegacy}
                                    runeliteAvailable={runeliteAvailable}
                                />
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

/* =========================
   Legacy Accounts Section
   ========================= */

const LegacyAccountManager = ({ legacyAccounts, setLegacyAccounts, handleLaunch, setProxyModalAccount, selectedLegacyAccounts, setSelectedLegacyAccounts, handleMultiLaunchLegacy, runeliteAvailable }) => {
    const [revealedUsernames, setRevealedUsernames] = useState(new Set());
    const [globalUsernameRevealMode, setGlobalUsernameRevealMode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('legacy-revealed-usernames');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRevealedUsernames(new Set(parsed));
            } catch (e) {
                console.error('Failed to parse saved username reveal state:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('legacy-revealed-usernames', JSON.stringify(Array.from(revealedUsernames)));
    }, [revealedUsernames]);

    const toggle = (id) => setSelectedLegacyAccounts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleUsernameReveal = (accountId) => {
        setRevealedUsernames(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };

    const toggleGlobalUsernameReveal = () => {
        const newMode = !globalUsernameRevealMode;
        setGlobalUsernameRevealMode(newMode);
        if (newMode) {
            setRevealedUsernames(new Set(legacyAccounts.map(acc => acc.id)));
        } else {
            setRevealedUsernames(new Set());
        }
    };

    const change = (id, f, v) => {
        setLegacyAccounts(c => {
            const updated = c.map(a => a.id === id ? { ...a, [f]: v } : a);
            setTimeout(() => {
                window.electron?.saveLegacyAccounts(updated);
            }, 500);
            return updated;
        });
    };
    const add = () => {
        const newAccount = { id: `new-${Date.now()}`, username: '', password: '', proxy: '' };
        setLegacyAccounts(c => [...c, newAccount]);
    };
    const del = (id) => {
        setLegacyAccounts(c => {
            const updated = c.filter(a => a.id !== id);
            setTimeout(() => {
                window.electron?.saveLegacyAccounts(updated);
            }, 100);
            return updated;
        });
    };

    return (
        <section className="flex flex-col flex-1 min-h-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 tracking-tight mb-3">Legacy Accounts</h2>

            <div className="flex items-center space-x-2 mb-3 flex-shrink-0">
                <MultiLaunchButton
                    selectedCount={selectedLegacyAccounts.size}
                    onRuneliteLaunch={() => handleMultiLaunchLegacy('runelite')}
                    onMicrobotLaunch={() => handleMultiLaunchLegacy('microbot')}
                    disabled={selectedLegacyAccounts.size === 0}
                />
                <PrimaryButton onClick={add} className="flex items-center space-x-1.5 text-sm font-medium">
                    <Plus size={14} />
                    <span>Add Account</span>
                </PrimaryButton>
                <SecondaryButton onClick={toggleGlobalUsernameReveal} className="flex items-center space-x-1.5 text-sm font-medium">
                    {globalUsernameRevealMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{globalUsernameRevealMode ? 'Hide Usernames' : 'Show Usernames'}</span>
                </SecondaryButton>
            </div>

            <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        <th className="p-2 w-8">
                            <ModernCheckbox
                                checked={legacyAccounts.length > 0 && selectedLegacyAccounts.size === legacyAccounts.length}
                                onChange={() => {
                                    const allSelected = selectedLegacyAccounts.size === legacyAccounts.length;
                                    setSelectedLegacyAccounts(allSelected ? new Set() : new Set(legacyAccounts.map(a => a.id)));
                                }}
                            />
                        </th>
                        <th className="p-2">Username</th>
                        <th className="p-2">Password</th>
                        <th className="p-2">Proxy</th>
                        <th className="p-2 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {legacyAccounts.map(acc => (
                        <tr key={acc.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="p-2">
                                <ModernCheckbox
                                    checked={selectedLegacyAccounts.has(acc.id)}
                                    onChange={() => toggle(acc.id)}
                                />
                            </td>
                            <td className="p-1.5">
                                <div className="relative">
                                    <input
                                        type={revealedUsernames.has(acc.id) ? "text" : "password"}
                                        value={acc.username}
                                        onChange={e => change(acc.id, 'username', e.target.value)}
                                        placeholder="Username"
                                        className="w-full h-8 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-2 pr-9 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleUsernameReveal(acc.id)}
                                        aria-label={revealedUsernames.has(acc.id) ? 'Hide username' : 'Show username'}
                                        className="absolute inset-y-0 right-2 flex items-center justify-center p-1 rounded-full hover:bg-gray-700/10 dark:hover:bg-gray-700/50 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        {revealedUsernames.has(acc.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                </div>
                            </td>

                            <td className="p-1.5">
                                <SensitiveInput
                                    value={acc.password}
                                    onChange={e => change(acc.id, 'password', e.target.value)}
                                    placeholder="Password"
                                />
                            </td>
                            <td className="p-2 font-mono text-xs text-gray-600 dark:text-gray-400">{acc.proxy ? 'Configured' : 'None'}</td>
                            <td className="p-2 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                    <IconSquareButton
                                        onClick={() => setProxyModalAccount(acc)}
                                        className="text-white bg-gray-600 hover:bg-gray-500"
                                    >
                                        <Server size={14}/>
                                    </IconSquareButton>
                                    <LauncherButton
                                        type="runelite"
                                        onClick={() => handleLaunch({ username: acc.username, password: acc.password, proxy: { ip: acc.proxy, type: 'http' } }, 'runelite')}
                                        disabled={!runeliteAvailable}
                                    />
                                    <LauncherButton
                                        type="microbot"
                                        onClick={() => handleLaunch({ username: acc.username, password: acc.password, proxy: { ip: acc.proxy, type: 'http' } }, 'microbot')}
                                    />
                                    <IconSquareButton
                                        onClick={() => del(acc.id)}
                                        className="text-white bg-red-600 hover:bg-red-500"
                                    >
                                        <Trash2 size={14}/>
                                    </IconSquareButton>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {legacyAccounts.length === 0 && (
                        <tr>
                            <td colSpan="5" className="p-6 text-center text-gray-500 dark:text-gray-400">
                                <div className="flex flex-col items-center space-y-2">
                                    <Users size={28} className="text-gray-400 dark:text-gray-500" />
                                    <span>No legacy accounts configured</span>
                                    <span className="text-xs">Click "Add Account"</span>
                                </div>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

/* =========================
   Version Modal
   ========================= */

const VersionSelectionModal = ({ onClose, onDownload, latestVersionInfo, allVersionsInfo, clientVersions }) => {
    const [selectedVersion, setSelectedVersionLocal] = useState('');
    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-black/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 w-full max-w-xl mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Select Version</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                {latestVersionInfo && (
                    <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-900/20 dark:border-emerald-800/50">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Recommended: <span className="font-medium text-emerald-800 dark:text-emerald-200">v{latestVersionInfo.version}</span>
                        </p>
                    </div>
                )}
                <div className="space-y-2">
                    {allVersionsInfo.allVersions?.map(v => (
                        <div
                            key={v}
                            className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                                selectedVersion === v
                                    ? 'border-blue-500 bg-blue-50/60 dark:bg-[rgba(0,142,255,0.1)]'
                                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50'
                            }`}
                            onClick={() => setSelectedVersionLocal(v)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className="font-medium text-gray-900 dark:text-white">v{v}</span>
                                    {v === latestVersionInfo?.version && (
                                        <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full dark:bg-emerald-900/30 dark:text-emerald-200">
                      Latest
                    </span>
                                    )}
                                </div>
                                {clientVersions.includes(`microbot-${v}.jar`) && (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Downloaded</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-5 flex justify-end space-x-2">
                    <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                    <PrimaryButton
                        onClick={() => {
                            if (selectedVersion) {
                                onDownload(selectedVersion);
                                onClose();
                            }
                        }}
                        disabled={!selectedVersion}
                        className={`${!selectedVersion ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Download
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
};

/* =========================
   Tabs
   ========================= */

const TabButton = ({ id, label, icon: Icon, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`relative px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
    >
        <span className="flex items-center space-x-1.5"><Icon size={14} /><span>{label}</span></span>
        {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008eff]" />}
    </button>
);

export default GhostliteLauncher;
