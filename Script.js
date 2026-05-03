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
const charCounter = document.getElementById('char-counter');
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

// Tampilkan pesan dari API
function showMessage(text) {
  hideAllMessageStates();
  messageDisplay.textContent = `"${text}"`;
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

// === Fetch Random Message (GET) ===
async function fetchRandomMessage() {
  showLoading();

  try {
    const response = await fetch('/api/messages');
    const data = await response.json();

    // Delay kecil agar loading terlihat (UX smooth)
    await new Promise(r => setTimeout(r, 400));

    if (data.error) {
      // API error (misal server error)
      showError(data.error);
    } else if (data.message === 'Tidak ada pesan dalam botol!' || data.message === '') {
      // Database kosong
      showEmpty();
    } else {
      // Ada pesan
      showMessage(data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
    await new Promise(r => setTimeout(r, 400));
    showError('Gagal terhubung ke lautan. Coba lagi nanti.');
  }
}

// === Open Writing Modal ===
function openWriteModal() {
  // Reset form
  messageInput.value = '';
  charCounter.textContent = '0 / 300';
  charCounter.className = 'text-white/40 text-sm font-light tracking-wide';
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
  setTimeout(() => messageInput.focus(), 400);
}

// === Close Writing Modal ===
function closeWriteModal() {
  // Animasi keluar
  modalCard.classList.remove('scale-100', 'opacity-100');
  modalCard.classList.add('scale-95', 'opacity-0');
  modalOverlay.classList.remove('opacity-100');
  modalOverlay.classList.add('opacity-0');
  
  // Sembunyikan setelah transisi selesai
  setTimeout(() => {
    writeModal.classList.add('hidden');
  }, 400);
}

// === Character Counter (Real-time) ===
messageInput.addEventListener('input', () => {
  const len = messageInput.value.length;
  charCounter.textContent = `${len} / 300`;
  
  // Ubah warna mendekati batas
  if (len >= 280) {
    charCounter.className = 'text-red-400/80 text-sm font-light tracking-wide';
  } else if (len >= 200) {
    charCounter.className = 'text-amber-400/80 text-sm font-light tracking-wide';
  } else {
    charCounter.className = 'text-white/40 text-sm font-light tracking-wide';
  }
});

// === Submit Message (POST) ===
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const message = messageInput.value.trim();
  if (!message) return;
  
  // Disable tombol selama submit
  throwBtn.disabled = true;
  throwBtn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span> Melempar...';
  
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      alert(data.error);
    } else {
      // Tampilkan notifikasi sukses
      successNotification.classList.remove('hidden');
      
      // Tutup modal otomatis setelah 1.5 detik
      setTimeout(() => {
        closeWriteModal();
        // Refresh tampilkan pesan random setelah submit
        fetchRandomMessage();
      }, 1500);
    }
  } catch (error) {
    console.error('Submit error:', error);
    alert('Gagal mengirim pesan. Coba lagi.');
  } finally {
    // Re-enable tombol
    throwBtn.disabled = false;
    throwBtn.innerHTML = '<span>💧</span> Lempar ke Laut';
  }
});

// === Event: Auto-fetch on Page Load ===
window.addEventListener('load', () => {
  fetchRandomMessage();
});

// === Event: Find Another Message ===
findBtn.addEventListener('click', () => {
  // Efek visual tombol
  findBtn.classList.add('scale-95');
  setTimeout(() => findBtn.classList.remove('scale-95'), 150);
  
  fetchRandomMessage();
});

// === Event: Open Write Modal ===
writeBtn.addEventListener('click', () => {
  openWriteModal();
});

// === Event: Cancel / Back ===
cancelBtn.addEventListener('click', () => {
  closeWriteModal();
});

// === Event: Click outside modal to close ===
modalOverlay.addEventListener('click', () => {
  closeWriteModal();
});

// === Keyboard: Escape to close modal ===
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !writeModal.classList.contains('hidden')) {
    closeWriteModal();
  }
});
