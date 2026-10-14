import { initializeTeamDirectory } from './lib/team-directory.js';
import { initializeProjects } from './lib/public-content.js';
import { projectHref } from './lib/project-data.mjs';
import { initializeMemberCta } from './lib/member-cta.js';
initializeMemberCta();
const projectItemsReady = initializeProjects();
const body = document.body;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('.motion-toggle');
let motionPaused = reducedMotion.matches;
function setMotion(paused) {
    motionPaused = paused;
    body.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? '▶ RESUME MOTION' : 'Ⅱ PAUSE MOTION';
    if (paused) document.querySelectorAll('[data-parallax]').forEach(el => {
        el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    });
}
motionButton.addEventListener('click', () => setMotion(!motionPaused));
reducedMotion.addEventListener('change', () => setMotion(reducedMotion.matches));
setMotion(motionPaused);

const menu = document.querySelector('.world-menu');
const nav = document.querySelector('#world-links');
function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.textContent = open ? '×' : '☰';
    nav.classList.toggle('menu-open', open);
}
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
});

const reveals = [...document.querySelectorAll('[data-reveal]')];
if ('IntersectionObserver' in window) {
    body.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: .08 });
    reveals.forEach(el => revealObserver.observe(el));
    // Keyboard users must never focus an invisible card.
    document.addEventListener('focusin', e => e.target.closest('[data-reveal]')?.classList.add('revealed'));
}
let scrollFrame = 0;
function updateProgress() {
    const available = document.documentElement.scrollHeight - innerHeight;
    const progress = available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0;
    document.querySelector('.scroll-progress').style.transform = `scaleX(${progress})`;
    scrollFrame = 0;
}
addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress); }, { passive: true });
addEventListener('resize', updateProgress);
updateProgress();
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('[data-parallax]').forEach(el => {
    el.addEventListener('pointermove', e => {
        if (motionPaused || reducedMotion.matches || !finePointer.matches) return;
        const box = el.getBoundingClientRect();
        const x = (e.clientX - box.left) / box.width - .5;
        const y = (e.clientY - box.top) / box.height - .5;
        el.style.setProperty('--rx', `${x * 7}deg`);
        el.style.setProperty('--ry', `${-y * 7}deg`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
});

const filters = [...document.querySelectorAll('[data-filter]')];

filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let shown = 0;
    document.querySelectorAll('[data-category]').forEach(card => {
        card.hidden = button.dataset.filter !== 'all' && button.dataset.filter !== card.dataset.category;
        if (!card.hidden) { shown++; card.classList.add('revealed'); }
    });
    document.querySelector('.filter-count').textContent = `${shown} concept${shown === 1 ? '' : 's'}`;
    updateProgress();
}));

initializeTeamDirectory();

const requestedProject = new URLSearchParams(location.search).get('project');
if (requestedProject && body.classList.contains('project-world')) location.replace(projectHref(requestedProject));

projectItemsReady.then(() => {
    document.querySelectorAll('.experiment-card[data-reveal]').forEach(card => card.classList.add('revealed'));
    document.querySelector('[data-filter][aria-pressed="true"]')?.click();
});
