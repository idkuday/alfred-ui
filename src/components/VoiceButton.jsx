import React, { useState, useCallback } from 'react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { voiceCommand, transcribeAudio } from '../services/api';
import './VoiceButton.css';

/**
 * Voice input button component with VAD (Voice Activity Detection)
 * Automatically detects when speech starts and ends
 *
 * @param {Object} props
 * @param {Function} props.onTranscription - Callback when transcription is complete (text only)
 * @param {Function} props.onVoiceCommand - Callback when voice command completes (transcript + response)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.useVoiceCommandEndpoint - If true, use /voice-command endpoint (default: false)
 */
function VoiceButton({
  onTranscription,
  onVoiceCommand,
  disabled,
  useVoiceCommandEndpoint = false,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSpeechEnd = useCallback(
    async (audioBlob) => {
      setIsProcessing(true);
      setError(null);

      try {
        if (useVoiceCommandEndpoint && onVoiceCommand) {
          // Use voice-command endpoint for transcript + response
          const response = await voiceCommand(audioBlob);
          onVoiceCommand(response);
        } else if (onTranscription) {
          // Use transcribe endpoint for text only
          const response = await transcribeAudio(audioBlob);
          if (response.text) {
            onTranscription(response.text);
          } else {
            setError('No transcription received');
          }
        }
      } catch (err) {
        console.error('Voice processing error:', err);
        setError('Failed to process voice: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onTranscription, onVoiceCommand, useVoiceCommandEndpoint]
  );

  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  const {
    isListening,
    isSpeaking,
    error: vadError,
    toggle,
    isLoading: isVADLoading,
    isVADError,
  } = useVoiceRecorder({
    onSpeechEnd: handleSpeechEnd,
    onError: handleError,
  });

  // Get button state for styling
  const getButtonState = () => {
    if (isProcessing) return 'processing';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    // Show loading state when VAD is initializing (but button is still clickable)
    if (isVADLoading) return 'loading';
    return 'idle';
  };

  const buttonState = getButtonState();
  const displayError = error || vadError;
  // Don't disable for VAD loading - user can click and we'll show loading state
  // Only disable for explicit disabled prop, processing, or VAD error
  const isDisabled = disabled || isProcessing || isVADError;

  // Get button title/tooltip
  const getTitle = () => {
    if (isVADLoading) return 'Loading voice detection...';
    if (isVADError) return 'Voice detection unavailable';
    if (isProcessing) return 'Processing...';
    if (isSpeaking) return 'Listening to your voice...';
    if (isListening) return 'Waiting for speech... Click to cancel';
    return 'Click to start voice input';
  };

  return (
    <div className="voice-button-container">
      <button
        className={`voice-button voice-button-${buttonState}`}
        onClick={toggle}
        disabled={isDisabled}
        title={getTitle()}
        aria-label={getTitle()}
      >
        {/* Loading state - VAD initializing (show mic with subtle indicator) */}
        {buttonState === 'loading' && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mic-loading"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        )}

        {/* Idle state - microphone icon */}
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

        {/* Listening state - waiting for speech */}
        {buttonState === 'listening' && (
          <div className="listening-indicator">
            <div className="listening-waves">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {/* Speaking state - active voice detected */}
        {buttonState === 'speaking' && (
          <div className="speaking-indicator">
            <div className="pulse-dot"></div>
          </div>
        )}

        {/* Processing state - sending to server */}
        {buttonState === 'processing' && <div className="spinner"></div>}
      </button>

      {displayError && <div className="voice-error">{displayError}</div>}
    </div>
  );
}

export default VoiceButton;
