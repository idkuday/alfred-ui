import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, checkHealth, transcribeAudio, getDevices, voiceCommand, getSessions, createSession, getSession, deleteSession } from '../../services/api';

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
      const mockResponse = { response: 'Hello from Alfred', session_id: 'abc-123' };
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

    it('should include session_id in request body when provided', async () => {
      const mockResponse = { response: 'Done', session_id: 'abc-123' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await sendMessage('Turn off lights', 'abc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_input: 'Turn off lights', session_id: 'abc-123' }),
        })
      );
    });

    it('should not include session_id when null', async () => {
      const mockResponse = { response: 'Hello', session_id: 'new-123' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await sendMessage('Hello', null);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/execute',
        expect.objectContaining({
          body: JSON.stringify({ user_input: 'Hello' }),
        })
      );
    });

    it('should parse session_id from response', async () => {
      const mockResponse = { response: 'Hello', session_id: 'new-session-456' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await sendMessage('Hello');

      expect(result.session_id).toBe('new-session-456');
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

  // --- Session Management Tests ---

  describe('getSessions', () => {
    it('should return list of sessions', async () => {
      const mockSessions = {
        count: 2,
        sessions: [
          { session_id: 'abc', created_at: '2025-01-01T00:00:00', last_active: '2025-01-01T01:00:00', message_count: 4 },
          { session_id: 'def', created_at: '2025-01-01T00:00:00', last_active: '2025-01-01T00:30:00', message_count: 2 },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessions),
      });

      const result = await getSessions();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/sessions');
      expect(result).toEqual(mockSessions);
      expect(result.sessions).toHaveLength(2);
    });

    it('should throw error on failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(getSessions()).rejects.toThrow('Get sessions error: 503');
    });
  });

  describe('createSession', () => {
    it('should create a new session and return session_id', async () => {
      const mockResponse = { session_id: 'new-session-id' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await createSession();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/sessions',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.session_id).toBe('new-session-id');
    });

    it('should throw error on failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(createSession()).rejects.toThrow('Create session error: 503');
    });
  });

  describe('getSession', () => {
    it('should return session with message history', async () => {
      const mockResponse = {
        session: { session_id: 'abc', created_at: '2025-01-01T00:00:00', last_active: '2025-01-01T01:00:00', message_count: 2 },
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2025-01-01T00:00:00', metadata: null },
          { role: 'assistant', content: 'Hi there!', timestamp: '2025-01-01T00:00:01', metadata: null },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSession('abc');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/sessions/abc');
      expect(result.messages).toHaveLength(2);
      expect(result.session.session_id).toBe('abc');
    });

    it('should throw error when session not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getSession('nonexistent')).rejects.toThrow('Get session error: 404');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session and return success', async () => {
      const mockResponse = { status: 'success', message: 'Session abc deleted' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await deleteSession('abc');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/sessions/abc',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result.status).toBe('success');
    });

    it('should throw error when session not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(deleteSession('nonexistent')).rejects.toThrow('Delete session error: 404');
    });
  });
});
