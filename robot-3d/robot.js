/* Original motion is baked into the source asset: no retiming or filters. */
const robot = document.querySelector('.robot-assembly');
const playButton = document.querySelector('.play-button');
const playbackError = document.querySelector('.playback-error');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let inView = parent === window;
let userStarted = false;
const saveData = navigator.connection?.saveData;

function showPlayButton(show) {
  playButton.hidden = !show;
  if (parent !== window) parent.postMessage({type: 'cygnus:hero-interactive', interactive: show}, location.origin);
}

// Safari needs HEVC for video transparency; Chromium/Firefox use VP9 alpha.
// Choosing explicitly also avoids opaque HEVC playback in Chromium on macOS.
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(ua);
robot.muted = true;
robot.defaultMuted = true;
robot.src = isSafari || isIOS
  ? 'assets/robot-assembly-safari.mp4'
  : 'assets/robot-assembly.webm';

async function play() {
  try {
    await robot.play();
    showPlayButton(false);
  } catch (error) {
    // Mobile low-power mode may require a user gesture even for muted video.
    if (error.name === 'NotAllowedError') showPlayButton(true);
    else if (error.name !== 'AbortError') playbackError.hidden = false;
  }
}

robot.addEventListener('error', () => {
  playbackError.hidden = false;
  showPlayButton(false);
});
robot.addEventListener('playing', () => {
  showPlayButton(false);
  playbackError.hidden = true;
});
function syncPlayback() {
  if (!document.hidden && inView && (userStarted || (!reducedMotion.matches && !saveData))) {
    void play();
  } else {
    robot.pause();
    showPlayButton(inView && (reducedMotion.matches || saveData));
  }
}
playButton.addEventListener('click', () => { userStarted = true; syncPlayback(); });
document.addEventListener('visibilitychange', syncPlayback);
reducedMotion.addEventListener('change', () => { userStarted = false; syncPlayback(); });
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'cygnus:hero-visibility') return;
  inView = event.data.visible === true;
  syncPlayback();
});
if (parent !== window) parent.postMessage({type: 'cygnus:hero-ready'}, location.origin);
syncPlayback();
