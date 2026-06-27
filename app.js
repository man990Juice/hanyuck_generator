// Application State
const state = {
  conversationText: '',
  parsedBlocks: [],
  characters: [],
  pageBgColor: '#f5f5f5',
  profileShape: 'circle', // 'circle' or 'square'
  profileBorder: false, // true or false
  introNarrative: '', // Intro manual narrative
  outroNarrative: '', // Outro manual narrative
  cardTheme: 'light', // 'light', 'dim', 'dark'
  activeTab: 'preview', // 'preview' or 'code'
  showHandle: false,
  loadedFileName: null
};

function saveState() {
  localStorage.setItem('HanYuck_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('HanYuck_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
      return true;
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return false;
}

// Pastel/Vivid Color Palette for auto-assigning colors
const COLOR_PALETTE = [
  '#1d9bf0', // Twitter Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#ec4899', // Pink
  '#8b5cf6', // Violet Purple
  '#ef4444', // Crimson Red
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7'  // Purple
];
let colorIndex = 0;

function getNextColor() {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  colorIndex++;
  return color;
}

// Default Demo Conversation (used on initial load)
const demoText = `홍길동 (@H0ngRoad) [2024-05-15 오후 12:10]
오늘 점심 뭐 먹을까? 날씨도 좋은데 나가서 먹자.

---

세바스찬 (@Sebastian9) [2024-05-15 오후 12:12]
(시계를 보며) 좋아요, 도련님. 근처에 새로 생긴 이탈리안 레스토랑이 평판이 좋습니다만, 어떠신가요?

---

홍길동 (@H0ngRoad) [2024-05-15 오후 12:15]
(고개를 갸웃거리며) 음... 오늘은 파스타 말고 좀 매콤한 게 당기는데. 마라탕 어때?

---

세바스찬 (@Sebastian9) [2024-05-15 오후 12:18]
(조용히 한숨을 쉬고는) ...알겠습니다. 마라탕 맛집으로 모시겠습니다. 위장약은 제가 미리 챙기죠.`;

const demoCharacters = [
  {
    name: '홍길동',
    handle: '@H0ngRoad',
    color: '#1d9bf0',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
  },
  {
    name: '세바스찬',
    handle: '@Sebastian9',
    color: '#10b981',
    image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop'
  }
];

// Initialize UI and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  const hasSavedState = loadState();

  setupTabs();
  setupDragAndDrop();
  setupSettingsListeners();
  setupActionButtons();
  setupFormattingButtons();

  if (!hasSavedState) {
    // Load Demo Data
    state.conversationText = demoText;
    state.characters = [...demoCharacters];
    state.parsedBlocks = parseBlocks(demoText);
    showToast('데모 대화록이 로드되었습니다.', 'success');
  } else {
    // Sync the inputs with loaded state
    document.getElementById('page-bg-color').value = state.pageBgColor;
    document.getElementById('page-bg-color-text').value = state.pageBgColor;
    document.getElementById('profile-shape').value = state.profileShape;
    document.getElementById('profile-border').checked = state.profileBorder;
    document.getElementById('show-handle').checked = state.showHandle;
    document.getElementById('intro-narrative').value = state.introNarrative || '';
    document.getElementById('outro-narrative').value = state.outroNarrative || '';

    if (state.activeTab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const activeTabEl = document.querySelector(`.tab[data-tab="${state.activeTab}"]`);
      if (activeTabEl) activeTabEl.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const activeContentEl = document.getElementById(`tab-content-${state.activeTab}`);
      if (activeContentEl) activeContentEl.classList.add('active');
    }

    if (state.loadedFileName) {
      const infoContainer = document.getElementById('loaded-txt-info');
      infoContainer.style.display = 'block';
      document.getElementById('txt-file-name').textContent = state.loadedFileName;
      document.getElementById('txt-file-size').textContent = '(저장됨)';
      const dropzoneText = document.querySelector('#txt-dropzone .dropzone-text');
      if (dropzoneText) dropzoneText.textContent = `로드된 파일: ${state.loadedFileName} (클릭하여 변경)`;
    }

    showToast('저장된 작업 내역을 불러왔습니다.', 'success');
  }

  renderCharacterList();
  updatePreview();
});

