import React, { useState, useEffect, useCallback } from 'react';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { sendMessage, checkHealth, getSession } from '../services/api';
import './ChatBox.css';

/**
 * Main chat container component
 * Manages conversation sessions and message flow
 */
function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [sessionId, setSessionId] = useState(null);

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

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const savedSessionId = sessionStorage.getItem('alfred_session_id');
    if (savedSessionId) {
      resumeSession(savedSessionId);
    }
  }, []);

  // Persist session ID to sessionStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('alfred_session_id', sessionId);
    } else {
      sessionStorage.removeItem('alfred_session_id');
    }
  }, [sessionId]);

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

  /**
   * Resume an existing session by fetching its message history
   */
  const resumeSession = async (sid) => {
    try {
      const data = await getSession(sid);
      setSessionId(sid);

      // Convert backend messages to our format
      const restoredMessages = data.messages.map((msg, index) => ({
        id: Date.now() + index,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      setMessages(restoredMessages);
    } catch {
      // Session expired or not found, start fresh
      setSessionId(null);
      sessionStorage.removeItem('alfred_session_id');
    }
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
      // Send to backend with session ID (null on first message = backend creates one)
      const response = await sendMessage(userInput, sessionId);

      // Store session_id from response
      if (response.session_id) {
        setSessionId(response.session_id);
      }

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

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

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
        <div className="header-actions">
          <button
            className="new-chat-button"
            onClick={handleNewChat}
            title="Start a new conversation"
          >
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
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Chat
          </button>
          <div className="connection-status">
            <div
              className="status-indicator"
              style={{ backgroundColor: getStatusColor() }}
            />
            <span className="status-text">{getStatusText()}</span>
          </div>
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
