chrome.runtime.onInstalled.addListener(function() {
    console.log("Universal Virtual Keyboard extension installed");
  });
  
  chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "toggleKeyboard"});
  });
  
  chrome.contextMenus.create({
    id: "showVirtualKeyboard",
    title: "Show Virtual Keyboard",
    contexts: ["editable"]
  });
  
  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "showVirtualKeyboard") {
      chrome.tabs.sendMessage(tab.id, {action: "toggleKeyboard"});
    }
  });

chrome.runtime.onInstalled.addListener(() => {
    console.log("Lazy Keyboard Extension Installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateSettings") {
        console.log("Settings updated:", message);
    }
});

  