// Setup Tab Navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tabName = tab.getAttribute('data-tab');
      state.activeTab = tabName;
      saveState();

      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-content-${tabName}`).classList.add('active');

      if (tabName === 'code') {
        // Refresh code viewer text
        const codeTextarea = document.getElementById('code-textarea');
        codeTextarea.value = generateCopiedHtml();
      }
    });
  });
}

// Drag and Drop Text file loading
function setupDragAndDrop() {
  const dropzone = document.getElementById('txt-dropzone');
  const fileInput = document.getElementById('txt-file-input');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleTxtFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleTxtFile(e.target.files[0]);
    }
  });
}

// Setup Page Settings & config import dropzone
function setupSettingsListeners() {
  const bgColorPicker = document.getElementById('page-bg-color');
  const bgColorText = document.getElementById('page-bg-color-text');
  const addCharBtn = document.getElementById('btn-add-char');

  // Page background sync
  bgColorPicker.addEventListener('input', (e) => {
    state.pageBgColor = e.target.value;
    bgColorText.value = e.target.value;
    updatePreview();
  });

  bgColorText.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      state.pageBgColor = e.target.value;
      bgColorPicker.value = e.target.value;
      updatePreview();
    }
  });

  // Background Preset Color Chips
  const colorChips = document.querySelectorAll('.color-chip');
  colorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selectedColor = chip.getAttribute('data-color');
      state.pageBgColor = selectedColor;
      bgColorPicker.value = selectedColor;
      bgColorText.value = selectedColor;
      updatePreview();
    });
  });

  // Character settings additions
  addCharBtn.addEventListener('click', () => {
    state.characters.push({
      name: `캐릭터 ${state.characters.length + 1}`,
      handle: `@char${state.characters.length + 1}`,
      color: getNextColor(),
      image: ''
    });
    renderCharacterList();
    updatePreview();
  });

  // Config import
  const configDropzone = document.getElementById('config-dropzone');
  const configFile = document.getElementById('config-file-input');

  configDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    configDropzone.classList.add('dragover');
  });
  configDropzone.addEventListener('dragleave', () => {
    configDropzone.classList.remove('dragover');
  });
  configDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    configDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleConfigFile(e.dataTransfer.files[0]);
    }
  });
  configFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleConfigFile(e.target.files[0]);
    }
  });

  // Profile Shape & Border Listeners
  document.getElementById('profile-shape').addEventListener('change', (e) => {
    state.profileShape = e.target.value;
    renderCharacterList();
    updatePreview();
  });

  document.getElementById('profile-border').addEventListener('change', (e) => {
    state.profileBorder = e.target.checked;
    renderCharacterList();
    updatePreview();
  });

  document.getElementById('show-handle').addEventListener('change', (e) => {
    state.showHandle = e.target.checked;
    updatePreview();
  });

  // Intro & Outro Narrative Listeners
  document.getElementById('intro-narrative').addEventListener('input', (e) => {
    state.introNarrative = e.target.value;
    updatePreview();
  });

  document.getElementById('outro-narrative').addEventListener('input', (e) => {
    state.outroNarrative = e.target.value;
    updatePreview();
  });
}

// Buttons at the top right
function setupActionButtons() {
  document.getElementById('btn-copy-html').addEventListener('click', copyCode);
  document.getElementById('btn-save-html').addEventListener('click', saveHtmlFile);
  document.getElementById('btn-export-config').addEventListener('click', exportConfig);
}

// Setup formatting toolbar buttons (Bold/Italic)
function setupFormattingButtons() {
  const formatButtons = document.querySelectorAll('.format-btn');
  formatButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const formatType = btn.getAttribute('data-format');
      const textarea = document.getElementById(targetId);

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selectedText = text.substring(start, end);

      let wrappedText = '';
      let cursorOffset = 0;

      if (formatType === 'bold') {
        wrappedText = `**${selectedText}**`;
        cursorOffset = selectedText ? wrappedText.length : 2;
      } else if (formatType === 'italic') {
        wrappedText = `*${selectedText}*`;
        cursorOffset = selectedText ? wrappedText.length : 1;
      }

      textarea.value = text.substring(0, start) + wrappedText + text.substring(end);
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);

      // Update state and refresh preview
      if (targetId === 'intro-narrative') {
        state.introNarrative = textarea.value;
      } else if (targetId === 'outro-narrative') {
        state.outroNarrative = textarea.value;
      }
      updatePreview();
    });
  });
}

// Core parsing logic
function parseBlocks(text) {
  const normalizedText = text.replace(/\r\n/g, '\n');
  const rawBlocks = normalizedText.split(/\n\s*---\s*(?:\n|$)/);
  const blocks = [];

  for (let rawBlock of rawBlocks) {
    rawBlock = rawBlock.trim();
    if (!rawBlock) continue;

    const lines = rawBlock.split('\n');
    let timestamp = "";
    let handle = "";
    let name = "";
    let content = "";

    if (lines.length > 1) {
      const headerLine = lines[0].trim();
      content = lines.slice(1).join('\n').trim();

      name = headerLine;
      // Extract timestamp in [ ... ]
      const tsMatch = headerLine.match(/\[([^\]]+)\]/);
      if (tsMatch) {
        timestamp = tsMatch[1].trim();
        name = name.replace(tsMatch[0], "").trim();
      }

      // Extract handle in ( ... )
      const handleMatch = headerLine.match(/\((@?[^\)]+)\)/);
      if (handleMatch) {
        handle = handleMatch[1].trim();
        name = name.replace(handleMatch[0], "").trim();
      }
      name = name.trim();
    } else {
      // Single line block
      const line = lines[0].trim();
      // Check if it looks like a header (e.g. contains brackets/parentheses)
      const hasTs = line.includes('[') && line.includes(']');
      const hasHandle = line.includes('(') && line.includes(')');

      if (hasTs || hasHandle) {
        name = line;
        const tsMatch = line.match(/\[([^\]]+)\]/);
        if (tsMatch) {
          timestamp = tsMatch[1].trim();
          name = name.replace(tsMatch[0], "").trim();
        }
        const handleMatch = line.match(/\((@?[^\)]+)\)/);
        if (handleMatch) {
          handle = handleMatch[1].trim();
          name = name.replace(handleMatch[0], "").trim();
        }
        name = name.trim();
        content = "";
      } else {
        // Render as a notification or system line
        name = "알림";
        content = line;
      }
    }

    blocks.push({
      name: name || "Unknown",
      handle: handle || "",
      timestamp: timestamp || "",
      content: content
    });
  }
  return blocks;
}

// Handle imported TXT file containing conversation
function handleTxtFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    state.conversationText = text;
    state.parsedBlocks = parseBlocks(text);
    state.loadedFileName = file.name;

    // Auto-detect new characters
    autoDetectCharacters();

    // Update File UI
    const infoContainer = document.getElementById('loaded-txt-info');
    infoContainer.style.display = 'block';
    document.getElementById('txt-file-name').textContent = file.name;
    document.getElementById('txt-file-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    const dropzoneText = document.querySelector('#txt-dropzone .dropzone-text');
    if (dropzoneText) dropzoneText.textContent = `로드된 파일: ${file.name} (클릭하여 변경)`;

    renderCharacterList();
    updatePreview();
    showToast('대화 파일이 업로드되고 파싱되었습니다.', 'success');
  };
  reader.readAsText(file);
}

// Auto detect unique character names and add them
function autoDetectCharacters() {
  const uniqueNames = new Set();
  state.parsedBlocks.forEach(b => {
    if (b.name && b.name !== "알림" && b.name !== "Unknown") {
      uniqueNames.add(b.name);
    }
  });

  let addedCount = 0;
  uniqueNames.forEach(name => {
    // Check if exists
    const exists = state.characters.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      // Find sample handle from blocks for this character
      const blockWithHandle = state.parsedBlocks.find(b => b.name === name && b.handle);
      const handle = blockWithHandle ? blockWithHandle.handle : `@${name.replace(/\s+/g, '_')}`;

      state.characters.push({
        name: name,
        handle: handle,
        color: getNextColor(),
        image: ''
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    showToast(`${addedCount}명의 새 캐릭터가 자동 감지되었습니다.`, 'success');
  }
}

// Redraw characters panel
function renderCharacterList() {
  const container = document.getElementById('character-list-container');
  container.innerHTML = '';

  if (state.characters.length === 0) {
    container.innerHTML = '<p style="font-size: 12px; color: var(--text-dark); text-align: center;">등록된 캐릭터가 없습니다. "+ 추가" 버튼이나 TXT 파일을 로드하여 캐릭터를 생성하세요.</p>';
    return;
  }

  state.characters.forEach((char, index) => {
    const card = document.createElement('div');
    card.className = 'character-card';

    // First letter of the name as initials placeholder
    const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';
    const avatarHtml = char.image
      ? `<img src="${char.image}" class="pfp-preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
         <div class="pfp-placeholder" style="display:none; background-color: ${char.color}; color: #ffffff">${initial}</div>`
      : `<div class="pfp-placeholder" style="background-color: ${char.color}; color: #ffffff">${initial}</div>`;

    const shapeRadius = state.profileShape === 'square' ? '5px' : '50%';
    const borderStyle = state.profileBorder
      ? `border: 2px solid ${char.color};`
      : `border: 2px solid var(--border-color);`;

    card.innerHTML = `
      <div class="character-card-header">
        <span class="character-card-title">캐릭터 #${index + 1}</span>
        <button class="btn-remove-char" title="삭제" onclick="removeCharacter(${index})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
      <div class="char-grid">
        <div class="pfp-preview-container" id="pfp-preview-${index}" style="border-radius: ${shapeRadius}; ${borderStyle}">
          ${avatarHtml}
        </div>
        <div class="char-inputs">
          <div class="input-row">
            <div class="form-group">
              <label>이름 (식별용)</label>
              <input type="text" class="char-name-input" data-index="${index}" value="${char.name}">
            </div>
            <div class="form-group" style="max-width: 90px;">
              <label>고유 색상</label>
              <div class="color-input-wrapper">
                <input type="color" class="char-color-input" data-index="${index}" value="${char.color}">
              </div>
            </div>
          </div>
          <div class="input-row">
            <div class="form-group">
              <label>프로필 사진 이미지 주소 (외부 링크)</label>
              <input type="text" class="char-image-input" data-index="${index}" value="${char.image}" placeholder="https://example.com/photo.png">
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach input listeners
  const names = container.querySelectorAll('.char-name-input');
  names.forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      state.characters[idx].name = e.target.value;

      // Update pfp placeholder letter
      const placeholder = container.querySelector(`#pfp-preview-${idx} .pfp-placeholder`);
      if (placeholder) {
        placeholder.textContent = e.target.value ? e.target.value.charAt(0).toUpperCase() : '?';
      }

      updatePreview();
    });
  });

  const colors = container.querySelectorAll('.char-color-input');
  colors.forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      state.characters[idx].color = e.target.value;

      // Update placeholder background color
      const placeholder = container.querySelector(`#pfp-preview-${idx} .pfp-placeholder`);
      if (placeholder) {
        placeholder.style.backgroundColor = e.target.value;
      }

      updatePreview();
    });
  });



  const images = container.querySelectorAll('.char-image-input');
  images.forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      state.characters[idx].image = e.target.value;

      // Update live profile picture preview inside settings list card
      const pfpContainer = document.getElementById(`pfp-preview-${idx}`);
      const initial = state.characters[idx].name ? state.characters[idx].name.charAt(0).toUpperCase() : '?';
      if (e.target.value) {
        pfpContainer.innerHTML = `
          <img src="${e.target.value}" class="pfp-preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
          <div class="pfp-placeholder" style="display:none; background-color: ${state.characters[idx].color}; color: #ffffff">${initial}</div>
        `;
      } else {
        pfpContainer.innerHTML = `
          <div class="pfp-placeholder" style="background-color: ${state.characters[idx].color}; color: #ffffff">${initial}</div>
        `;
      }

      updatePreview();
    });
  });
}

