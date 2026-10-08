const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function sendChatMessage(payload) {
  const res = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

export async function fetchSystemStatus() {
  const res = await fetch(`${BASE_URL}/system/status`);
  return res.json();
}

export async function runCode(payload) {
  const res = await fetch(`${BASE_URL}/execution/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Execution failed');
  }

  return res.json();
}
