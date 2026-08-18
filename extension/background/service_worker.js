

let offscreenDocumentReady = false;
let currentGazeFriction = 0;
let currentBlinkRate = 0;
let currentHeadMovement = 0;

async function setupOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) {
    offscreenDocumentReady = true;
    return;
  }
  
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Monitoring webcam for eye-tracking telemetry'
  });
  
  offscreenDocumentReady = true;
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log("NeuroLens Extension Installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTH_SUCCESS") {
    setupOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'START_TELEMETRY' });
    });
  }

  if (message.type === "EYE_TRACKING_DATA") {
    currentGazeFriction = message.payload.gazeScore || 0;
    currentBlinkRate = message.payload.blinkRate || 0;
    currentHeadMovement = message.payload.headMovement || 0;
    sendResponse({ status: "success" });
  }

  if (message.type === "TELEMETRY_DATA") {
    handleTelemetry(message.payload, sender.tab?.id);
    sendResponse({ status: "success" });
  }
});

async function handleTelemetry(contentPayload, tabId) {
  const { token } = await chrome.storage.local.get('token');
  
  if (!token) {
    console.log("NeuroLens: Not logged in, skipping telemetry");
    return; // Don't send if not logged in
  }

  const payload = {
    url: contentPayload.url,
    friction_score: contentPayload.frictionScore, // from scroll/typing
    gaze_score: currentGazeFriction,
    scroll_erratic: contentPayload.scroll_erratic || 0,
    keystrokes: contentPayload.keystrokes || 0,
    timestamp: Date.now()
  };

  try {
    const res = await fetch('http://localhost:8000/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      console.warn("NeuroLens: Token expired or invalid. Clearing.");
      await chrome.storage.local.remove(['token', 'studentId', 'studentName']);

      chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_TELEMETRY' });
      return;
    }

    if (res.ok) {
      const data = await res.json();

      if (tabId && data.intervention) {
        chrome.tabs.sendMessage(tabId, {
          type: "APPLY_INTERVENTION",
          intervention: data.intervention
        });
      } else if (tabId && !data.intervention) {
        chrome.tabs.sendMessage(tabId, {
          type: "REVERT_INTERVENTION"
        });
      }
    }
  } catch (err) {
    console.error("NeuroLens Backend fetch error:", err);
  }
}

