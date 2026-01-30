import React, { useEffect, useRef } from 'react';
import Message from './Message';
import './MessageList.css';

/**
 * Message list component - displays all chat messages
 * @param {Object} props
 * @param {Array} props.messages - Array of message objects
 * @param {boolean} props.isLoading - Whether a response is being loaded
 */
function MessageList({ messages, isLoading }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-state">
          <h2>Welcome to Alfred</h2>
          <p>Your local-first smart home AI assistant</p>
          <p className="hint">Try asking: "Turn on bedroom lamp" or "What's the status of lights?"</p>
        </div>
      )}

      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="typing-indicator">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
