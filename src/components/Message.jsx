import React from 'react';
import './Message.css';

/**
 * Individual message component
 * @param {Object} props
 * @param {Object} props.message - Message object { id, role, content, timestamp, type }
 */
function Message({ message }) {
  const { role, content, timestamp, type } = message;
  const isUser = role === 'user';

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Format content based on message type
  const renderContent = () => {
    if (type === 'error') {
      return (
        <div className="message-error">
          <strong>Error:</strong> {content}
        </div>
      );
    }

    if (type === 'system') {
      return (
        <div className="message-system">
          {content}
        </div>
      );
    }

    // For API responses, try to format nicely
    if (role === 'assistant' && typeof content === 'object') {
      return (
        <div className="message-response">
          {content.message && <p>{content.message}</p>}
          {content.answer && <p>{content.answer}</p>}
          {content.error && <p className="error-text">{content.error}</p>}
          {content.device_state && (
            <div className="device-state">
              <strong>Device State:</strong>
              <pre>{JSON.stringify(content.device_state, null, 2)}</pre>
            </div>
          )}
        </div>
      );
    }

    return <div className="message-text">{content}</div>;
  };

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-content">
        {renderContent()}
        <div className="message-timestamp">
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}

export default Message;