// Remove character
window.removeCharacter = function (index) {
  state.characters.splice(index, 1);
  renderCharacterList();
  updatePreview();
  showToast('캐릭터가 삭제되었습니다.', 'danger');
};

// Handle config file import (TXT file)
function handleConfigFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const imported = parseConfigTxt(text);

    if (imported.length > 0) {
      state.characters = imported;
      renderCharacterList();
      updatePreview();
      showToast(`캐릭터 설정 ${imported.length}개를 불러왔습니다.`, 'success');
    } else {
      showToast('올바른 캐릭터 설정 형식의 파일이 아닙니다.', 'danger');
    }
  };
  reader.readAsText(file);
}

// Parser for the config txt format
function parseConfigTxt(text) {
  const characters = [];
  const normalizedText = text.replace(/\r\n/g, '\n');
  const blocks = normalizedText.split(/\n\s*\n+/);

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    const lines = block.split('\n');
    const char = { name: '', handle: '', image: '', color: '#1d9bf0' };

    for (let line of lines) {
      const parts = line.split(':');
      if (parts.length < 2) continue;

      const key = parts[0].trim().toLowerCase();
      const val = parts.slice(1).join(':').trim();

      if (key === '이름' || key === 'name') {
        char.name = val;
      } else if (key === '핸들' || key === 'handle') {
        char.handle = val.startsWith('@') ? val : '@' + val;
      } else if (key === '프로필' || key === '사진' || key === '이미지' || key === 'image' || key === 'link' || key === '링크') {
        char.image = val;
      } else if (key === '색상' || key === '컬러' || key === '색' || key === 'color') {
        char.color = val;
      }
    }

    if (char.name) {
      characters.push(char);
    }
  }
  return characters;
}

