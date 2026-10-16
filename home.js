import { initializeMemories } from './lib/memories.js';
import { initializeHome } from './lib/public-content.js';
import { initializeMemberCta } from './lib/member-cta.js';
initializeMemberCta();
void initializeMemories();
await initializeHome();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-event-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.home-event-track');
    const slides = [...carousel.querySelectorAll('.home-event-slide')];
    if (!slides.length) return;
    const dots = [...carousel.querySelectorAll('[data-event-dot]')];
    const count = carousel.querySelector('.home-event-count');
    const pause = carousel.querySelector('[data-event-pause]');
    let index = 0;
    let paused = reducedMotion.matches;
    let focused = false;
    let hovered = false;
    let visible = !('IntersectionObserver' in window);
    let timer;

    function show(next) {
        index = (next + slides.length) % slides.length;
        track.style.transform = `translateX(-${index * 100}%)`;
        slides.forEach((slide, position) => {
            slide.inert = position !== index;
            slide.setAttribute('aria-hidden', String(position !== index));
            dots[position].setAttribute('aria-current', String(position === index));
        });
        count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    }

    function schedule() {
        clearInterval(timer);
        if (slides.length > 1 && !paused && !focused && !hovered && visible && !document.hidden) {
            timer = setInterval(() => show(index + 1), 6000);
        }
    }

    function updatePause() {
        pause.textContent = paused ? '▶' : 'Ⅱ';
        pause.setAttribute('aria-pressed', String(paused));
        pause.setAttribute('aria-label', paused ? 'Start automatic slides' : 'Pause automatic slides');
        schedule();
    }

    carousel.querySelector('[data-event-prev]').addEventListener('click', () => { show(index - 1); schedule(); });
    carousel.querySelector('[data-event-next]').addEventListener('click', () => { show(index + 1); schedule(); });
    dots.forEach((dot, position) => dot.addEventListener('click', () => { show(position); schedule(); }));
    pause.addEventListener('click', () => {
        paused = !paused;
        // Starting playback must work even when the play button retains focus.
        focused = false;
        updatePause();
    });
    const hasKeyboardFocus = (target) => target instanceof Element
        && target !== pause && carousel.contains(target) && target.matches(':focus-visible');
    carousel.addEventListener('focusin', (event) => {
        // A mouse click or resting pointer should not silently stop autoplay.
        focused = hasKeyboardFocus(event.target);
        schedule();
    });
    carousel.addEventListener('focusout', (event) => {
        focused = hasKeyboardFocus(event.relatedTarget);
        schedule();
    });
    // Let people read a card without it moving; touch taps must not latch a hover pause.
    const viewport = carousel.querySelector('.home-event-viewport');
    viewport.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        hovered = true;
        schedule();
    });
    viewport.addEventListener('pointerleave', () => {
        hovered = false;
        schedule();
    });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; updatePause(); });
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            if (visible === entry.isIntersecting) return;
            visible = entry.isIntersecting;
            schedule();
        });
        observer.observe(carousel);
    }
    show(0);
    updatePause();
});
