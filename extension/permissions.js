document.getElementById('grantBtn').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream since we just needed to trigger the permission prompt
    stream.getTracks().forEach(track => track.stop());
    
    document.getElementById('grantBtn').style.display = 'none';
    document.getElementById('status').style.display = 'block';
    
    // Tell background script to restart telemetry
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'START_TELEMETRY' });
    
    setTimeout(() => {
      window.close(); // Close the tab automatically
    }, 2000);
  } catch (err) {
    console.error("Camera access denied:", err);
    alert("Camera permission was denied. Please click the camera icon in your URL bar to allow it.");
  }
});
