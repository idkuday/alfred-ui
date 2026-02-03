import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceButton from '../../components/VoiceButton';

// Mock the useVoiceRecorder hook
vi.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: vi.fn(() => ({
    isListening: false,
    isSpeaking: false,
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    isLoading: false,
    isVADError: false,
  })),
}));

// Mock the API functions
vi.mock('../../services/api', () => ({
  transcribeAudio: vi.fn(),
  voiceCommand: vi.fn(),
}));

import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { transcribeAudio, voiceCommand } from '../../services/api';

describe('VoiceButton', () => {
  let mockToggle;

  beforeEach(() => {
    mockToggle = vi.fn();
    useVoiceRecorder.mockReturnValue({
      isListening: false,
      isSpeaking: false,
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
      toggle: mockToggle,
      isLoading: false,
      isVADError: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render idle state with microphone icon', () => {
      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('voice-button-idle');
      expect(button).toHaveAttribute('title', 'Click to start voice input');
    });

    it('should render listening state', () => {
      useVoiceRecorder.mockReturnValue({
        isListening: true,
        isSpeaking: false,
        error: null,
        toggle: mockToggle,
        isLoading: false,
        isVADError: false,
      });

      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('voice-button-listening');
      expect(button).toHaveAttribute('title', 'Waiting for speech... Click to cancel');
    });

    it('should render speaking state', () => {
      useVoiceRecorder.mockReturnValue({
        isListening: true,
        isSpeaking: true,
        error: null,
        toggle: mockToggle,
        isLoading: false,
        isVADError: false,
      });

      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('voice-button-speaking');
      expect(button).toHaveAttribute('title', 'Listening to your voice...');
    });

    it('should render loading state when VAD is loading', () => {
      useVoiceRecorder.mockReturnValue({
        isListening: false,
        isSpeaking: false,
        error: null,
        toggle: mockToggle,
        isLoading: true,
        isVADError: false,
      });

      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Loading voice detection...');
    });

    it('should render error state when VAD has error', () => {
      useVoiceRecorder.mockReturnValue({
        isListening: false,
        isSpeaking: false,
        error: null,
        toggle: mockToggle,
        isLoading: false,
        isVADError: true,
      });

      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Voice detection unavailable');
    });

    it('should display VAD error message', () => {
      useVoiceRecorder.mockReturnValue({
        isListening: false,
        isSpeaking: false,
        error: 'Microphone permission denied',
        toggle: mockToggle,
        isLoading: false,
        isVADError: false,
      });

      render(<VoiceButton onTranscription={vi.fn()} />);

      expect(screen.getByText('Microphone permission denied')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call toggle when clicked', () => {
      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockToggle).toHaveBeenCalled();
    });

    it('should not call toggle when disabled', () => {
      render(<VoiceButton onTranscription={vi.fn()} disabled={true} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockToggle).not.toHaveBeenCalled();
    });

    it('should be disabled during processing', async () => {
      const onTranscription = vi.fn();
      let onSpeechEndHandler;

      useVoiceRecorder.mockImplementation(({ onSpeechEnd }) => {
        onSpeechEndHandler = onSpeechEnd;
        return {
          isListening: false,
          isSpeaking: false,
          error: null,
          toggle: mockToggle,
          isLoading: false,
          isVADError: false,
        };
      });

      // Make transcribeAudio hang
      transcribeAudio.mockImplementation(() => new Promise(() => {}));

      render(<VoiceButton onTranscription={onTranscription} />);

      // Simulate speech end
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });
      onSpeechEndHandler(audioBlob);

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('title', 'Processing...');
      });
    });
  });

  describe('Transcription flow', () => {
    it('should call onTranscription with text when transcription succeeds', async () => {
      const onTranscription = vi.fn();
      let onSpeechEndHandler;

      useVoiceRecorder.mockImplementation(({ onSpeechEnd }) => {
        onSpeechEndHandler = onSpeechEnd;
        return {
          isListening: false,
          isSpeaking: false,
          error: null,
          toggle: mockToggle,
          isLoading: false,
          isVADError: false,
        };
      });

      transcribeAudio.mockResolvedValue({ text: 'Hello world' });

      render(<VoiceButton onTranscription={onTranscription} />);

      // Simulate speech end
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });
      await onSpeechEndHandler(audioBlob);

      await waitFor(() => {
        expect(transcribeAudio).toHaveBeenCalledWith(audioBlob);
        expect(onTranscription).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should display error when transcription fails', async () => {
      let onSpeechEndHandler;

      useVoiceRecorder.mockImplementation(({ onSpeechEnd }) => {
        onSpeechEndHandler = onSpeechEnd;
        return {
          isListening: false,
          isSpeaking: false,
          error: null,
          toggle: mockToggle,
          isLoading: false,
          isVADError: false,
        };
      });

      transcribeAudio.mockRejectedValue(new Error('Server error'));

      render(<VoiceButton onTranscription={vi.fn()} />);

      // Simulate speech end
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });
      await onSpeechEndHandler(audioBlob);

      await waitFor(() => {
        expect(screen.getByText(/Failed to process voice/)).toBeInTheDocument();
      });
    });

    it('should display error when no transcription text received', async () => {
      let onSpeechEndHandler;

      useVoiceRecorder.mockImplementation(({ onSpeechEnd }) => {
        onSpeechEndHandler = onSpeechEnd;
        return {
          isListening: false,
          isSpeaking: false,
          error: null,
          toggle: mockToggle,
          isLoading: false,
          isVADError: false,
        };
      });

      transcribeAudio.mockResolvedValue({}); // No text field

      render(<VoiceButton onTranscription={vi.fn()} />);

      // Simulate speech end
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });
      await onSpeechEndHandler(audioBlob);

      await waitFor(() => {
        expect(screen.getByText('No transcription received')).toBeInTheDocument();
      });
    });
  });

  describe('Voice command flow', () => {
    it('should call onVoiceCommand when using voice command endpoint', async () => {
      const onVoiceCommand = vi.fn();
      let onSpeechEndHandler;

      useVoiceRecorder.mockImplementation(({ onSpeechEnd }) => {
        onSpeechEndHandler = onSpeechEnd;
        return {
          isListening: false,
          isSpeaking: false,
          error: null,
          toggle: mockToggle,
          isLoading: false,
          isVADError: false,
        };
      });

      const mockResponse = {
        transcript: 'Turn on the lights',
        response: 'Turning on the lights',
      };
      voiceCommand.mockResolvedValue(mockResponse);

      render(
        <VoiceButton
          onVoiceCommand={onVoiceCommand}
          useVoiceCommandEndpoint={true}
        />
      );

      // Simulate speech end
      const audioBlob = new Blob(['test'], { type: 'audio/wav' });
      await onSpeechEndHandler(audioBlob);

      await waitFor(() => {
        expect(voiceCommand).toHaveBeenCalledWith(audioBlob);
        expect(onVoiceCommand).toHaveBeenCalledWith(mockResponse);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button with aria-label', () => {
      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Click to start voice input');
    });

    it('should update aria-label based on state', () => {
      useVoiceRecorder.mockReturnValue({
        isListening: true,
        isSpeaking: true,
        error: null,
        toggle: mockToggle,
        isLoading: false,
        isVADError: false,
      });

      render(<VoiceButton onTranscription={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Listening to your voice...');
    });
  });
});
