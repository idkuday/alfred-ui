import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder } from './useVoiceRecorder';

// Mock the VAD library
vi.mock('@ricky0123/vad-react', () => ({
  useMicVAD: vi.fn(() => ({
    start: vi.fn(),
    pause: vi.fn(),
    loading: false,
    errored: false,
  })),
}));

import { useMicVAD } from '@ricky0123/vad-react';

describe('useVoiceRecorder', () => {
  let mockVAD;

  beforeEach(() => {
    mockVAD = {
      start: vi.fn(),
      pause: vi.fn(),
      loading: false,
      errored: false,
    };
    useMicVAD.mockReturnValue(mockVAD);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const onSpeechEnd = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError })
    );

    expect(result.current.isListening).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isVADError).toBe(false);
  });

  it('should start listening when start is called', async () => {
    const onSpeechEnd = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isListening).toBe(true);
    expect(mockVAD.start).toHaveBeenCalled();
  });

  it('should stop listening when stop is called', async () => {
    const onSpeechEnd = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError })
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isListening).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
    expect(mockVAD.pause).toHaveBeenCalled();
  });

  it('should toggle listening state', async () => {
    const onSpeechEnd = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError })
    );

    // Initially not listening
    expect(result.current.isListening).toBe(false);

    // Toggle on
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.isListening).toBe(true);

    // Toggle off
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isListening).toBe(false);
  });

  it('should expose VAD loading state', () => {
    useMicVAD.mockReturnValue({
      ...mockVAD,
      loading: true,
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError: vi.fn() })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should expose VAD error state', () => {
    useMicVAD.mockReturnValue({
      ...mockVAD,
      errored: true,
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError: vi.fn() })
    );

    expect(result.current.isVADError).toBe(true);
  });

  it('should call onSpeechEnd when VAD detects speech end', async () => {
    const onSpeechEnd = vi.fn();
    let capturedOnSpeechEnd;

    useMicVAD.mockImplementation((config) => {
      capturedOnSpeechEnd = config.onSpeechEnd;
      return mockVAD;
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    // Simulate VAD detecting speech end with audio data
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    act(() => {
      capturedOnSpeechEnd(mockAudioData);
    });

    // onSpeechEnd should be called with a WAV blob
    expect(onSpeechEnd).toHaveBeenCalled();
    const receivedBlob = onSpeechEnd.mock.calls[0][0];
    expect(receivedBlob).toBeInstanceOf(Blob);
    expect(receivedBlob.type).toBe('audio/wav');
  });

  it('should set isSpeaking true when VAD detects speech start', async () => {
    let capturedOnSpeechStart;

    useMicVAD.mockImplementation((config) => {
      capturedOnSpeechStart = config.onSpeechStart;
      return mockVAD;
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    // Simulate VAD detecting speech start
    act(() => {
      capturedOnSpeechStart();
    });

    expect(result.current.isSpeaking).toBe(true);
  });
});

describe('float32ArrayToWav conversion', () => {
  it('should create valid WAV blob from audio data', async () => {
    const onSpeechEnd = vi.fn();
    let capturedOnSpeechEnd;

    useMicVAD.mockImplementation((config) => {
      capturedOnSpeechEnd = config.onSpeechEnd;
      return {
        start: vi.fn(),
        pause: vi.fn(),
        loading: false,
        errored: false,
      };
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    // Create test audio data (1 second at 16kHz)
    const sampleRate = 16000;
    const duration = 0.1; // 100ms
    const samples = sampleRate * duration;
    const audioData = new Float32Array(samples);

    // Fill with sine wave
    for (let i = 0; i < samples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }

    act(() => {
      capturedOnSpeechEnd(audioData);
    });

    expect(onSpeechEnd).toHaveBeenCalled();
    const wavBlob = onSpeechEnd.mock.calls[0][0];

    // Verify it's a valid WAV file
    expect(wavBlob.type).toBe('audio/wav');
    expect(wavBlob).toBeInstanceOf(Blob);

    // Verify blob has content (WAV header is 44 bytes + audio data)
    // 1600 samples * 2 bytes per sample = 3200 bytes + 44 header = 3244 bytes
    const expectedSize = 44 + (samples * 2);
    expect(wavBlob.size).toBe(expectedSize);
  });
});
