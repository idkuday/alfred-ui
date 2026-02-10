import { useState, useCallback, useRef } from 'react';

/**
 * Hook for decoding and playing base64-encoded WAV audio.
 * Used for Alfred's TTS voice responses (Piper).
 *
 * @returns {{ playAudio: (base64: string) => Promise<void>, stopAudio: () => void, isPlaying: boolean }}
 */
export default function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  /** Clean up current object URL and audio element */
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  /** Stop any currently playing audio */
  const stopAudio = useCallback(() => {
    cleanup();
  }, [cleanup]);

  /**
   * Decode a base64 WAV string and play it.
   * Silently degrades to text-only on failure.
   * @param {string} base64Audio - Base64-encoded WAV audio
   */
  const playAudio = useCallback(async (base64Audio) => {
    if (!base64Audio) return;

    // Stop any currently playing audio first
    cleanup();

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        cleanup();
      });

      audio.addEventListener('error', () => {
        console.warn('Audio playback error - falling back to text only');
        cleanup();
      });

      setIsPlaying(true);
      await audio.play();
    } catch (error) {
      console.warn('Failed to play audio:', error);
      cleanup();
    }
  }, [cleanup]);

  return { playAudio, stopAudio, isPlaying };
}
