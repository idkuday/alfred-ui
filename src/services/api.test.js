import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, checkHealth, transcribeAudio, getDevices, voiceCommand } from './api';

describe('API Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      const mockResponse = { response: 'Hello from Alfred' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await sendMessage('Turn on the lights');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_input: 'Turn on the lights' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on API failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(sendMessage('test')).rejects.toThrow('API error: 500');
    });

    it('should throw error on network failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sendMessage('test')).rejects.toThrow('Network error');
    });
  });

  describe('checkHealth', () => {
    it('should return health status when backend is healthy', async () => {
      const mockHealth = { status: 'healthy' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth),
      });

      const result = await checkHealth();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/health');
      expect(result).toEqual(mockHealth);
    });

    it('should throw error when health check fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(checkHealth()).rejects.toThrow('Health check failed: 503');
    });
  });

  describe('transcribeAudio', () => {
    it('should send audio blob and return transcription', async () => {
      const mockTranscription = { text: 'Hello world' };
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranscription),
      });

      const result = await transcribeAudio(audioBlob);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/transcribe',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Check that FormData was sent
      const call = global.fetch.mock.calls[0];
      expect(call[1].body).toBeInstanceOf(FormData);

      expect(result).toEqual(mockTranscription);
    });

    it('should throw error on transcription failure', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(transcribeAudio(audioBlob)).rejects.toThrow('Transcription error: 400');
    });
  });

  describe('getDevices', () => {
    it('should return list of devices', async () => {
      const mockDevices = { devices: ['light1', 'thermostat'] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDevices),
      });

      const result = await getDevices();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/devices');
      expect(result).toEqual(mockDevices);
    });

    it('should throw error when getting devices fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getDevices()).rejects.toThrow('Get devices error: 500');
    });
  });

  describe('voiceCommand', () => {
    it('should send audio and return transcript with response', async () => {
      const mockVoiceResponse = {
        transcript: 'Turn on the lights',
        response: 'Turning on the lights',
      };
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVoiceResponse),
      });

      const result = await voiceCommand(audioBlob);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/voice-command',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Check that FormData was sent
      const call = global.fetch.mock.calls[0];
      expect(call[1].body).toBeInstanceOf(FormData);

      expect(result).toEqual(mockVoiceResponse);
    });

    it('should throw error on voice command failure', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(voiceCommand(audioBlob)).rejects.toThrow('Voice command error: 500');
    });
  });
});
