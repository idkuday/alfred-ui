import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ChatBox from '../../components/ChatBox';

// Mock the API functions
vi.mock('../../services/api', () => ({
  sendMessage: vi.fn(),
  checkHealth: vi.fn(),
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

import { sendMessage, checkHealth } from '../../services/api';

describe('ChatBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      sendMessage.mockResolvedValue({ text: 'Hello!' });

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
