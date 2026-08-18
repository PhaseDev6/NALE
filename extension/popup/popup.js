const BACKEND_URL = "https://nale-backend.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
  const loginScreen = document.getElementById('loginScreen');
  const mainScreen = document.getElementById('mainScreen');
  const loginError = document.getElementById('loginError');
  const studentNameDisplay = document.getElementById('studentNameDisplay');

  const { token, studentName } = await chrome.storage.local.get(['token', 'studentName']);
  
  if (token) {
    showMainScreen(studentName);
  } else {
    loginScreen.classList.remove('hidden');
  }

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const schoolCode = document.getElementById('schoolCode').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const pin = document.getElementById('pin').value.trim();
    const profile = document.getElementById('disorderProfile').value;

    if (!schoolCode || !studentId || !pin) {
      showError("All fields required");
      return;
    }

    loginError.classList.add('hidden');
    document.getElementById('loginBtn').innerText = "Logging in...";

    try {
      const res = await fetch(`${BACKEND_URL}/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          student_id_str: studentId,
          pin: pin,
          disorder_profile: profile !== "none" ? profile : null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      await chrome.storage.local.set({
        token: data.access_token,
        studentId: data.student.id,
        studentName: data.student.name,
        disorderProfile: data.student.disorder_profile
      });

      chrome.runtime.sendMessage({ type: "AUTH_SUCCESS" });
      showMainScreen(data.student.name);
      
    } catch (err) {
      showError(err.message);
    } finally {
      document.getElementById('loginBtn').innerText = "Login";
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await chrome.storage.local.clear();
    mainScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  document.getElementById('requestCamera').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("permissions.html") });
  });

  function showMainScreen(name) {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    studentNameDisplay.innerText = `👋 ${name}`;
  }

  function showError(msg) {
    loginError.innerText = msg;
    loginError.classList.remove('hidden');
  }
});

