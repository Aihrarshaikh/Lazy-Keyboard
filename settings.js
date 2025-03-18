document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(['enableRGB', 'enableSound'], function(result) {
        document.getElementById('enableRGB').checked = result.enableRGB || false;
        document.getElementById('enableSound').checked = result.enableSound || false;
    });

    // Save settings
    document.getElementById('save').addEventListener('click', function() {
        let enableRGB = document.getElementById('enableRGB').checked;
        let enableSound = document.getElementById('enableSound').checked;

        chrome.storage.sync.set({
            enableRGB: enableRGB,
            enableSound: enableSound
        }, function() {
            alert('Settings saved!');
        });
    });
});