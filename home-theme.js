// Independent of content loading so the switch works even while offline.
const root = document.documentElement;
const toggle = document.querySelector('.home-theme-toggle');
const themeKey = 'cygnus-home-theme';
let selectedTheme = 'light';

function savedTheme() {
    try {
        return localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light';
    } catch {
        return selectedTheme;
    }
}

function applyTheme(dark) {
    if (dark) root.dataset.homeTheme = 'dark';
    else delete root.dataset.homeTheme;
    toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    const label = dark ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-label', label);
    toggle.querySelector('[data-theme-label]').textContent = label;
}

// New visitors start light; an explicit choice is remembered on this browser.
if (toggle) {
    selectedTheme = savedTheme();
    applyTheme(selectedTheme === 'dark');
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        const dark = root.dataset.homeTheme !== 'dark';
        selectedTheme = dark ? 'dark' : 'light';
        applyTheme(dark);
        try { localStorage.setItem(themeKey, selectedTheme); } catch {
            // Keep the switch usable when storage is blocked or unavailable.
        }
    });

    const restoreTheme = () => {
        selectedTheme = savedTheme();
        applyTheme(selectedTheme === 'dark');
    };
    window.addEventListener('pageshow', event => {
        if (event.persisted) restoreTheme();
    });
    window.addEventListener('storage', event => {
        if (event.key === themeKey || event.key === null) restoreTheme();
    });
}
