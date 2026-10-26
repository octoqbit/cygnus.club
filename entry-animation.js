// Homepage entrance is separate from page content and never waits on the network.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const sessionKey = 'cygnus-entry-seen-v1';

function playEntrance() {
    if (!document.body.classList.contains('home-page') || motionPreference.matches) return;
    if (location.hash || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;
    try {
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, '1');
    } catch { /* The entrance still works when browser storage is unavailable. */ }

    const entrance = document.createElement('dialog');
    entrance.className = 'cygnus-entry';
    entrance.setAttribute('aria-label', 'Welcome to CYGNUS');
    entrance.innerHTML = `
        <div class="cygnus-entry-grid" aria-hidden="true"></div>
        <div class="cygnus-entry-top" aria-hidden="true">
            <span><i></i> CYGNUS / INITIALIZE</span><span>BTKIT · DWARAHAT</span>
        </div>
        <div class="cygnus-entry-core" aria-hidden="true">
            <div class="cygnus-entry-orbits"><i></i><i></i><i></i><b>+</b><b>+</b></div>
            <svg class="cygnus-entry-circuits" viewBox="0 0 1200 400" fill="none">
                <path d="M0 110H180L240 170H410M0 290H140L210 220H360M1200 100H1040L960 180H810M1200 310H1070L990 230H860"/>
                <path d="M0 130H170L230 190H350M1200 290H1080L1000 210H900"/>
                <circle cx="410" cy="170" r="4"/><circle cx="360" cy="220" r="4"/>
                <circle cx="810" cy="180" r="4"/><circle cx="860" cy="230" r="4"/>
            </svg>
            <p class="cygnus-entry-kicker">CURIOSITY IS THE SOURCE CODE.</p>
            <div class="cygnus-entry-wordmark" data-wordmark>CYGNUS</div>
            <div class="cygnus-entry-status"><span data-stage>01 / ACQUIRING SIGNAL</span><span class="cygnus-entry-pulse">● ● ●</span></div>
        </div>
        <div class="cygnus-entry-bottom" aria-hidden="true">BUILD. BREAK. GO BEYOND.</div>
        <div class="cygnus-entry-seam" aria-hidden="true"></div>`;

    let finished = false;
    let frame;
    const timers = [];
    function cleanup() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(frame);
        timers.forEach(clearTimeout);
        motionPreference.removeEventListener('change', cleanup);
        window.removeEventListener('pagehide', cleanup);
        if (entrance.open) entrance.close();
        entrance.remove();
    }
    entrance.addEventListener('cancel', event => { event.preventDefault(); cleanup(); });
    motionPreference.addEventListener('change', cleanup);
    window.addEventListener('pagehide', cleanup);
    document.body.append(entrance);
    try { entrance.showModal(); } catch { cleanup(); return; }

    // A hard deadline always releases the page, even if animations are interrupted.
    timers.push(setTimeout(cleanup, 3000));
    const wordmark = entrance.querySelector('[data-wordmark]');
    const stage = entrance.querySelector('[data-stage]');
    const start = performance.now();
    let previousTick = -1;
    function decode(now) {
        if (finished) return;
        const elapsed = now - start;
        const tick = Math.floor(elapsed / 65);
        if (tick !== previousTick) {
            previousTick = tick;
            const revealed = Math.floor(elapsed / 115);
            wordmark.textContent = [...'CYGNUS'].map((letter, index) => index < revealed
                ? letter : '01X+<>/='[(tick + index * 3) % 8]).join('');
        }
        if (elapsed < 750) frame = requestAnimationFrame(decode);
        else wordmark.textContent = 'CYGNUS';
    }
    frame = requestAnimationFrame(decode);
    timers.push(setTimeout(() => {
        stage.textContent = '02 / CORE SYNCHRONIZED';
        entrance.classList.add('is-locked');
    }, 850));
    timers.push(setTimeout(() => { stage.textContent = '03 / READY TO EXPLORE'; }, 1500));
    timers.push(setTimeout(() => { entrance.classList.add('is-revealing'); }, 1900));
}

playEntrance();
