// NALE Intervention Engine (v2)

let activeIntervention = null;
let injectedStyleEl = null;
let rulerEl = null;

const INTERVENTIONS = {
  tier1_spacing:        () => applyStyle("body, p { line-height: 2.0 !important; word-spacing: 0.2em !important; }"),
  tier2_font_ruler:     () => {
    applyStyle("body, p, span, div, a, li { font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important; line-height: 2.0 !important; word-spacing: 0.2em !important; }");
    activateReadingRuler();
  },
  tier1_focus_highlight: () => applyStyle("body { background-color: #f0fdf4 !important; } p:hover { background-color: #dcfce7 !important; }"),
  tier2_chunk_content:  () => applyStyle("p { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 15px; }"),
  tier1_reduce_noise:   () => applyStyle("img, video, iframe { opacity: 0.3 !important; transition: opacity 0.3s; } img:hover { opacity: 1 !important; }"),
  tier3_break_prompt:   () => showBreakCard()
};

function revertAll() {
  injectedStyleEl?.remove();
  rulerEl?.remove();
  document.querySelector('.nale-break-card')?.remove();
  
  injectedStyleEl = null;
  rulerEl = null;
  activeIntervention = null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "APPLY_INTERVENTION" && msg.intervention !== activeIntervention) {
    console.log("NALE: Applying intervention ->", msg.intervention);
    revertAll();
    if (INTERVENTIONS[msg.intervention]) {
      INTERVENTIONS[msg.intervention]();
      activeIntervention = msg.intervention;
    }
  }
  if (msg.type === "REVERT_INTERVENTION") {
    console.log("NALE: Reverting interventions");
    revertAll();
  }
});

function applyStyle(cssText) {
  injectedStyleEl = document.createElement("style");
  injectedStyleEl.id = "nale-dynamic-styles";
  injectedStyleEl.textContent = cssText;
  document.head.appendChild(injectedStyleEl);
}

function activateReadingRuler() {
  rulerEl = document.createElement('div');
  rulerEl.className = 'nale-reading-ruler';
  rulerEl.style.cssText = `
    position: fixed; left: 0; right: 0; height: 100px;
    pointer-events: none; z-index: 999999;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); top: 0;
  `;
  document.body.appendChild(rulerEl);
  
  document.addEventListener('mousemove', (e) => {
    if (rulerEl) rulerEl.style.top = `${e.clientY - 50}px`;
  });
}

function showBreakCard() {
  const card = document.createElement('div');
  card.className = 'nale-break-card';
  card.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 999999;
    background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    border-left: 4px solid #f59e0b; font-family: sans-serif;
  `;
  card.innerHTML = `
    <h3 style="margin:0 0 10px 0; color: #b45309;">Take a breather</h3>
    <p style="margin:0; color: #4b5563; font-size: 14px;">Your cognitive load seems high. Close your eyes for 30 seconds.</p>
  `;
  document.body.appendChild(card);
}