// Export config file as TXT
function exportConfig() {
  if (state.characters.length === 0) {
    showToast('내보낼 캐릭터 설정이 없습니다.', 'danger');
    return;
  }

  const textContent = state.characters.map(c => {
    return `이름: ${c.name}\n핸들: ${c.handle || ''}\n프로필: ${c.image || ''}\n색상: ${c.color || '#1d9bf0'}`;
  }).join('\n\n');

  triggerDownload(textContent, 'character_settings.txt', 'text/plain');
  showToast('캐릭터 설정 TXT 파일이 내보내졌습니다.', 'success');
}

// Generate the fully compiled HTML contents
function generateHtml() {
  const bg = state.pageBgColor;
  const contrast = getContrastColor(bg);

  // Render thread items
  const threadItemsHtml = state.parsedBlocks.map((block, idx) => {
    if (block.name === "알림") {
      return `
      <!-- System Notification -->
      <div class="system-message">
        <div class="system-text">${parseMarkdown(block.content)}</div>
      </div>
      `;
    }

    // Match character settings
    const char = state.characters.find(c => c.name.toLowerCase() === block.name.toLowerCase()) || {
      name: block.name,
      handle: block.handle || `@${block.name.replace(/\s+/g, '_')}`,
      color: '#8b98a5', // default grey
      image: ''
    };

    const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';
    const avatarHtml = char.image
      ? `<img src="${char.image}" class="avatar-img" alt="${escapeHtml(char.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><div class="avatar-placeholder" style="display:none; background-color:${char.color};">${initial}</div>`
      : `<div class="avatar-placeholder" style="background-color:${char.color};">${initial}</div>`;

    // Check if next message is also a tweet, to draw thread connector line
    let showConnector = false;
    if (idx < state.parsedBlocks.length - 1) {
      const nextBlock = state.parsedBlocks[idx + 1];
      if (nextBlock.name !== "알림") {
        showConnector = true;
      }
    }

    const connectorStyle = showConnector ? '' : 'style="display:none;"';
    const displayTime = formatDateString(block.timestamp);
    const handleHtml = state.showHandle ? `<span class="tweet-handle">${escapeHtml(char.handle)}</span>` : '';
    const dotHtml = (state.showHandle && displayTime) ? `<span class="tweet-dot">·</span>` : '';
    const timeHtml = displayTime ? `<span class="tweet-time">${escapeHtml(displayTime)}</span>` : '';

    return `
      <!-- Tweet Block -->
      <div class="tweet" style="--char-color: ${char.color};">
        <div class="tweet-left">
          <div class="avatar-container">
            ${avatarHtml}
          </div>
          <div class="tweet-connector" ${connectorStyle}></div>
        </div>
        <div class="tweet-right">
          <div class="tweet-header">
            <span class="tweet-name">${escapeHtml(char.name)}</span>
            <div class="tweet-header-right">
              ${handleHtml}
              ${dotHtml}
              ${timeHtml}
            </div>
          </div>
          <div class="tweet-content">${escapeHtml(block.content).replace(/\n/g, '<br>')}</div>
        </div>
      </div>
    `;
  }).join('');

  const introHtml = `
    <!-- Intro Narrative -->
    <div class="system-message">
      <div class="system-text">${parseMarkdown(state.introNarrative) || '&nbsp;'}</div>
    </div>
  `;

  const outroHtml = `
    <!-- Outro Narrative -->
    <div class="system-message">
      <div class="system-text">${parseMarkdown(state.outroNarrative) || '&nbsp;'}</div>
    </div>
  `;

  const fullThreadHtml = introHtml + threadItemsHtml + outroHtml;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HanYuck Thread Conversation</title>
  <style>
    :root {
      --bg-page: #777780ff;
      --bg-card: ${bg};
      --text-main: ${contrast.text};
      --text-muted: ${contrast.muted};
      --border-light: ${contrast.border};
      --bg-system: ${contrast.system};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-main);
      margin: 0px;
      padding: 0;
    }

    .HanYuck-wrapper {
      padding: 2.5%;
      box-sizing: border-box;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }

    .thread-container {
      width: 100%;
      max-width: 800px;
      background-color: var(--bg-card);
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      border: 1px solid var(--border-light);
      margin: 0;
    }

    /* Tweet Style */
    .tweet {
      display: flex;
      padding: 4%;
      border-bottom: 1px solid var(--border-light);
      position: relative;
    }

    .tweet:last-child {
      border-bottom: none;
    }

    .tweet-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 16px;
      position: relative;
      flex-shrink: 0;
    }

    .avatar-container {
      width: 40px;
      height: 40px;
      border-radius: ${state.profileShape === 'square' ? '5px' : '50%'};
      overflow: hidden;
      background-color: ${contrast.isDark ? '#1e293b' : '#f3f4f6'};
      display: flex;
      align-items: center;
      justify-content: center;
      border: ${state.profileBorder ? '1px solid var(--char-color)' : '1px solid var(--border-light)'};
      z-index: 2;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }

    .avatar-placeholder {
      font-weight: 700;
      font-size: 15px;
      color: #ffffff;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
    }

    .tweet-connector {
      display: none;
    }

    .tweet-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .tweet-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 5px;
      width: 100%;
    }

    .tweet-name {
      font-weight: 800;
      color: var(--text-main);
      font-size: 14px;
    }

    .tweet-header-right {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #b4b7b9ff;
      position: relative;
      top: -12px;
      right: -5px;
    }

    .tweet-content {
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-main);
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* System notification style */
    .system-message {
      padding: 3% 5%;
      display: flex;
      justify-content: center;
      align-items: center;
      border-bottom: 1px solid var(--border-light);
      background-color: var(--bg-system);
    }

    .system-text {
      font-size: 13px;
      color: var(--text-muted);
      text-align: center;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="HanYuck-wrapper">
    <div class="thread-container">
      ${fullThreadHtml}
    </div>
  </div>
</body>
</html>`;
}

// Generate copied HTML code (Only stylesheet and thread-container component, excluding full webpage tags and page background)
function generateCopiedHtml() {
  const bg = state.pageBgColor;
  const contrast = getContrastColor(bg);

  // Render thread items
  const threadItemsHtml = state.parsedBlocks.map((block, idx) => {
    if (block.name === "알림") {
      return `
      <!-- System Notification -->
      <div class="system-message">
        <div class="system-text">${parseMarkdown(block.content)}</div>
      </div>
      `;
    }

    const char = state.characters.find(c => c.name.toLowerCase() === block.name.toLowerCase()) || {
      name: block.name,
      handle: block.handle || `@${block.name.replace(/\s+/g, '_')}`,
      color: '#8b98a5',
      image: ''
    };

    const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';
    const avatarHtml = char.image
      ? `<img src="${char.image}" class="avatar-img" alt="${escapeHtml(char.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><div class="avatar-placeholder" style="display:none; background-color:${char.color};">${initial}</div>`
      : `<div class="avatar-placeholder" style="background-color:${char.color};">${initial}</div>`;

    let showConnector = false;
    if (idx < state.parsedBlocks.length - 1) {
      const nextBlock = state.parsedBlocks[idx + 1];
      if (nextBlock.name !== "알림") {
        showConnector = true;
      }
    }

    const connectorStyle = showConnector ? '' : 'style="display:none;"';
    const displayTime = formatDateString(block.timestamp);
    const handleHtml = state.showHandle ? `<span class="tweet-handle">${escapeHtml(char.handle)}</span>` : '';
    const dotHtml = (state.showHandle && displayTime) ? `<span class="tweet-dot">·</span>` : '';
    const timeHtml = displayTime ? `<span class="tweet-time">${escapeHtml(displayTime)}</span>` : '';

    return `
      <!-- Tweet Block -->
      <div class="tweet" style="--char-color: ${char.color};">
        <div class="tweet-left">
          <div class="avatar-container">
            ${avatarHtml}
          </div>
          <div class="tweet-connector" ${connectorStyle}></div>
        </div>
        <div class="tweet-right">
          <div class="tweet-header">
            <span class="tweet-name">${escapeHtml(char.name)}</span>
            <div class="tweet-header-right">
              ${handleHtml}
              ${dotHtml}
              ${timeHtml}
            </div>
          </div>
          <div class="tweet-content">${escapeHtml(block.content).replace(/\n/g, '<br>')}</div>
        </div>
      </div>
    `;
  }).join('');

  const introHtml = `
    <!-- Intro Narrative -->
    <div class="system-message">
      <div class="system-text">${parseMarkdown(state.introNarrative) || '&nbsp;'}</div>
    </div>
  `;

  const outroHtml = `
    <!-- Outro Narrative -->
    <div class="system-message">
      <div class="system-text">${parseMarkdown(state.outroNarrative) || '&nbsp;'}</div>
    </div>
  `;

  const fullThreadHtml = introHtml + threadItemsHtml + outroHtml;

  return `<style>
  .HanYuck-wrapper {
    padding: 2.5%;
    box-sizing: border-box;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .thread-container {
    width: 100%;
    max-width: 800px;
    background-color: ${bg};
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    border: 1px solid ${contrast.border};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
  }

  /* Tweet Style */
  .tweet {
    display: flex;
    padding: 4%;
    border-bottom: 1px solid ${contrast.border};
    position: relative;
  }

  .tweet:last-child {
    border-bottom: none;
  }

  .tweet-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 16px;
    position: relative;
    flex-shrink: 0;
  }

  .avatar-container {
    width: 40px;
    height: 40px;
    border-radius: ${state.profileShape === 'square' ? '5px' : '50%'};
    overflow: hidden;
    background-color: ${contrast.isDark ? '#1e293b' : '#f3f4f6'};
    display: flex;
    align-items: center;
    justify-content: center;
    border: ${state.profileBorder ? '2px solid var(--char-color)' : `1px solid ${contrast.border}`};
    z-index: 2;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .avatar-placeholder {
    font-weight: 700;
    font-size: 15px;
    color: #ffffff;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
  }

  .tweet-connector {
    display: none;
  }

  .tweet-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .tweet-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 5px;
    width: 100%;
  }

  .tweet-name {
    font-weight: 800;
    color: ${contrast.text};
    font-size: 14px;
  }

  .tweet-header-right {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #71767b;
    position: relative;
    top: -12px;
    right: -5px;
  }

  .tweet-content {
    font-size: 14px;
    line-height: 1.5;
    color: ${contrast.text};
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* System notification style */
  .system-message {
    padding: 3% 5%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid ${contrast.border};
    background-color: ${contrast.system};
  }

  .system-text {
    font-size: 13px;
    color: ${contrast.muted};
    text-align: center;
    font-style: italic;
  }
</style>
<div class="HanYuck-wrapper">
  <div class="thread-container">
    ${fullThreadHtml}
  </div>
</div>`;
}

