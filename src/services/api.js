/**
 * API service for communicating with Alfred backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Send a message to Alfred and get a response
 * @param {string} userInput - The user's input text
 * @returns {Promise<Object>} - The response from Alfred
 */
export async function sendMessage(userInput) {
  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_input: userInput }),
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
