const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message');
const throwBtn = document.getElementById('throw-btn');
const findBtn = document.getElementById('find-btn');
const messageDisplay = document.getElementById('message-display');

throwBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    if (data.error) {
      messageDisplay.textContent = data.error;
      messageDisplay.classList.add('text-red-500');
    } else {
      messageDisplay.textContent = data.message;
      messageDisplay.classList.add('text-green-500');
      messageInput.value = '';
    }

    // Animasi tombol
    throwBtn.classList.add('animate-pulse');
    setTimeout(() => {
      throwBtn.classList.remove('animate-pulse');
    }, 500);
  } catch (error) {
    console.error(error);
  }
});

findBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/messages');
    const data = await response.json();
    if (data.error) {
      messageDisplay.textContent = data.error;
      messageDisplay.classList.add('text-red-500');
    } else {
      messageDisplay.textContent = data.message;
      messageDisplay.classList.remove('text-red-500');
    }

    // Animasi tombol
    findBtn.classList.add('animate-pulse');
    setTimeout(() => {
      findBtn.classList.remove('animate-pulse');
    }, 500);
  } catch (error) {
    console.error(error);
  }
});