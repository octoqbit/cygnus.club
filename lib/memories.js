import { supabase, checked } from './supabase.js';
import { imageURL, setContentImage } from './content.js';

export const starterMemories = [
  {
    id: 'starter-1',
    title: 'Late Night Builds & Hackathons',
    caption: 'Soldering irons hot at 2 AM. Where code meets copper, circuits spark to life, and prototypes take their first breath.',
    image: '/about-assets/ai_hackathon.jpg',
    image_alt: 'Students collaborating around laptops and circuits during a late night build session',
    category: 'Build sessions',
    taken_on: '2026-10-12',
  },
  {
    id: 'starter-2',
    title: 'The Robotics Workbench',
    caption: 'Precision actuators, microcontrollers, and custom-designed 3D chassis ready for endurance testing in the lab.',
    image: '/about-assets/robot-workbench-1440.webp',
    image_alt: 'Robotics workbench covered with tools, robot arm assemblies, and electronics components',
    category: 'Workshops',
    taken_on: '2026-09-28',
  },
  {
    id: 'starter-3',
    title: 'Atlas Rover Field Calibration',
    caption: 'Taking the all-terrain chassis out into the quad for autonomous navigation calibration and sensor telemetry tests.',
    image: '/showcase-assets/rover.jpg',
    image_alt: 'Autonomous exploration rover prototype stationed on outdoor terrain',
    category: 'Campus events',
    taken_on: '2026-09-15',
  },
  {
    id: 'starter-4',
    title: 'The Minds Behind CYGNUS',
    caption: 'The engineers, designers, and curious minds who build, debug, and celebrate together. Every project starts with a good team.',
    image: '/showcase-assets/crew.jpg',
    image_alt: 'CYGNUS technical club members gathered together smiling in the workshop',
    category: 'Team moments',
    taken_on: '2026-09-01',
  },
];

const dateLabel = value => value ? new Intl.DateTimeFormat('en-IN', {day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)) : '';

