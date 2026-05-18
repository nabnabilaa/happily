window.addEventListener("message", (event) => {
  // We only accept messages from the same window
  if (event.source !== window) return;

  if (event.data.type && (event.data.type === "FLOWBEE_SET_FOCUS")) {
    console.log("Bee Flow Extension received focus task:", event.data.goal);
    chrome.runtime.sendMessage({
      action: "start",
      interval: 10, // Default 10 minutes interval
      goal: event.data.goal,
      progress: event.data.progress
    });
  }
});
