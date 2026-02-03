import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { sendMessage, checkHealth } from '../services/api';
import './ChatBox.css';

/**
 * Main chat container component
 */
function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Check backend health on mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        await checkHealth();
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus('disconnected');
        addSystemMessage('Cannot connect to Alfred backend. Make sure the server is running on http://localhost:8000');
      }
    };

    checkBackendHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const addSystemMessage = (content) => {
    const systemMessage = {
      id: Date.now(),
      role: 'system',
      content,
      timestamp: new Date().toISOString(),
      type: 'system',
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  const handleSendMessage = async (userInput) => {
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Set loading state
    setIsLoading(true);

    try {
      // Send to backend
      const response = await sendMessage(userInput);

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update connection status if it was disconnected
      if (connectionStatus === 'disconnected') {
        setConnectionStatus('connected');
      }
    } catch (error) {
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Failed to get response: ${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Update connection status
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#10b981';
      case 'disconnected':
        return '#ef4444';
      case 'checking':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'checking':
        return 'Connecting...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="chat-box">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <h1>Alfred</h1>
          <p className="subtitle">Smart Home AI Assistant</p>
        </div>
        <div className="connection-status">
          <div
            className="status-indicator"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <InputBox
        onSendMessage={handleSendMessage}
        disabled={isLoading || connectionStatus === 'disconnected'}
      />
    </div>
  );
}

export default ChatBox;
