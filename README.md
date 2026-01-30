# Alfred UI

ChatGPT-like web interface for Alfred smart home AI assistant.

## Features

- ✅ Text-based chat interface
- ✅ Real-time connection status
- ✅ Message history
- ✅ Loading indicators
- ✅ Error handling
- ✅ Responsive design
- 🚧 Voice input (Phase 2)
- 🚧 Dark mode (Phase 3)

## Prerequisites

- Node.js 16+ and npm
- Alfred backend running on `http://localhost:8000`

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5173` (Vite's default port)

## Environment Variables

Create a `.env` file (optional):

```env
VITE_API_URL=http://localhost:8000
```

Default is `http://localhost:8000` if not specified.

## Development

### Project Structure

```
src/
├── components/
│   ├── ChatBox.jsx          # Main chat container
│   ├── MessageList.jsx      # Message display
│   ├── Message.jsx          # Individual message
│   ├── InputBox.jsx         # Text input
│   └── *.css                # Component styles
├── services/
│   └── api.js               # API calls to Alfred backend
├── App.jsx                  # Main app component
├── App.css                  # App styles
├── main.jsx                 # Entry point
└── index.css                # Global styles
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Usage

1. **Make sure Alfred backend is running**:
   ```bash
   cd ../alfred
   python run_server.py
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Open browser** to `http://localhost:5173`

4. **Start chatting** with Alfred:
   - "Turn on bedroom lamp"
   - "What's the status of lights?"
   - "List all devices"

## Troubleshooting

### "Cannot connect to Alfred backend"

- Check that Alfred backend is running on `http://localhost:8000`
- Verify with: `curl http://localhost:8000/health`
- Check backend logs for errors

### CORS errors

- Alfred backend should have CORS enabled for `http://localhost:5173`
- Check `alfred/ai_server/main.py` CORS configuration

### Port already in use

- Change Vite port in `vite.config.js`:
  ```js
  export default {
    server: {
      port: 3000
    }
  }
  ```

## Next Steps

### Phase 2: Voice Input
- Add microphone button
- Implement MediaRecorder API
- Integrate with `/transcribe` endpoint

### Phase 3: Enhanced Features
- Chat history persistence (localStorage)
- Dark mode toggle
- Rich response formatting
- Settings panel

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool & dev server
- **Vanilla CSS** - Styling (no UI library for now)
- **Fetch API** - HTTP requests

## Contributing

This is part of the alfred smart home assistant project.
See `../alfred/CLAUDE.md` for development guidelines.

## License

Same as alfred project.