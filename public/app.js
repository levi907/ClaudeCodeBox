// ============================================================
// Feature Detection
// ============================================================

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

if (!SpeechRecognitionAPI) {
  showError('Speech recognition is not supported. Please use Chrome on Android or a recent desktop Chrome/Edge.');
}
if (!synth) {
  showError('Text-to-speech is not supported in this browser.');
}

// ============================================================
// State
// ============================================================

let conversationHistory = [];
let isListening = false;
let isSpeaking = false;
let recognition = null;
let ttsResumeInterval = null;

// ============================================================
// DOM References
// ============================================================

const micBtn = document.getElementById('mic-btn');
const statusEl = document.getElementById('status');
const errorBanner = document.getElementById('error-banner');
const conversationEl = document.getElementById('conversation');
const clearBtn = document.getElementById('clear-btn');

// ============================================================
// SpeechRecognition
// ============================================================

function createRecognition() {
  const rec = new SpeechRecognitionAPI();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  rec.onstart = () => {
    isListening = true;
    setStatus('Listening...');
    micBtn.classList.add('listening');
    micBtn.setAttribute('aria-label', 'Tap to stop listening');
  };

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    if (transcript) {
      addMessageToUI('user', transcript);
      sendToAPI(transcript);
    }
  };

  rec.onerror = (event) => {
    if (event.error === 'not-allowed') {
      showError('Microphone permission denied. Please allow microphone access in your browser settings.');
    } else if (event.error === 'no-speech') {
      setStatus('No speech detected. Tap to try again.');
    } else {
      setStatus('Recognition error: ' + event.error);
    }
    resetMicState();
  };

  rec.onend = () => {
    // onend fires after both successful recognition and errors
    resetMicState();
  };

  return rec;
}

// ============================================================
// Mic Button Handler
// ============================================================

micBtn.addEventListener('click', () => {
  // If Claude is speaking, tap interrupts the speech
  if (isSpeaking) {
    stopSpeaking();
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  if (!SpeechRecognitionAPI) return;

  // recognition.start() MUST be called synchronously here, directly within
  // the click handler. Android Chrome blocks it if called after any async op.
  recognition = createRecognition();
  try {
    recognition.start();
  } catch (e) {
    // InvalidStateError if recognition is somehow already running
    setStatus('Please wait a moment and try again.');
  }
});

// ============================================================
// API Call
// ============================================================

async function sendToAPI(userMessage) {
  setStatus('Thinking...');
  micBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: conversationHistory,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'HTTP ' + res.status);
    }

    const data = await res.json();

    // Sync conversation history from backend's authoritative response
    conversationHistory = data.updatedHistory;

    addMessageToUI('assistant', data.response);
    speakText(data.response);
  } catch (err) {
    showError('Failed to reach Claude: ' + err.message);
    micBtn.disabled = false;
    setStatus('Tap to speak');
  }
}

// ============================================================
// Text-to-Speech
// ============================================================

function speakText(text) {
  if (!synth) {
    micBtn.disabled = false;
    setStatus('Tap to speak');
    return;
  }

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  isSpeaking = true;
  micBtn.classList.remove('listening');
  micBtn.classList.add('speaking');
  micBtn.disabled = false;
  micBtn.setAttribute('aria-label', 'Tap to interrupt Claude');
  setStatus('Claude is speaking... (tap to interrupt)');

  // Android Chrome Bug: SpeechSynthesis pauses after ~15 seconds of speaking.
  // Calling resume() periodically keeps it going for long responses.
  ttsResumeInterval = setInterval(() => {
    if (synth.speaking) {
      synth.resume();
    } else {
      clearInterval(ttsResumeInterval);
      ttsResumeInterval = null;
    }
  }, 10000);

  utterance.onend = () => {
    onSpeakingFinished();
  };

  utterance.onerror = (event) => {
    // 'interrupted' is expected when user taps to stop; not a real error
    if (event.error !== 'interrupted') {
      showError('Speech playback error: ' + event.error);
    }
    onSpeakingFinished();
  };

  synth.speak(utterance);
}

function stopSpeaking() {
  if (ttsResumeInterval) {
    clearInterval(ttsResumeInterval);
    ttsResumeInterval = null;
  }
  synth.cancel();
  onSpeakingFinished();
}

function onSpeakingFinished() {
  if (ttsResumeInterval) {
    clearInterval(ttsResumeInterval);
    ttsResumeInterval = null;
  }
  isSpeaking = false;
  micBtn.classList.remove('speaking');
  micBtn.disabled = false;
  micBtn.setAttribute('aria-label', 'Tap to speak');
  setStatus('Tap to speak');
}

// ============================================================
// Clear Conversation
// ============================================================

clearBtn.addEventListener('click', () => {
  if (isSpeaking) stopSpeaking();
  if (isListening && recognition) recognition.stop();

  conversationHistory = [];
  conversationEl.innerHTML = '';
  setStatus('Tap to speak');
});

// ============================================================
// UI Helpers
// ============================================================

function addMessageToUI(role, text) {
  const div = document.createElement('div');
  div.className = 'message ' + role;

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = role === 'user' ? 'You' : 'Claude';
  div.appendChild(label);

  const content = document.createElement('div');
  content.textContent = text;
  div.appendChild(content);

  conversationEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
  setTimeout(() => {
    errorBanner.style.display = 'none';
  }, 7000);
}

function resetMicState() {
  isListening = false;
  micBtn.classList.remove('listening');
  micBtn.setAttribute('aria-label', 'Tap to speak');
  if (!isSpeaking && !micBtn.disabled) {
    setStatus('Tap to speak');
  }
}
