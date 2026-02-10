import React from 'react';
import './VoiceToggle.css';

/**
 * Toggle button for voice mode (Alfred TTS).
 * When enabled, Alfred speaks responses in addition to showing text.
 *
 * @param {Object} props
 * @param {boolean} props.enabled - Whether voice mode is on
 * @param {Function} props.onToggle - Callback to toggle voice mode
 * @param {boolean} props.isPlaying - Whether audio is currently playing
 */
function VoiceToggle({ enabled, onToggle, isPlaying }) {
  return (
    <button
      className={`voice-toggle ${enabled ? 'voice-toggle-on' : ''} ${isPlaying ? 'voice-toggle-playing' : ''}`}
      onClick={onToggle}
      title={enabled ? 'Voice mode ON - click to disable' : 'Voice mode OFF - click to enable'}
      aria-label={enabled ? 'Disable voice mode' : 'Enable voice mode'}
      aria-pressed={enabled}
    >
      {/* Speaker icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {enabled && (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
        {!enabled && (
          <line x1="23" y1="9" x2="17" y2="15" />
        )}
      </svg>
      {isPlaying && <span className="voice-toggle-pulse" />}
    </button>
  );
}

export default VoiceToggle;