// Update the live iframe preview & code textarea
function updatePreview() {
  const html = generateHtml();

  // Set iframe source
  const iframe = document.getElementById('preview-iframe');
  if (iframe) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }

  // Update raw HTML view if active tab is code
  if (state.activeTab === 'code') {
    document.getElementById('code-textarea').value = generateCopiedHtml();
  }

  saveState();
}

// Copy raw html content to clipboard
function copyCode() {
  const componentHtml = generateCopiedHtml();
  navigator.clipboard.writeText(componentHtml).then(() => {
    showToast('대화창 코드(배경색 제외 body 부분)가 복사되었습니다.', 'success');
  }).catch(err => {
    console.error('Copy failed:', err);
    showToast('코드 복사에 실패했습니다.', 'danger');
  });
}

// Download HTML file to browser
function saveHtmlFile() {
  const html = generateHtml();
  // Safe filename
  let filename = 'HanYuck.html';
  
  if (state.loadedFileName) {
    const lastDot = state.loadedFileName.lastIndexOf('.');
    if (lastDot !== -1) {
      filename = state.loadedFileName.substring(0, lastDot) + '.html';
    } else {
      filename = state.loadedFileName + '.html';
    }
  }

  // Add UTF-8 BOM
  const BOM = '\uFEFF';
  triggerDownload(BOM + html, filename, 'text/html;charset=UTF-8');
  showToast('HTML 파일이 저장되었습니다.', 'success');
}

