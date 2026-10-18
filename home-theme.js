// Independent of content loading so the switch works even while offline.
const root = document.documentElement;
const toggle = document.querySelector('.home-theme-toggle');

function applyTheme(dark) {
    if (dark) root.dataset.homeTheme = 'dark';
    else delete root.dataset.homeTheme;
    toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    const label = dark ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-label', label);
    toggle.querySelector('[data-theme-label]').textContent = label;
}

// Every visit starts light. Dark mode is an explicit choice for this page only.
if (toggle) {
    applyTheme(false);
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        const dark = root.dataset.homeTheme !== 'dark';
        applyTheme(dark);
    });
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted && toggle) applyTheme(false);
});
