import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ChatBox from '../../components/ChatBox';

// Mock the API functions
vi.mock('../../services/api', () => ({
  sendMessage: vi.fn(),
  checkHealth: vi.fn(),
  getSession: vi.fn(),
}));

// Mock child components to isolate ChatBox testing
vi.mock('../../components/MessageList', () => ({
  default: ({ messages, isLoading }) => (
    <div data-testid="message-list">
      {messages.map((msg, i) => (
        <div key={i} data-testid={`message-${msg.role}`} data-type={msg.type || ''}>
          {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
        </div>
      ))}
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
    </div>
  ),
}));

vi.mock('../../components/InputBox', () => ({
  default: ({ onSendMessage, disabled }) => (
    <div data-testid="input-box">
      <button
        data-testid="send-button"
        disabled={disabled}
        onClick={() => onSendMessage('Test message')}
      >
        Send
      </button>
      <span data-testid="input-disabled">{disabled ? 'true' : 'false'}</span>
    </div>
  ),
}));

import { sendMessage, checkHealth, getSession } from '../../services/api';

describe('ChatBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Initial Render', () => {
    it('should render header with title and subtitle', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      render(<ChatBox />);

      expect(screen.getByText('Alfred')).toBeInTheDocument();
      expect(screen.getByText('Smart Home AI Assistant')).toBeInTheDocument();

      // Cleanup: wait for health check
      await waitFor(() => expect(checkHealth).toHaveBeenCalled());
    });

    it('should render MessageList and InputBox components', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      render(<ChatBox />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('input-box')).toBeInTheDocument();

      await waitFor(() => expect(checkHealth).toHaveBeenCalled());
    });

    it('should show "Connecting..." status initially', () => {
      // Make checkHealth hang
      checkHealth.mockReturnValue(new Promise(() => {}));
      render(<ChatBox />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should render New Chat button', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      render(<ChatBox />);

      expect(screen.getByText('New Chat')).toBeInTheDocument();

      await waitFor(() => expect(checkHealth).toHaveBeenCalled());
    });
  });

  describe('Health Check', () => {
    it('should show "Connected" when health check succeeds', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('should show "Disconnected" when health check fails', async () => {
      checkHealth.mockRejectedValue(new Error('Connection refused'));
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });

    it('should add system message when backend is unreachable', async () => {
      checkHealth.mockRejectedValue(new Error('Connection refused'));
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByTestId('message-system')).toBeInTheDocument();
        expect(screen.getByText(/Cannot connect to Alfred backend/)).toBeInTheDocument();
      });
    });
  });

  describe('Input State', () => {
    it('should disable input when disconnected', async () => {
      checkHealth.mockRejectedValue(new Error('Connection refused'));
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByTestId('input-disabled')).toHaveTextContent('true');
      });
    });

    it('should enable input when connected', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByTestId('input-disabled')).toHaveTextContent('false');
      });
    });
  });

  describe('Message Flow', () => {
    it('should add user message when sending', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockReturnValue(new Promise(() => {})); // Hang

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument();
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should show loading indicator while waiting for response', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockReturnValue(new Promise(() => {})); // Hang

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });
    });

    it('should disable input while loading', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockReturnValue(new Promise(() => {})); // Hang

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByTestId('input-disabled')).toHaveTextContent('true');
      });
    });

    it('should add assistant response when API succeeds', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockResolvedValue({ text: 'Hello!', session_id: 'sess-1' });

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    it('should add error message when API fails', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockRejectedValue(new Error('Server error'));

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByText(/Failed to get response: Server error/)).toBeInTheDocument();
      });
    });

    it('should set status to disconnected when API fails', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockRejectedValue(new Error('Server error'));

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should pass session_id to sendMessage after first response', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      // First call: backend returns a new session_id
      sendMessage.mockResolvedValueOnce({ text: 'Hello!', session_id: 'sess-abc' });
      // Second call: should include session_id
      sendMessage.mockResolvedValueOnce({ text: 'Sure!', session_id: 'sess-abc' });

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // First message - no session_id
      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('Test message', null);
      });

      // Wait for response to be processed
      await waitFor(() => {
        expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
      });

      // Second message - should now include session_id
      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('Test message', 'sess-abc');
      });
    });

    it('should clear messages and session_id when New Chat is clicked', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockResolvedValue({ text: 'Hello!', session_id: 'sess-abc' });

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Send a message to populate chat
      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
      });

      // Click New Chat
      screen.getByText('New Chat').click();

      // Messages should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('message-user')).not.toBeInTheDocument();
        expect(screen.queryByTestId('message-assistant')).not.toBeInTheDocument();
      });
    });

    it('should persist session_id to sessionStorage', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockResolvedValue({ text: 'Hello!', session_id: 'sess-persist' });

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(sessionStorage.getItem('alfred_session_id')).toBe('sess-persist');
      });
    });

    it('should clear sessionStorage when New Chat is clicked', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      sendMessage.mockResolvedValue({ text: 'Hello!', session_id: 'sess-clear' });

      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Send message to establish session
      screen.getByTestId('send-button').click();

      await waitFor(() => {
        expect(sessionStorage.getItem('alfred_session_id')).toBe('sess-clear');
      });

      // Click New Chat
      screen.getByText('New Chat').click();

      await waitFor(() => {
        expect(sessionStorage.getItem('alfred_session_id')).toBeNull();
      });
    });

    it('should resume session from sessionStorage on mount', async () => {
      // Pre-set a session in sessionStorage
      sessionStorage.setItem('alfred_session_id', 'saved-session');

      checkHealth.mockResolvedValue({ status: 'healthy' });
      getSession.mockResolvedValue({
        session: { session_id: 'saved-session', created_at: '2025-01-01T00:00:00', last_active: '2025-01-01T01:00:00', message_count: 2 },
        messages: [
          { role: 'user', content: 'Previous question', timestamp: '2025-01-01T00:00:00' },
          { role: 'assistant', content: 'Previous answer', timestamp: '2025-01-01T00:00:01' },
        ],
      });

      render(<ChatBox />);

      await waitFor(() => {
        expect(getSession).toHaveBeenCalledWith('saved-session');
      });

      await waitFor(() => {
        expect(screen.getByText('Previous question')).toBeInTheDocument();
        expect(screen.getByText('Previous answer')).toBeInTheDocument();
      });
    });

    it('should start fresh if saved session is expired', async () => {
      sessionStorage.setItem('alfred_session_id', 'expired-session');

      checkHealth.mockResolvedValue({ status: 'healthy' });
      getSession.mockRejectedValue(new Error('Get session error: 404'));

      render(<ChatBox />);

      await waitFor(() => {
        expect(getSession).toHaveBeenCalledWith('expired-session');
      });

      // Session should be cleared from storage
      await waitFor(() => {
        expect(sessionStorage.getItem('alfred_session_id')).toBeNull();
      });

      // No messages should be displayed
      expect(screen.queryByTestId('message-user')).not.toBeInTheDocument();
    });
  });

  describe('Connection Status Colors', () => {
    it('should have green indicator when connected', async () => {
      checkHealth.mockResolvedValue({ status: 'healthy' });
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      const indicator = document.querySelector('.status-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(16, 185, 129)' });
    });

    it('should have red indicator when disconnected', async () => {
      checkHealth.mockRejectedValue(new Error('Connection refused'));
      render(<ChatBox />);

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });

      const indicator = document.querySelector('.status-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(239, 68, 68)' });
    });

    it('should have yellow indicator when checking', () => {
      checkHealth.mockReturnValue(new Promise(() => {})); // Hang
      render(<ChatBox />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      const indicator = document.querySelector('.status-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(245, 158, 11)' });
    });
  });
});
