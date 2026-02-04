import React, { useState, useRef, useEffect } from 'react';
import VoiceButton from './VoiceButton';
import './InputBox.css';

/**
 * Input box component for typing messages
 * @param {Object} props
 * @param {Function} props.onSendMessage - Callback when message is sent
 * @param {boolean} props.disabled - Whether input is disabled (while loading)
 */
function InputBox({ onSendMessage, disabled }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();

    if (trimmedInput && !disabled) {
      onSendMessage(trimmedInput);
      setInput('');

      // Reset textarea height and refocus for continued typing
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTranscription = (text) => {
    // Auto-send transcribed text
    if (text && !disabled) {
      onSendMessage(text);
      // Refocus textarea after voice input
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  return (
    <div className="input-box">
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Ask alfred anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="submit"
          className="send-button"
          disabled={disabled || !input.trim()}
          title="Send message (Enter)"
        >
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
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
        <VoiceButton
          onTranscription={handleTranscription}
          disabled={disabled}
        />
      </form>
      <div className="input-hint">
        Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line • Click mic to record
      </div>
    </div>
  );
}

export default InputBox;
