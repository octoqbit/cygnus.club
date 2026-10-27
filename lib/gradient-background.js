// Shared homepage halftone renderer; callers own placement and theme scope.
export function mountGradientBackground(host, { className = 'home-gradient-background', themeAttribute = 'data-home-theme' } = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = className;
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) return () => {};
    host.prepend(canvas);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let points = [];
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let dark = document.documentElement.getAttribute(themeAttribute) === 'dark';

    function draw() {
        const time = elapsed * 0.00035;
        context.clearRect(0, 0, width, height);

        // Broad, soft shading beneath the fine dots gives the liquid depth.
        const centerX = width * (0.51 + Math.sin(time * 0.7) * 0.08);
        const centerY = height * (0.43 + Math.cos(time * 0.8) * 0.1);
        const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.65);
        glow.addColorStop(0, dark ? '#adb2bc28' : '#747a782b');
        glow.addColorStop(0.5, dark ? '#adb2bc12' : '#747a7814');
        glow.addColorStop(1, '#747a7800');
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);

        context.fillStyle = dark ? 'rgba(225, 229, 234, 0.38)' : 'rgba(71, 78, 76, 0.30)';
        context.beginPath();
        for (const point of points) {
            const { x, y, u, v, fade } = point;
            // Warped elliptical bands form slowly folding, metallic ribbons.
            const warp = Math.sin(v * 3.8 + time) * 0.18
                + Math.sin(u * 3.1 - v * 2.4 - time * 0.8) * 0.12;
            const radius = Math.hypot((u + warp) * 0.9, v * 0.72);
            const wave = Math.sin(radius * 10 - time * 1.6 + Math.sin(v * 3 + time) * 1.4);
            const ridge = Math.pow(Math.max(0, wave), 9);
            const dotRadius = 0.4 + ridge * fade * 2.6;
            context.moveTo(x + dotRadius, y);
            context.arc(x, y, dotRadius, 0, Math.PI * 2);
        }
        context.fill();
    }

    function animate(now) {
        frame = requestAnimationFrame(animate);
        if (now - lastTime < 1000 / 30) return;
        if (lastTime) elapsed += Math.min(now - lastTime, 100);
        lastTime = now;
        draw();
    }

    function syncAnimation() {
        cancelAnimationFrame(frame);
        lastTime = 0;
        draw();
        if (visible && !document.hidden && !reducedMotion.matches) {
            frame = requestAnimationFrame(animate);
        }
    }

    const resizeObserver = new ResizeObserver(() => {
        width = host.clientWidth;
        height = host.clientHeight;
        const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        const spacing = width < 600 ? 6 : 7;
        points = [];
        for (let y = spacing / 2; y < height; y += spacing) {
            for (let x = spacing / 2; x < width; x += spacing) {
                const u = (x / width - 0.5) * 3;
                const v = (y / height - 0.42) * 2;
                const fade = Math.exp(-(u * u * 0.9 + v * v * 0.35));
                points.push({ x, y, u, v, fade });
            }
        }
        draw();
    });
    resizeObserver.observe(host);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncAnimation();
    });
    visibilityObserver.observe(host);

    const themeObserver = new MutationObserver(() => {
        dark = document.documentElement.getAttribute(themeAttribute) === 'dark';
        draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: [themeAttribute] });

    reducedMotion.addEventListener('change', syncAnimation);
    document.addEventListener('visibilitychange', syncAnimation);
    return () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        themeObserver.disconnect();
        reducedMotion.removeEventListener('change', syncAnimation);
        document.removeEventListener('visibilitychange', syncAnimation);
        canvas.remove();
    };
}
