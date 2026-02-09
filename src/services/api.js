/**
 * API service for communicating with Alfred backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Send a message to Alfred and get a response
 * @param {string} userInput - The user's input text
 * @param {string|null} sessionId - Optional session ID for conversation continuity
 * @returns {Promise<Object>} - The response from Alfred (includes session_id)
 */
export async function sendMessage(userInput, sessionId = null) {
  try {
    const body = { user_input: userInput };
    if (sessionId) {
      body.session_id = sessionId;
    }

    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Check if Alfred backend is healthy
 * @returns {Promise<Object>} - Health status
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

/**
 * Transcribe audio file to text
 * @param {Blob} audioBlob - The audio blob to transcribe
 * @returns {Promise<Object>} - Object with transcribed text
 */
export async function transcribeAudio(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');

    const response = await fetch(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

/**
 * Get list of all devices
 * @returns {Promise<Object>} - List of devices
 */
export async function getDevices() {
  try {
    const response = await fetch(`${API_BASE_URL}/devices`);
    if (!response.ok) {
      throw new Error(`Get devices error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get devices error:', error);
    throw error;
  }
}

/**
 * Send audio for voice command processing
 * This endpoint transcribes audio and executes the command in one call
 * @param {Blob} audioBlob - The audio blob to process
 * @returns {Promise<Object>} - Object with transcript and Alfred's response
 */
export async function voiceCommand(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');

    const response = await fetch(`${API_BASE_URL}/voice-command`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Voice command error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Voice command error:', error);
    throw error;
  }
}

// --- Session Management ---

/**
 * List all conversation sessions
 * @returns {Promise<Object>} - { count, sessions: [{session_id, created_at, last_active, message_count}] }
 */
export async function getSessions() {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`);
    if (!response.ok) {
      throw new Error(`Get sessions error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get sessions error:', error);
    throw error;
  }
}

/**
 * Create a new conversation session explicitly
 * @returns {Promise<Object>} - { session_id }
 */
export async function createSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Create session error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Create session error:', error);
    throw error;
  }
}

/**
 * Get a session with its full message history
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - { session: {...}, messages: [{role, content, timestamp, metadata}] }
 */
export async function getSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Get session error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
}

/**
 * Delete a conversation session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - { status, message }
 */
export async function deleteSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Delete session error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Delete session error:', error);
    throw error;
  }
}
