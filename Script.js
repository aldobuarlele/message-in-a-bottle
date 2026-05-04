// === Ambil konfigurasi dari SATU sumber kebenaran ===
// CONFIG didefinisikan di config.js (loaded sebelum script ini)
const MIN_WORDS = CONFIG.MIN_WORD_COUNT;

// === DOM Elements ===
const readingState = document.getElementById('reading-state');
const writeModal = document.getElementById('write-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalCard = document.getElementById('modal-card');
const messageDisplay = document.getElementById('message-display');
const messageDisplayWrapper = document.getElementById('message-display-wrapper');
const loadingText = document.getElementById('loading-text');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorText = document.getElementById('error-text');
const findBtn = document.getElementById('find-btn');
const writeBtn = document.getElementById('write-btn');
const cancelBtn = document.getElementById('cancel-btn');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const throwBtn = document.getElementById('throw-btn');
const wordCounter = document.getElementById('word-counter');
const successNotification = document.getElementById('success-notification');

// === FOCUS TRACKING ===
// Menyimpan elemen yang terakhir di-fokus sebelum modal terbuka
// agar fokus bisa dikembalikan saat modal ditutup (a11y penting!)
let lastFocusedElement = null;

// === FOCUS TRAP untuk modal ===
// Daftar elemen focusable di dalam modal
function getModalFocusableElements() {
  const modal = writeModal;
  if (modal.classList.contains('hidden')) return [];

  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return Array.from(modal.querySelectorAll(selectors))
    .filter(el => {
      // Filter elemen yang hidden
      if (el.classList.contains('hidden')) return false;
      // Filter yang tidak visible
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
}

function handleModalTabKey(e) {
  if (!writeModal.classList.contains('hidden')) {
    const focusable = getModalFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift+Tab: jika fokus di elemen pertama, pindah ke terakhir
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: jika fokus di elemen terakhir, pindah ke pertama
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }
}

// === Utility Functions ===

function hideAllMessageStates() {
  loadingText.classList.add('hidden');
  messageDisplayWrapper.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
}

function showLoading() {
  hideAllMessageStates();
  loadingText.classList.remove('hidden');
}

function showMessage(text) {
  hideAllMessageStates();

  messageDisplay.innerHTML = '';

  const formattedFragment = renderFormattedText(text);
  messageDisplay.appendChild(formattedFragment);

  messageDisplayWrapper.classList.remove('hidden');
}

function showEmpty() {
  hideAllMessageStates();
  emptyState.classList.remove('hidden');
}

function showError(text) {
  hideAllMessageStates();
  errorText.textContent = text;
  errorState.classList.remove('hidden');
}

// === WORD COUNT ===
function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

// === SAFE MARKDOWN PARSER (DOM API only — NO innerHTML) ===
function renderFormattedText(text) {
  const fragment = document.createDocumentFragment();

  const parts = text.split(/(\*\*[\s\S]*?\*\*|~~[\s\S]*?~~|\|\|[\s\S]*?\|\|)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      const strong = document.createElement('strong');
      strong.appendChild(document.createTextNode(inner));
      fragment.appendChild(strong);

    } else if (part.startsWith('~~') && part.endsWith('~~')) {
      const inner = part.slice(2, -2);
      const strike = document.createElement('s');
      strike.appendChild(document.createTextNode(inner));
      fragment.appendChild(strike);

    } else if (part.startsWith('||') && part.endsWith('||')) {
      const inner = part.slice(2, -2);
      const spoiler = document.createElement('span');
      spoiler.className = 'spoiler';
      spoiler.setAttribute('tabindex', '0');
      spoiler.appendChild(document.createTextNode(inner));

      spoiler.addEventListener('click', function (e) {
        this.classList.toggle('revealed');
        e.stopPropagation();
      });

      fragment.appendChild(spoiler);

    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }

  return fragment;
}

// === UPDATE WORD COUNTER & BUTTON STATE ===
function updateWordCounter() {
  const wordCount = countWords(messageInput.value);
  const isMet = wordCount >= MIN_WORDS;

  wordCounter.textContent = wordCount + ' / ' + MIN_WORDS + ' kata';

  if (isMet) {
    wordCounter.className = 'text-emerald-400/80 text-sm font-light tracking-wide';
  } else if (wordCount >= MIN_WORDS * 0.8) {
    wordCounter.className = 'text-amber-400/80 text-sm font-light tracking-wide';
  } else {
    wordCounter.className = 'text-white/40 text-sm font-light tracking-wide';
  }

  // Enable/disable tombol submit + update aria-disabled
  throwBtn.disabled = !isMet;
  throwBtn.setAttribute('aria-disabled', isMet ? 'false' : 'true');
}

// === TOOLBAR FORMATTING HELPERS ===
function insertFormatting(openTag, closeTag) {
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const selected = messageInput.value.substring(start, end);
  const replacement = selected
    ? openTag + selected + closeTag
    : openTag + closeTag;

  messageInput.setRangeText(replacement, start, end, 'end');

  messageInput.dispatchEvent(new Event('input'));

  messageInput.focus();

  if (!selected) {
    const cursorPos = start + openTag.length;
    messageInput.setSelectionRange(cursorPos, cursorPos);
  }
}

// === Open Writing Modal ===
function openWriteModal() {
  // Simpan elemen yang sedang fokus
  lastFocusedElement = document.activeElement;

  // Reset form
  messageInput.value = '';
  updateWordCounter();
  successNotification.classList.add('hidden');

  // Tampilkan modal
  writeModal.classList.remove('hidden');

  // Trigger reflow untuk memastikan transisi berjalan
  void modalCard.offsetWidth;

  // Animasi masuk
  modalOverlay.classList.remove('opacity-0');
  modalOverlay.classList.add('opacity-100');
  modalCard.classList.remove('scale-95', 'opacity-0');
  modalCard.classList.add('scale-100', 'opacity-100');

  // Fokus ke textarea setelah animasi selesai
  setTimeout(function () { messageInput.focus(); }, 400);
}

// === Close Writing Modal ===
function closeWriteModal() {
  // Animasi keluar
  modalCard.classList.remove('scale-100', 'opacity-100');
  modalCard.classList.add('scale-95', 'opacity-0');
  modalOverlay.classList.remove('opacity-100');
  modalOverlay.classList.add('opacity-0');

  // Sembunyikan setelah transisi selesai
  setTimeout(function () {
    writeModal.classList.add('hidden');

    // Kembalikan fokus ke elemen yang terakhir difokus
    // (a11y: jangan biarkan fokus hilang ke <body>)
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }, 400);
}

// === Event: Word Counter (Real-time) ===
messageInput.addEventListener('input', updateWordCounter);

// === Event: Toolbar Buttons ===
document.querySelectorAll('.toolbar-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const tag = btn.dataset.tag;
    switch (tag) {
      case 'bold':
        insertFormatting('**', '**');
        break;
      case 'strike':
        insertFormatting('~~', '~~');
        break;
      case 'sensor':
        insertFormatting('||', '||');
        break;
    }
  });
});

