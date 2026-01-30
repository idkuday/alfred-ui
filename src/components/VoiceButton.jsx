import React, { useState, useRef, useEffect } from 'react';
import { transcribeAudio } from '../services/api';
import './VoiceButton.css';

/**
 * Voice input button component
 * @param {Object} props
 * @param {Function} props.onTranscription - Callback when transcription is complete
 * @param {boolean} props.disabled - Whether button is disabled
 */
function VoiceButton({ onTranscription, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm', // Most widely supported
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        // Process the audio
        await processAudio(audioBlob);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError('Failed to start recording: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await transcribeAudio(audioBlob);

      if (response.text) {
        onTranscription(response.text);
      } else {
        setError('No transcription received');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Get button state
  const getButtonState = () => {
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    return 'idle';
  };

  const buttonState = getButtonState();

  return (
    <div className="voice-button-container">
      <button
        className={`voice-button voice-button-${buttonState}`}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title={
          isProcessing
            ? 'Processing...'
            : isRecording
            ? 'Click to stop recording'
            : 'Click to start voice input'
        }
      >
        {buttonState === 'idle' && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        )}

        {buttonState === 'recording' && (
          <div className="recording-indicator">
            <div className="pulse-dot"></div>
          </div>
        )}

        {buttonState === 'processing' && (
          <div className="spinner"></div>
        )}
      </button>

      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceButton;
