import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import './portal-theme.css';

const themeKey = 'cygnus-home-theme';
function readTheme() {
    try { return localStorage.getItem(themeKey) === 'dark'; } catch { return false; }
}
function applyTheme(dark) {
    document.documentElement.dataset.portalTheme = dark ? 'dark' : 'light';
}
// Apply before React renders, including on the login pages.
applyTheme(readTheme());

export function PortalThemeToggle() {
    const [dark, setDark] = useState(readTheme);
    useEffect(() => {
        const sync = () => {
            const saved = readTheme();
            setDark(saved);
            applyTheme(saved);
        };
        const onStorage = event => {
            if (event.key === themeKey || event.key === null) sync();
        };
        const onPageShow = event => { if (event.persisted) sync(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('pageshow', onPageShow);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, []);
    function toggle() {
        const next = !dark;
        setDark(next);
        applyTheme(next);
        try { localStorage.setItem(themeKey, next ? 'dark' : 'light'); } catch { /* Still usable without storage. */ }
    }
    return <button type="button" className="portal-theme-toggle" onClick={toggle}
        aria-label={dark ? 'Light mode' : 'Dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {dark ? <Sun size={17} aria-hidden="true"/> : <Moon size={17} aria-hidden="true"/>}
        <span>{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>;
}
