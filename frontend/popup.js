document.getElementById("checkBtn").addEventListener("click", () => {
  chrome.scripting.executeScript({
    target: { tabId: chrome.tabs.TAB_ID }, // insert correct tab ID
    files: ["content.js"]
  });
});
