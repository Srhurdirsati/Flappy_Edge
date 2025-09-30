document.getElementById('startBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('flappy.html') });
});