// Helper to trigger browser downloads
function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Toast Alert System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '✓';
  if (type === 'danger') icon = '✕';
  else if (type === 'info') icon = 'ℹ';

  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// HTML escape helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Date format helper: YYYY-MM-DD 오후/오전 hh:mm -> YY.MM.DD am/pm hh:mm
function formatDateString(str) {
  if (!str) return '';
  const match = str.match(/(\d{4})[./-](\d{2})[./-](\d{2})\s+(오후|오전)\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const yy = match[1].slice(-2);
    const mm = match[2];
    const dd = match[3];
    const ampm = match[4] === '오후' ? 'pm' : 'am';
    const hh = match[5].padStart(2, '0');
    const min = match[6];
    return `${yy}.${mm}.${dd} ${ampm} ${hh}:${min}`;
  }
  return str;
}

// Markdown parser: bolds **text** and italicizes *text*
function parseMarkdown(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

// Contrast and theme adaptation helpers for dynamic background colors
function getContrastColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { text: '#0f1419', border: 'rgba(0, 0, 0, 0.08)', system: 'rgba(0, 0, 0, 0.02)', muted: '#536471' };
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  if (brightness < 128) {
    // Dark background
    return {
      text: '#ffffff',
      border: 'rgba(255, 255, 255, 0.1)',
      system: 'rgba(255, 255, 255, 0.05)',
      muted: '#8899a6',
      isDark: true
    };
  } else {
    // Light background
    return {
      text: '#0f1419',
      border: 'rgba(0, 0, 0, 0.08)',
      system: 'rgba(0, 0, 0, 0.02)',
      muted: '#536471',
      isDark: false
    };
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
