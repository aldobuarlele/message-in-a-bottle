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

// === Utility Functions ===

// Sembunyikan semua state di area pesan
function hideAllMessageStates() {
  loadingText.classList.add('hidden');
  messageDisplayWrapper.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
}

// Tampilkan loading state
function showLoading() {
  hideAllMessageStates();
  loadingText.classList.remove('hidden');
}

// Tampilkan pesan dari API — DENGAN FORMATTING (safe render via DOM API)
function showMessage(text) {
  hideAllMessageStates();

  // Hapus konten sebelumnya
  messageDisplay.innerHTML = '';

  // Parse dan render teks dengan formatting tags (aman, via DOM API)
  const formattedFragment = renderFormattedText(text);
  messageDisplay.appendChild(formattedFragment);

  messageDisplayWrapper.classList.remove('hidden');
}

// Tampilkan empty state
function showEmpty() {
  hideAllMessageStates();
  emptyState.classList.remove('hidden');
}

// Tampilkan error state
function showError(text) {
  hideAllMessageStates();
  errorText.textContent = text;
  errorState.classList.remove('hidden');
}

// === WORD COUNT (sama persis logikanya dengan di Backend) ===
function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

// === SAFE MARKDOWN PARSER (DOM API only — NO innerHTML) ===
// Mendukung format:
//   **teks**  → <strong>
//   ~~teks~~  → <s>
//   ||teks||  → <span class="spoiler">

/**
 * Render teks dengan format markdown ke DocumentFragment.
 * AMAN: hanya menggunakan DOM API (createTextNode, createElement).
 * TIDAK menggunakan innerHTML — 100% aman dari XSS.
 *
 * Catatan: document.createTextNode secara otomatis men-escape
 * karakter HTML (<, >, &), jadi tidak perlu manual escape.
 */
function renderFormattedText(text) {
  const fragment = document.createDocumentFragment();

  // Tokenize: split teks berdasarkan marker, pertahankan marker sebagai token
  // Regex: menangkap **...**, ~~...~~, ||...|| sebagai token utuh
  // Urutan penting: parse ** dan ~~ dan || beserta isinya
  const parts = text.split(/(\*\*[\s\S]*?\*\*|~~[\s\S]*?~~|\|\|[\s\S]*?\|\|)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold
      const inner = part.slice(2, -2);
      const strong = document.createElement('strong');
      strong.appendChild(document.createTextNode(inner));
      fragment.appendChild(strong);

    } else if (part.startsWith('~~') && part.endsWith('~~')) {
      // Strikethrough
      const inner = part.slice(2, -2);
      const strike = document.createElement('s');
      strike.appendChild(document.createTextNode(inner));
      fragment.appendChild(strike);

    } else if (part.startsWith('||') && part.endsWith('||')) {
      // Sensor / Spoiler (black bar, reveal on hover/click)
      const inner = part.slice(2, -2);
      const spoiler = document.createElement('span');
      spoiler.className = 'spoiler';
      spoiler.setAttribute('tabindex', '0'); // accessible via keyboard
      spoiler.appendChild(document.createTextNode(inner));

      // Click to toggle reveal (untuk mobile/touch)
      spoiler.addEventListener('click', function (e) {
        this.classList.toggle('revealed');
        e.stopPropagation();
      });

      fragment.appendChild(spoiler);

    } else {
      // Teks biasa — langsung sebagai text node
      fragment.appendChild(document.createTextNode(part));
    }
  }

  return fragment;
}

// === UPDATE WORD COUNTER & BUTTON STATE ===
function updateWordCounter() {
  const wordCount = countWords(messageInput.value);
  const isMet = wordCount >= MIN_WORDS;

  // Update teks counter
  wordCounter.textContent = wordCount + ' / ' + MIN_WORDS + ' kata';

  // Update warna counter
  if (isMet) {
    wordCounter.className = 'text-emerald-400/80 text-sm font-light tracking-wide';
  } else if (wordCount >= MIN_WORDS * 0.8) {
    wordCounter.className = 'text-amber-400/80 text-sm font-light tracking-wide';
  } else {
    wordCounter.className = 'text-white/40 text-sm font-light tracking-wide';
  }

  // Enable/disable tombol submit
  throwBtn.disabled = !isMet;
}

// === TOOLBAR FORMATTING HELPERS ===
// Sisipkan tag markdown di sekitar teks yang dipilih, atau di posisi kursor
function insertFormatting(openTag, closeTag) {
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const selected = messageInput.value.substring(start, end);
  const replacement = selected
    ? openTag + selected + closeTag
    : openTag + closeTag;

  // Sisipkan teks
  messageInput.setRangeText(replacement, start, end, 'end');

  // Trigger input event agar word counter diperbarui
  messageInput.dispatchEvent(new Event('input'));

  // Fokus kembali ke textarea
  messageInput.focus();

  // Set cursor position di dalam tag jika tidak ada seleksi
  if (!selected) {
    const cursorPos = start + openTag.length;
    messageInput.setSelectionRange(cursorPos, cursorPos);
  }
}

// === Open Writing Modal ===
function openWriteModal() {
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

  // Fokus ke textarea
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
      // Re-enable tombol jika error
      throwBtn.disabled = false;
      throwBtn.innerHTML = '<span>💧</span> Lempar ke Laut';
    } else {
      // Tampilkan notifikasi sukses
      successNotification.classList.remove('hidden');

      // Tutup modal otomatis setelah 1.5 detik
      setTimeout(function () {
        closeWriteModal();
        // Refresh tampilkan pesan random setelah submit
        fetchRandomMessage();
      }, 1500);
    }
  } catch (error) {
    console.error('Submit error:', error);
    alert('Gagal mengirim pesan. Coba lagi.');
    // Re-enable tombol
    throwBtn.disabled = false;
    throwBtn.innerHTML = '<span>💧</span> Lempar ke Laut';
  }
});

// === Fetch Random Message (GET) ===
async function fetchRandomMessage() {
  showLoading();

  try {
    const response = await fetch('/api/messages');
    const data = await response.json();

    // Delay kecil agar loading terlihat (UX smooth)
    await new Promise(function (r) { setTimeout(r, 400); });

    if (data.error) {
      // API error (misal server error)
      showError(data.error);
    } else if (data.message === 'Tidak ada pesan dalam botol!' || data.message === '') {
      // Database kosong
      showEmpty();
    } else {
      // Ada pesan — render dengan formatting
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
  // Efek visual tombol
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
});
