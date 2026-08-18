

let keystrokes = 0;
let scrollDistance = 0;
let lastScrollPos = window.scrollY;
let lastScrollTime = Date.now();
let directionReversals = 0;
let lastDirection = 0; // 1 down, -1 up

console.log("NeuroLens: Telemetry active on page.");

document.addEventListener('keydown', () => {
  keystrokes++;
});

document.addEventListener('scroll', () => {
  const currentPos = window.scrollY;
  const currentTime = Date.now();
  
  const distance = currentPos - lastScrollPos;
  scrollDistance += Math.abs(distance);
  
  const currentDirection = distance > 0 ? 1 : (distance < 0 ? -1 : 0);
  if (currentDirection !== 0 && lastDirection !== 0 && currentDirection !== lastDirection) {
    directionReversals++;
  }
  if (currentDirection !== 0) {
    lastDirection = currentDirection;
  }
  
  lastScrollPos = currentPos;
  lastScrollTime = currentTime;
});

setInterval(() => {
  const timeSinceLastScroll = Date.now() - lastScrollTime;

  const normalizedScroll = Math.min(scrollDistance / 5000, 1.0); 
  const normalizedKeys = Math.min(keystrokes / 20, 1.0);
  const normalizedReversals = Math.min(directionReversals / 5, 1.0);
  
  const isPaused = timeSinceLastScroll > 3000 && keystrokes === 0;


  const frictionScore = Math.min((normalizedScroll * 0.5) + (normalizedReversals * 0.3) + (normalizedKeys * 0.2), 1.0);

  const payload = {
    url: window.location.href,
    keystrokes: keystrokes,
    scroll_erratic: normalizedScroll + normalizedReversals,
    frictionScore: frictionScore,
    timestamp: Date.now(),
    isPaused: isPaused
  };

  chrome.runtime.sendMessage({ type: "TELEMETRY_DATA", payload: payload });

  keystrokes = 0;
  scrollDistance = 0;
  directionReversals = 0;
}, 5000);

