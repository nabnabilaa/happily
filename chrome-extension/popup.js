const toggleBtn = document.getElementById('toggleBtn');
const statusSpan = document.querySelector('#status span');
const intervalInput = document.getElementById('interval');
const goalInput = document.getElementById('goal');
const progressSelect = document.getElementById('progress');

// Load current state
chrome.storage.local.get(['isRunning', 'interval', 'goal', 'progress'], (data) => {
  if (data.isRunning) {
    updateUI(true);
  } else {
    updateUI(false);
  }
  if (data.interval) {
    intervalInput.value = data.interval;
  }
  if (data.goal) {
    goalInput.value = data.goal;
  }
  if (data.progress) {
    progressSelect.value = data.progress;
  }
});

toggleBtn.addEventListener('click', () => {
  chrome.storage.local.get(['isRunning'], (data) => {
    if (data.isRunning) {
      // Stop
      chrome.runtime.sendMessage({ action: "stop" }, (response) => {
        updateUI(false);
      });
    } else {
      // Start
      const interval = parseInt(intervalInput.value) || 10;
      const goal = goalInput.value.trim();
      const progress = progressSelect.value;
      chrome.runtime.sendMessage({ action: "start", interval: interval, goal: goal, progress: progress }, (response) => {
        updateUI(true);
      });
    }
  });
});

const testBtn = document.getElementById('testBtn');



testBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "test" });
});

function updateUI(isRunning) {
  if (isRunning) {
    statusSpan.textContent = "Active";
    statusSpan.style.color = "#10b981";
    toggleBtn.textContent = "Stop Reminders";
    toggleBtn.classList.add('btn-stop');
  } else {
    statusSpan.textContent = "Inactive";
    statusSpan.style.color = "#ef4444";
    toggleBtn.textContent = "Start Reminders";
    toggleBtn.classList.remove('btn-stop');
  }
}
