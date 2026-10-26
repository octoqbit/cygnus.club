import { hasSessionHint, loginHref } from './lib/session-hint.js';
import './entry-animation.js';

// Internal navigation stays immediate after the optional homepage entrance.
// Route guest project clicks before downloading the protected detail page.
document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['/project.html', '/project'].includes(url.pathname) || hasSessionHint()) return;
    event.preventDefault();
    location.assign(loginHref(url.pathname + url.search + url.hash));
});

// Offscreen homepage videos should not compete with navigation or keep decoding.
const videos = [...document.querySelectorAll('video[data-autoplay]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const visibleVideos = new Set();
function updatePlayback() {
    videos.forEach(video => {
        video.controls = reducedMotion.matches;
        if (!document.hidden && !reducedMotion.matches && visibleVideos.has(video)) video.play().catch(() => {});
        else video.pause();
    });
}
if (videos.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) visibleVideos.add(target);
            else visibleVideos.delete(target);
        });
        updatePlayback();
    }, { threshold: 0.05 });
    videos.forEach(video => observer.observe(video));
    document.addEventListener('visibilitychange', updatePlayback);
    reducedMotion.addEventListener('change', updatePlayback);
    updatePlayback();
} else videos.forEach(video => { video.controls = true; });

// The hero player lives in an iframe, so pass parent viewport visibility to it.
const hero = document.querySelector('iframe[title="CYGNUS robot assembly"]');
if (hero) {
    let heroVisible = !('IntersectionObserver' in window);
    const syncHero = () => hero.contentWindow?.postMessage({type: 'cygnus:hero-visibility', visible: heroVisible && !document.hidden}, location.origin);
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            heroVisible = entry.isIntersecting;
            syncHero();
        }, {threshold: 0.05});
        observer.observe(hero);
    }
    hero.addEventListener('load', syncHero);
    document.addEventListener('visibilitychange', syncHero);
    window.addEventListener('message', event => {
        if (event.origin !== location.origin || event.source !== hero.contentWindow) return;
        if (event.data?.type === 'cygnus:hero-ready') syncHero();
        if (event.data?.type === 'cygnus:hero-interactive') hero.style.pointerEvents = event.data.interactive ? 'auto' : 'none';
    });
}