// === Keyboard shortcuts for formatting (Ctrl/Cmd+B) ===
messageInput.addEventListener('keydown', function (e) {
  const isMod = e.ctrlKey || e.metaKey;
  if (isMod && e.key === 'b') {
    e.preventDefault();
    insertFormatting('**', '**');
  }
});

// === Submit Message (POST) ===
messageForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const message = messageInput.value.trim();
  const wordCount = countWords(message);
  if (!message || wordCount < MIN_WORDS) return;

  // Disable tombol selama submit
  throwBtn.disabled = true;
  throwBtn.setAttribute('aria-disabled', 'true');
  throwBtn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span> Melempar...';

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message }),
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
      throwBtn.disabled = false;
      throwBtn.setAttribute('aria-disabled', 'false');
      throwBtn.innerHTML = '<span aria-hidden="true">💧</span> Lempar ke Laut';
    } else {
      successNotification.classList.remove('hidden');

      setTimeout(function () {
        closeWriteModal();
        fetchRandomMessage();
      }, 1500);
    }
  } catch (error) {
    console.error('Submit error:', error);
    alert('Gagal mengirim pesan. Coba lagi.');
    throwBtn.disabled = false;
    throwBtn.setAttribute('aria-disabled', 'false');
    throwBtn.innerHTML = '<span aria-hidden="true">💧</span> Lempar ke Laut';
  }
});

// === Fetch Random Message (GET) ===
async function fetchRandomMessage() {
  showLoading();

  try {
    const response = await fetch('/api/messages');
    const data = await response.json();

    await new Promise(function (r) { setTimeout(r, 400); });

    if (data.error) {
      showError(data.error);
    } else if (data.message === 'Tidak ada pesan dalam botol!' || data.message === '') {
      showEmpty();
    } else {
      showMessage(data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
    await new Promise(function (r) { setTimeout(r, 400); });
    showError('Gagal terhubung ke lautan. Coba lagi nanti.');
  }
}

// === Event: Auto-fetch on Page Load ===
window.addEventListener('load', function () {
  fetchRandomMessage();
});

// === Event: Find Another Message ===
findBtn.addEventListener('click', function () {
  findBtn.classList.add('scale-95');
  setTimeout(function () { findBtn.classList.remove('scale-95'); }, 150);

  fetchRandomMessage();
});

// === Event: Open Write Modal ===
writeBtn.addEventListener('click', function () {
  openWriteModal();
});

// === Event: Cancel / Back ===
cancelBtn.addEventListener('click', function () {
  closeWriteModal();
});

// === Event: Click outside modal to close ===
modalOverlay.addEventListener('click', function () {
  closeWriteModal();
});

// === Keyboard: Escape to close modal ===
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !writeModal.classList.contains('hidden')) {
    closeWriteModal();
  }

  // Focus trap untuk modal
  handleModalTabKey(e);
});
