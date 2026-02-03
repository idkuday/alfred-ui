import { useState, useCallback, useRef } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';

/**
 * Voice recorder hook with Voice Activity Detection (VAD)
 * Automatically detects when speech starts and ends
 *
 * @param {Object} options
 * @param {Function} options.onSpeechEnd - Callback with audio blob when speech ends
 * @param {Function} options.onError - Callback when an error occurs
 * @returns {Object} - Recording state and controls
 */
export function useVoiceRecorder({ onSpeechEnd, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  // VAD configuration
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => {
      setIsSpeaking(true);
    },
    onSpeechEnd: (audio) => {
      setIsSpeaking(false);

      // Convert Float32Array to WAV blob
      const wavBlob = float32ArrayToWav(audio, 16000);

      if (onSpeechEnd) {
        onSpeechEnd(wavBlob);
      }

      // Auto-stop after speech ends
      stop();
    },
    onVADMisfire: () => {
      // Speech was too short, keep listening
      console.log('VAD misfire - speech too short');
    },
    positiveSpeechThreshold: 0.8,
    negativeSpeechThreshold: 0.4,
    minSpeechFrames: 5,
    preSpeechPadFrames: 10,
    redemptionFrames: 8,
  });

  const start = useCallback(async () => {
    try {
      setError(null);
      startedRef.current = true;
      setIsListening(true);
      vad.start();
    } catch (err) {
      console.error('Error starting VAD:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setIsListening(false);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [vad, onError]);

  const stop = useCallback(() => {
    startedRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    vad.pause();
  }, [vad]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    isSpeaking,
    error,
    start,
    stop,
    toggle,
    // Expose VAD loading state
    isLoading: vad.loading,
    isVADError: vad.errored,
  };
}

/**
 * Convert Float32Array audio data to WAV blob
 * @param {Float32Array} float32Array - Audio samples
 * @param {number} sampleRate - Sample rate (default 16000)
 * @returns {Blob} - WAV audio blob
 */
function float32ArrayToWav(float32Array, sampleRate = 16000) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = float32Array.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Convert Float32 samples to 16-bit PCM
  const offset = headerSize;
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset + i * 2, int16, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function getErrorMessage(err) {
  if (err.name === 'NotAllowedError') {
    return 'Microphone permission denied. Please allow access.';
  }
  if (err.name === 'NotFoundError') {
    return 'No microphone found. Please connect a microphone.';
  }
  if (err.name === 'NotReadableError') {
    return 'Microphone is in use by another application.';
  }
  return `Voice recording error: ${err.message}`;
}

export default useVoiceRecorder;
