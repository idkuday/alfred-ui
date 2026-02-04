import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

describe('useVoiceRecorder', () => {
  let mockVADInstance;
  let capturedCallbacks;

  beforeEach(() => {
    capturedCallbacks = {};
    mockVADInstance = {
      start: vi.fn(),
      pause: vi.fn(),
      destroy: vi.fn(),
    };

    // Mock window.vad (the global VAD object loaded by script)
    window.vad = {
      MicVAD: {
        new: vi.fn(async (config) => {
          // Capture callbacks for testing
          capturedCallbacks.onSpeechStart = config.onSpeechStart;
          capturedCallbacks.onSpeechEnd = config.onSpeechEnd;
          capturedCallbacks.onVADMisfire = config.onVADMisfire;
          return mockVADInstance;
        }),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.vad;
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
    expect(result.current.isLoading).toBe(false);
    expect(mockVADInstance.start).toHaveBeenCalled();
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
    expect(mockVADInstance.pause).toHaveBeenCalled();
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

  it('should set isLoading true while initializing VAD', async () => {
    // Make MicVAD.new take some time
    let resolveVAD;
    window.vad.MicVAD.new = vi.fn(() => new Promise((resolve) => {
      resolveVAD = () => resolve(mockVADInstance);
    }));

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError: vi.fn() })
    );

    // Start but don't await
    let startPromise;
    act(() => {
      startPromise = result.current.start();
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve VAD creation
    await act(async () => {
      resolveVAD();
      await startPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set isVADError when VAD initialization fails', async () => {
    const onError = vi.fn();
    window.vad.MicVAD.new = vi.fn().mockRejectedValue(new Error('VAD init failed'));

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isVADError).toBe(true);
    expect(result.current.error).toContain('VAD init failed');
    expect(onError).toHaveBeenCalled();
  });

  it('should call onSpeechEnd when VAD detects speech end', async () => {
    const onSpeechEnd = vi.fn();

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    // Simulate VAD detecting speech end with audio data
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    act(() => {
      capturedCallbacks.onSpeechEnd(mockAudioData);
    });

    // onSpeechEnd should be called with a WAV blob
    expect(onSpeechEnd).toHaveBeenCalled();
    const receivedBlob = onSpeechEnd.mock.calls[0][0];
    expect(receivedBlob).toBeInstanceOf(Blob);
    expect(receivedBlob.type).toBe('audio/wav');
  });

  it('should set isSpeaking true when VAD detects speech start', async () => {
    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    // Simulate VAD detecting speech start
    act(() => {
      capturedCallbacks.onSpeechStart();
    });

    expect(result.current.isSpeaking).toBe(true);
  });

  it('should auto-stop after speech ends', async () => {
    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd: vi.fn(), onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isListening).toBe(true);

    // Simulate speech end
    act(() => {
      capturedCallbacks.onSpeechEnd(new Float32Array([0.1]));
    });

    expect(result.current.isListening).toBe(false);
    expect(mockVADInstance.pause).toHaveBeenCalled();
  });
});

describe('float32ArrayToWav conversion', () => {
  let mockVADInstance;
  let capturedCallbacks;

  beforeEach(() => {
    capturedCallbacks = {};
    mockVADInstance = {
      start: vi.fn(),
      pause: vi.fn(),
      destroy: vi.fn(),
    };

    window.vad = {
      MicVAD: {
        new: vi.fn(async (config) => {
          capturedCallbacks.onSpeechEnd = config.onSpeechEnd;
          return mockVADInstance;
        }),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.vad;
  });

  it('should create valid WAV blob from audio data', async () => {
    const onSpeechEnd = vi.fn();

    const { result } = renderHook(() =>
      useVoiceRecorder({ onSpeechEnd, onError: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    // Create test audio data (100ms at 16kHz)
    const sampleRate = 16000;
    const duration = 0.1;
    const samples = sampleRate * duration;
    const audioData = new Float32Array(samples);

    // Fill with sine wave
    for (let i = 0; i < samples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }

    act(() => {
      capturedCallbacks.onSpeechEnd(audioData);
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