export async function initializeMemories() {
  const section = document.querySelector('#memories');
  if (!section) return;

  const compartment = section.querySelector('#memories-compartment');
  const status = section.querySelector('.memories-status');
  const retry = section.querySelector('.memories-retry');
  const viewer = document.querySelector('#memory-viewer');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeMemories = starterMemories;
  let customMemories = [];
  let showcaseController = null;

  // Showcase Compartment Controller: Handles Corner-Peel & Autoplay
  function setupShowcase(items) {
    if (showcaseController) showcaseController.destroy();
    if (!compartment) return;

    let currentIndex = 0;
    let isPeeling = false;
    let isHoveringPicture = false;
    let progressAnim = null;
    let progressStart = 0;
    let visible = !('IntersectionObserver' in window);
    let viewerIndex = 0;
    let contentTimer, peelTimer;
    const listeners = new AbortController();
    const listen = (element, event, handler) => element?.addEventListener(event, handler, {signal:listeners.signal});
    const DURATION = 4400;

    const posterCard = compartment.querySelector('.memory-poster-card');
    const viewport = compartment.querySelector('.poster-viewport');
    const currentImg = compartment.querySelector('.poster-current-img');
    const nextImg = compartment.querySelector('.poster-next-img');
    const frameLabel = compartment.querySelector('.poster-frame-label');
    const categoryLabel = compartment.querySelector('.poster-category-label');
    const progressBar = compartment.querySelector('.poster-progress-fill');

    const storyCategory = compartment.querySelector('.memory-showcase-category');
    const storyDate = compartment.querySelector('.memory-showcase-date');
    const storyTitle = compartment.querySelector('.memory-showcase-title');
    const storyCaption = compartment.querySelector('.memory-showcase-caption');
    const storyCount = compartment.querySelector('.poster-count');

    const prevBtn = compartment.querySelector('.poster-prev-btn');
    const nextBtn = compartment.querySelector('.poster-next-btn');
    const peelBtn = compartment.querySelector('.poster-corner-peel-btn');
    const openBtn = compartment.querySelector('.poster-open-btn');
    const robotBubble = compartment.querySelector('.bubble-text');

    const robotRemarks = [
      "Click the photo for its story. Peel the corner for the next moment!",
      "A late-night circuit that worked on the first try.",
      "Another memorable milestone in the CYGNUS lab.",
      "The tiny moments behind the big breakthroughs.",
      "Crafted with curiosity, kept in the frame."
    ];

    function renderViewer() {
      const item = items[viewerIndex];
      const image = viewer.querySelector('.memory-viewer-image');
      setContentImage(image, item.image);
      image.sizes = '90vw';
      image.alt = item.image_alt || item.title;
      viewer.querySelector('#memory-viewer-title').textContent = item.title;
      viewer.querySelector('#memory-viewer-caption').textContent = item.caption || '';
      viewer.querySelector('.memory-meta').textContent = [item.category, dateLabel(item.taken_on)].filter(Boolean).join(' · ');
      viewer.querySelector('[data-viewer-count]').textContent = `MOMENT ${String(viewerIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      viewer.querySelectorAll('[data-memory-step]').forEach(button => button.disabled = items.length < 2);
    }

    function stepViewer(direction) {
      viewerIndex = (viewerIndex + direction + items.length) % items.length;
      renderViewer();
    }

    listen(openBtn, 'click', () => {
      if (!viewer || isPeeling || viewer.open) return;
      cancelAnimationFrame(progressAnim);
      viewerIndex = currentIndex;
      renderViewer();
      viewer.showModal();
      document.documentElement.classList.add('memory-viewer-open');
    });
    listen(viewer?.querySelector('[data-memory-close]'), 'click', () => viewer.close());
    viewer?.querySelectorAll('[data-memory-step]').forEach(button => {
      listen(button, 'click', () => stepViewer(Number(button.dataset.memoryStep)));
    });
    listen(viewer, 'keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        stepViewer(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    listen(viewer, 'click', event => {
      if (event.target !== viewer) return;
      const box = viewer.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) viewer.close();
    });
    listen(viewer, 'close', () => {
      document.documentElement.classList.remove('memory-viewer-open');
      currentIndex = viewerIndex;
      updateContent(currentIndex);
      openBtn?.focus({preventScroll:true});
      resetProgressTimer();
    });

    function updateContent(index) {
      const item = items[index];
      if (!item) return;

      if (currentImg) {
        setContentImage(currentImg, item.image);
        currentImg.alt = item.image_alt || item.title;
      }

      const total = items.length;
      const cur = String(index + 1).padStart(2, '0');
      const tot = String(total).padStart(2, '0');

      if (frameLabel) frameLabel.textContent = `FRAME ${cur} / ${tot}`;
      if (categoryLabel) categoryLabel.textContent = item.category || 'MOMENT';
      if (storyCategory) storyCategory.textContent = item.category || 'CYGNUS';
      if (storyDate) storyDate.textContent = dateLabel(item.taken_on) || 'ARCHIVES';
      if (storyTitle) storyTitle.textContent = item.title;
      if (storyCaption) storyCaption.textContent = item.caption;
      if (storyCount) storyCount.textContent = `${cur} / ${tot}`;
      if (robotBubble) robotBubble.textContent = robotRemarks[index % robotRemarks.length];
    }

    function peelTo(targetIndex) {
      if (isPeeling || items.length < 2 || viewer?.open) return;
      isPeeling = true;
      cancelAnimationFrame(progressAnim);
      if (openBtn) openBtn.disabled = true;

      const nextIndex = (targetIndex + items.length) % items.length;
      const nextItem = items[nextIndex];

      if (nextImg) {
        setContentImage(nextImg, nextItem.image);
        nextImg.alt = nextItem.image_alt || nextItem.title;
      }

      viewport?.classList.add('is-peeling');
      posterCard?.classList.add('is-taping');

      contentTimer = setTimeout(() => {
        currentIndex = nextIndex;
        const total = items.length;
        const cur = String(currentIndex + 1).padStart(2, '0');
        const tot = String(total).padStart(2, '0');

        if (storyCategory) storyCategory.textContent = nextItem.category || 'CYGNUS';
        if (storyDate) storyDate.textContent = dateLabel(nextItem.taken_on) || 'ARCHIVES';
        if (storyTitle) storyTitle.textContent = nextItem.title;
        if (storyCaption) storyCaption.textContent = nextItem.caption;
        if (frameLabel) frameLabel.textContent = `FRAME ${cur} / ${tot}`;
        if (categoryLabel) categoryLabel.textContent = nextItem.category || 'MOMENT';
        if (storyCount) storyCount.textContent = `${cur} / ${tot}`;
        if (robotBubble) robotBubble.textContent = robotRemarks[currentIndex % robotRemarks.length];
      }, 420);

      peelTimer = setTimeout(() => {
        if (currentImg) {
          setContentImage(currentImg, nextItem.image);
          currentImg.alt = nextItem.image_alt || nextItem.title;
        }
        viewport?.classList.remove('is-peeling');
        posterCard?.classList.remove('is-taping');
        isPeeling = false;
        if (openBtn) openBtn.disabled = false;
        resetProgressTimer();
      }, 850);
    }

    function startProgressTimer() {
      cancelAnimationFrame(progressAnim);
      if (!visible || document.hidden || reducedMotion.matches || items.length < 2 || isHoveringPicture || viewer?.open || posterCard?.contains(document.activeElement)) return;

      progressStart = performance.now();
      function step(now) {
        if (!visible || document.hidden || isHoveringPicture || isPeeling || viewer?.open) return;
        const elapsed = now - progressStart;
        const pct = Math.min(100, (elapsed / DURATION) * 100);
        if (progressBar) progressBar.style.transform = `scaleX(${pct / 100})`;
        if (elapsed < DURATION) {
          progressAnim = requestAnimationFrame(step);
        } else {
          peelTo(currentIndex + 1);
        }
      }
      progressAnim = requestAnimationFrame(step);
    }

    function resetProgressTimer() {
      if (progressBar) progressBar.style.transform = 'scaleX(0)';
      if (!isHoveringPicture) {
        startProgressTimer();
      }
    }

    // ONLY pause when cursor is directly on the picture
    listen(posterCard, 'pointerenter', () => {
      isHoveringPicture = true;
      cancelAnimationFrame(progressAnim);
    });
    listen(posterCard, 'pointerleave', () => {
      isHoveringPicture = false;
      if (!isPeeling) resetProgressTimer();
    });
    listen(posterCard, 'focusin', () => cancelAnimationFrame(progressAnim));
    listen(posterCard, 'focusout', event => {
      if (!posterCard.contains(event.relatedTarget) && !isPeeling) resetProgressTimer();
    });

    // Arrow and corner controls
    listen(nextBtn, 'click', () => peelTo(currentIndex + 1));
    listen(prevBtn, 'click', () => peelTo(currentIndex - 1));
    listen(peelBtn, 'click', (e) => {
      e.stopPropagation();
      peelTo(currentIndex + 1);
    });

    const visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resetProgressTimer();
    }, {threshold: 0.05}) : null;
    visibilityObserver?.observe(compartment);
    listen(document, 'visibilitychange', resetProgressTimer);
    listen(reducedMotion, 'change', resetProgressTimer);

    updateContent(0);
    resetProgressTimer();

    showcaseController = {
      destroy() {
        cancelAnimationFrame(progressAnim);
        clearTimeout(contentTimer);
        clearTimeout(peelTimer);
        if (viewer?.open) viewer.close();
        document.documentElement.classList.remove('memory-viewer-open');
        listeners.abort();
        visibilityObserver?.disconnect();
      },
      peelTo,
    };
  }

  async function load() {
    status.hidden = false;
    status.textContent = 'Opening the album…';
    retry.hidden = true;

    try {
      const rows = supabase ? checked(await supabase.from('memories').select('*').eq('published', true).order('sort_order').order('taken_on', { ascending: false, nullsFirst: false }).order('id')) : [];
      customMemories = rows.filter(memory => imageURL(memory.image));

      if (customMemories.length > 0) {
        activeMemories = customMemories;
        compartment?.classList.remove('memories-empty');
        setupShowcase(customMemories);
      } else {
        activeMemories = starterMemories;
        compartment?.classList.add('memories-empty');
        setupShowcase(starterMemories);
      }
      status.hidden = true;
    } catch (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        activeMemories = starterMemories;
        customMemories = [];
        compartment?.classList.add('memories-empty');
        setupShowcase(starterMemories);
        status.hidden = true;
        return;
      }
      status.textContent = 'The album couldn’t load. Please try again.';
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', load);
  await load();
}
