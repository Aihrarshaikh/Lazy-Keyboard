(function() {
  console.log("Universal Virtual Keyboard content script loaded");
  let activeElement = null;
  let keyboard = null;
  let isManuallyActivated = false;
  let lastRightClickTime = 0;
  let longPressTimer = null;
  let isLongPress = false;
  let isDragging = false;
  let dragStartX, dragStartY;
  let enableRGB = false;
  let enableSound = false;
  let rgbInterval;

  chrome.storage.sync.get(['enableRGB', 'enableSound'], function(result) {
    enableRGB = result.enableRGB || false;
    enableSound = result.enableSound || false;
  });

  function isEditableElement(element) {
    return element.isContentEditable || 
           element.tagName === 'INPUT' || 
           element.tagName === 'TEXTAREA' ||
           element.getAttribute('role') === 'textbox' ||
           element.getAttribute('contenteditable') === 'true' ||
           (element.tagName === 'DIV' && element.getAttribute('tabindex') !== null) ||
           element.classList.contains('CodeMirror-code') ||
           element.classList.contains('ace_editor') ||
           element.classList.contains('monaco-editor') ||
           (element.getAttribute('data-text') !== null);
  }

  function createKeyboard() {
    if (keyboard) return;

    keyboard = document.createElement('div');
    keyboard.id = 'universal-virtual-keyboard-ext';
    keyboard.innerHTML = `
      <div id="keyboard-header"></div>
      <div class="keyboard-content">
        <div class="keyboard-row">
          <button class="key" data-key="1">1</button>
          <button class="key" data-key="2">2</button>
          <button class="key" data-key="3">3</button>
          <button class="key" data-key="4">4</button>
          <button class="key" data-key="5">5</button>
          <button class="key" data-key="6">6</button>
          <button class="key" data-key="7">7</button>
          <button class="key" data-key="8">8</button>
          <button class="key" data-key="9">9</button>
          <button class="key" data-key="0">0</button>
        </div>
        <div class="keyboard-row">
          <button class="key" data-key="q">Q</button>
          <button class="key" data-key="w">W</button>
          <button class="key" data-key="e">E</button>
          <button class="key" data-key="r">R</button>
          <button class="key" data-key="t">T</button>
          <button class="key" data-key="y">Y</button>
          <button class="key" data-key="u">U</button>
          <button class="key" data-key="i">I</button>
          <button class="key" data-key="o">O</button>
          <button class="key" data-key="p">P</button>
        </div>
        <div class="keyboard-row">
          <button class="key" data-key="a">A</button>
          <button class="key" data-key="s">S</button>
          <button class="key" data-key="d">D</button>
          <button class="key" data-key="f">F</button>
          <button class="key" data-key="g">G</button>
          <button class="key" data-key="h">H</button>
          <button class="key" data-key="j">J</button>
          <button class="key" data-key="k">K</button>
          <button class="key" data-key="l">L</button>
        </div>
        <div class="keyboard-row">
          <button class="key" data-key="z">Z</button>
          <button class="key" data-key="x">X</button>
          <button class="key" data-key="c">C</button>
          <button class="key" data-key="v">V</button>
          <button class="key" data-key="b">B</button>
          <button class="key" data-key="n">N</button>
          <button class="key" data-key="m">M</button>
        </div>
        <div class="keyboard-row">
          <button class="key wide" data-key="Backspace">Backspace</button>
          <button class="key widest" data-key=" ">Space</button>
          <button class="key wide" data-key="Enter">Enter</button>
        </div>
      </div>
      <button id="dismiss-keyboard">Dismiss Keyboard</button>
    `;

    document.body.appendChild(keyboard);
    console.log("Keyboard created and added to DOM");

    keyboard.addEventListener('mousedown', handleKeyPress);
    keyboard.addEventListener('mouseup', handleKeyRelease);
    keyboard.addEventListener('mouseleave', handleKeyRelease);

    document.getElementById('dismiss-keyboard').addEventListener('click', hideKeyboard);

    // Add drag functionality
    const header = document.getElementById('keyboard-header');
    header.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);

    if (enableRGB) {
      startRGBEffect();
    }

  }

  function startDragging(e) {
    isDragging = true;
    dragStartX = e.clientX - keyboard.offsetLeft;
    dragStartY = e.clientY - keyboard.offsetTop;
  }

  function drag(e) {
    if (isDragging) {
      keyboard.style.left = (e.clientX - dragStartX) + 'px';
      keyboard.style.top = (e.clientY - dragStartY) + 'px';
    }
  }

  function stopDragging() {
    isDragging = false;
  }

  function handleKeyPress(e) {
    e.preventDefault();
    if (e.target.classList.contains('key') && activeElement) {
      const key = e.target.getAttribute('data-key');
      console.log(`Key pressed: ${key}`);
      
      if (key.length === 1) {
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          insertText(key.toUpperCase());
        }, 500);
      } else {
        insertText(key);
      }

      if (enableSound) {
        playKeySound();
      }
    }
  }

  function handleKeyRelease(e) {
    if (e.target.classList.contains('key') && activeElement) {
      const key = e.target.getAttribute('data-key');
      clearTimeout(longPressTimer);
      
      if (!isLongPress && key.length === 1) {
        insertText(key.toLowerCase());
      }
      
      isLongPress = false;
    }
  }

  function insertText(key) {
    if (!activeElement) return;
  
    if (isTwitterInput(activeElement)) {
      handleTwitterInput(key);
    } else if (activeElement.getAttribute('data-text') !== null || activeElement.getAttribute('contenteditable') === 'true') {
      handleComplexField(key);
    } else if (activeElement.isContentEditable) {
      document.execCommand('insertText', false, key);
    } else if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      handleStandardInput(key);
    }
  
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    activeElement.focus();
  }
  
  function isTwitterInput(element) {
    return element.id === 'tweet-box-home-timeline' || 
           element.className.includes('public-DraftEditor-content') ||
           (element.getAttribute('role') === 'textbox' && element.closest('[data-testid="tweetTextarea_0"]'));
}
  function handleComplexField(key) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    switch(key) {
      case 'Backspace':
        if (range.startOffset === range.endOffset) {
          range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
        }
        range.deleteContents();
        break;
      case 'Enter':
        // Insert a new line at the current position
        const br = document.createElement('br');
        range.insertNode(br);
        range.setStartAfter(br);
        range.setEndAfter(br);
        break;
      default:
        const textNode = document.createTextNode(key);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
    }

    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger a 'change' event
    const changeEvent = new Event('change', { bubbles: true });
    activeElement.dispatchEvent(changeEvent);
  }

  function handleTwitterInput(key) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    switch(key) {
        case 'Backspace':
            if (range.startOffset === range.endOffset && range.startOffset > 0) {
                range.setStart(range.startContainer, range.startOffset - 1);
            }
            range.deleteContents();
            break;
        case 'Enter':
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);

            // Insert an additional <br> if needed to ensure the new line is created
            const extraBr = document.createElement('br');
            range.insertNode(extraBr);

            // Move the range to after the extra <br> to position the cursor correctly
            range.setStartAfter(extraBr);
            range.setEndAfter(extraBr);
            break;
        case ' ':
            const space = document.createTextNode('\u00A0'); // Non-breaking space
            range.deleteContents();
            range.insertNode(space);
            range.setStartAfter(space);
            range.setEndAfter(space);
            break;
        default:
            const textNode = document.createTextNode(key);
            range.deleteContents();
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
    }

    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event for Twitter's character count
    const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: key
    });
    activeElement.dispatchEvent(inputEvent);
}


  function handleStandardInput(key) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const value = activeElement.value;
  
    switch(key) {
      case ' ':
        activeElement.setRangeText(' ', start, end, 'end');
        break;
      case 'Backspace':
        if (start === end && start > 0) {
          activeElement.setRangeText('', start - 1, start, 'end');
        } else {
          activeElement.setRangeText('', start, end, 'end');
        }
        break;
      case 'Enter':
        activeElement.setRangeText('\n', start, end, 'end');
        break;
      default:
        activeElement.setRangeText(key, start, end, 'end');
    }
  
    // Move the cursor to the end of the inserted text
    const newPosition = activeElement.selectionStart;
    activeElement.setSelectionRange(newPosition, newPosition);
  }
    function createKey(key, className = '') {
    return `
      <button class="key ${className}" data-key="${key}">
        <div class="key-background"></div>
        <div class="key-rgb"></div>
        <div class="key-content">${key}</div>
      </button>
    `;
  }

  function startRGBEffect() {
    let hue = 0;
    rgbInterval = setInterval(() => {
      const rgbElements = keyboard.querySelectorAll('.key-rgb');
      rgbElements.forEach((element, index) => {
        const adjustedHue = (hue + index * 10) % 360;
        element.style.backgroundColor = `hsl(${adjustedHue}, 100%, 50%)`;
      });
      hue = (hue + 5) % 360;
    }, 50);
  }

  function stopRGBEffect() {
    clearInterval(rgbInterval);
    const rgbElements = keyboard.querySelectorAll('.key-rgb');
    rgbElements.forEach(element => {
      element.style.backgroundColor = '';
    });
  }   

  function playKeySound() {
    const audio = new Audio(chrome.runtime.getURL('key_press.mp3'));
    audio.play();
  }

  function showKeyboard(target, x, y) {
    activeElement = target || document.activeElement;
    createKeyboard();
    keyboard.style.display = 'block';
    if (x !== undefined && y !== undefined) {
      keyboard.style.left = `${x}px`;
      keyboard.style.top = `${y}px`;
    }
    if (enableRGB) {
      startRGBEffect();
    }
  }

  function hideKeyboard() {
    if (keyboard) {
      keyboard.style.display = 'none';
      isManuallyActivated = false;
      if (enableRGB) {
        stopRGBEffect();
      }
    }
  }

  window.addEventListener('resize', function() {
    if (keyboard && keyboard.style.display === 'block') {
      console.log("Window resized, ensuring keyboard visibility");
      ensureKeyboardVisibility();
    }
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "toggleKeyboard") {
      isManuallyActivated = true;
      showKeyboard();
    }
  });

  document.addEventListener('focus', function(e) {
    if (isEditableElement(e.target)) {
      activeElement = e.target;
      if (isManuallyActivated) {
        showKeyboard(activeElement);
      }
    }
  }, true);

  document.addEventListener('contextmenu', function(e) {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastRightClickTime;
    lastRightClickTime = currentTime;

    if (timeDiff < 300) {
      e.preventDefault();
      const target = e.target;
      if (isEditableElement(target)) {
        isManuallyActivated = true;
        showKeyboard(target, e.clientX, e.clientY);
      }
    }
  });

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (isEditableElement(node)) {
              node.addEventListener('focus', function() {
                activeElement = node;
                if (isManuallyActivated) {
                  showKeyboard(activeElement);
                }
              });
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  function ensureKeyboardVisibility() {
    if (keyboard && keyboard.style.display !== 'none') {
      const rect = keyboard.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        keyboard.style.left = `${window.innerWidth - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        keyboard.style.top = `${window.innerHeight - rect.height}px`;
      }
      if (rect.left < 0) {
        keyboard.style.left = '0px';
      }
      if (rect.top < 0) {
        keyboard.style.top = '0px';
      }
    }
  }

 
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
      if (key === 'enableRGB') {
        enableRGB = storageChange.newValue;
        if (enableRGB && keyboard && keyboard.style.display !== 'none') {
          startRGBEffect();
        } else {
          stopRGBEffect();
        }
      } else if (key === 'enableSound') {
        enableSound = storageChange.newValue;
      }
    }
  });
 
  setInterval(ensureKeyboardVisibility, 1000);

 


  console.log("Universal Virtual Keyboard content script setup complete");
})();