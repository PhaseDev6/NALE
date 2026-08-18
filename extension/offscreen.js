const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas'); // Keep if mediapipe needs it, but we won't draw to it
let isTracking = false;
let lastPupilPos = { x: 0, y: 0 };
let erraticGazeCount = 0;
let blinks = 0;
let lastHeadPose = { pitch: 0, yaw: 0, roll: 0 };
let headMovements = 0;

const faceMesh = new FaceMesh({
  locateFile: (file) => `node_modules/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true, // Enables pupil tracking
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

function onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    return;
  }
  
  const landmarks = results.multiFaceLandmarks[0];

  const leftPupil = landmarks[468]; 


  const p_top = landmarks[159];
  const p_bot = landmarks[145];
  const p_in = landmarks[133];
  const p_out = landmarks[33];
  
  const h_dist = Math.hypot(p_out.x - p_in.x, p_out.y - p_in.y);
  const v_dist = Math.hypot(p_top.x - p_bot.x, p_top.y - p_bot.y);
  const ear = v_dist / h_dist;
  
  if (ear < 0.2) { // Threshold for blink
    blinks++;
  }

  if (leftPupil) {
    const dx = leftPupil.x - lastPupilPos.x;
    const dy = leftPupil.y - lastPupilPos.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.015) { 
      erraticGazeCount++;
    }
    lastPupilPos = { x: leftPupil.x, y: leftPupil.y };
  }

  const nose = landmarks[1];
  const headDist = Math.hypot(nose.x - lastHeadPose.yaw, nose.y - lastHeadPose.pitch);
  if (headDist > 0.05) {
    headMovements++;
  }
  lastHeadPose = { yaw: nose.x, pitch: nose.y, roll: 0 };
}

let videoInterval;

async function attemptStartCamera() {
  if (!isTracking) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoElement.srcObject = stream;
      
      await new Promise((resolve) => {
        videoElement.onplaying = resolve;
      });
      
      isTracking = true;
      console.log("MediaPipe Camera Started automatically");
      
      videoInterval = setInterval(async () => {
        if (videoElement.readyState >= 2 && !document.hidden) {
          await faceMesh.send({ image: videoElement });
        }
      }, 100); 
      
    } catch (err) {
      console.error("Camera start failed, waiting for permission:", err);
    }
  }
}

function stopCamera() {
  if (videoInterval) clearInterval(videoInterval);
  if (videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(t => t.stop());
  }
  isTracking = false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'START_TELEMETRY') {
    attemptStartCamera();
    sendResponse({ status: 'started' });
  }
  if (message.type === 'STOP_TELEMETRY') {
    stopCamera();
    sendResponse({ status: 'stopped' });
  }
});

setInterval(() => {
  if (isTracking) {

    const gazeScore = Math.min(erraticGazeCount / 20, 1.0);
    const blinkRate = Math.min(blinks / 10, 1.0);
    const headScore = Math.min(headMovements / 10, 1.0);
    
    chrome.runtime.sendMessage({
      type: 'EYE_TRACKING_DATA',
      payload: {
        gazeScore: gazeScore,
        blinkRate: blinkRate,
        headMovement: headScore,
        timestamp: Date.now()
      }
    });

    erraticGazeCount = 0;
    blinks = 0;
    headMovements = 0;
  }
}, 5000);

