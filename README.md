# Lumina Sheets

An AI-powered spreadsheet application with real-time collaboration, intelligent data analysis, and visualization capabilities.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-blue.svg)](https://nodejs.org)
[![Vite](https://img.shields.io/badge/vite-%5E6.2.0-blue.svg)](https://vitejs.dev)
[![React](https://img.shields.io/badge/react-%5E19.2.0-blue.svg)](https://reactjs.org)

## Features

- 🤖 **AI-Powered Data Analysis**: Leverage Google Gemini AI to interpret data, generate insights, and create visualizations
- 📊 **Interactive Charts**: Create bar, line, area, and pie charts with Recharts
- 🤝 **Real-Time Collaboration**: Multi-user editing powered by Yjs and WebRTC
- 📈 **Data Visualization**: Generate insights and recommendations from your data
- 📥 **Excel Compatibility**: Import/export functionality using the xlsx library
- 🎨 **Modern UI**: Clean, responsive interface with dark mode
- 🔧 **Advanced Editing**: Sort, filter, add/remove rows and columns
- 🌐 **Multi-AI Support**: Works with both Google Gemini and OpenRouter models

## Demo

View the app in AI Studio: [https://ai.studio/apps/drive/1VUcdiZJAM_G7r1YyIVPJLzoDrwt9rGeS](https://ai.studio/apps/drive/1VUcdiZJAM_G7r1YyIVPJLzoDrwt9rGeS)

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- A Google Gemini API key (for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lumina-sheets
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory (you can copy from `.env.example`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SIGNALING_SERVER=wss://signaling-server.solar2004.deno.net
   VITE_SIGNALING_PASSWORD=your_signaling_password_here
   ```


4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:5173` to view the application.

## Usage

### Basic Operations

- **Add Rows/Columns**: Use the toolbar buttons to add new rows or columns
- **Edit Data**: Click on any cell to edit its content
- **Rename Columns**: Double-click on column headers to rename them
- **Sort Data**: Click on column header sort icons to sort data
- **Resize Columns**: Drag the right edge of column headers to resize

### AI Assistant

1. Open the AI chat panel by clicking the chat icon in the top right
2. Ask questions about your data such as:
   - "Analyze the sales trends"
   - "Add a profit margin column"
   - "Create a chart showing product sales"
   - "Generate 5 more rows of sample data"

### Collaboration

- Share the URL with others to collaborate in real-time
- Each collaborator will be assigned a unique color
- See other users' cursors and selections in real-time

### Import/Export

- **Import**: Click the "Import" button to upload Excel files (.xlsx, .xls, .csv)
- **Export**: Click the "Export" button to download your data as an Excel file
- **Save Chat**: Save your AI conversation history as a JSON file

## AI Providers

Lumina Sheets supports multiple AI providers:

### Google Gemini (Default)
- Built-in support with Google Search grounding
- Requires `GEMINI_API_KEY` environment variable

### OpenRouter
- Supports various models including Gemini, GPT, Claude, etc.
- Configure in the AI Settings panel:
  1. Click the settings icon in the top toolbar
  2. Select "OpenRouter" as the provider
  3. Enter your OpenRouter API key
  4. Select or enter a model ID (e.g., `google/gemini-2.0-flash-lite-preview-02-05:free`)

## Project Structure

```
.
├── components/
│   ├── ChartRenderer.tsx     # Renders charts using Recharts
│   └── Spreadsheet.tsx       # Main spreadsheet UI and logic
├── services/
│   ├── excelService.ts       # Handles Excel file operations (import/export)
│   └── geminiService.ts      # Manages communication with AI APIs
├── App.tsx                   # Root React component
├── index.html                # Entry HTML file
├── index.tsx                 # Application entry point
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Project metadata and dependencies
└── types.ts                  # TypeScript type definitions
```

## Available Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the production-ready application
- `npm run preview`: Preview the built application locally

## Technologies Used

- [React 19](https://reactjs.org) - Frontend library
- [Vite 6](https://vitejs.dev) - Build tool and development server
- [TypeScript](https://www.typescriptlang.org) - Typed JavaScript
- [Recharts](https://recharts.org) - Charting library
- [Lucide React](https://lucide.dev) - Icon library
- [Yjs](https://yjs.dev) - Real-time collaboration framework
- [y-webrtc](https://github.com/yjs/y-webrtc) - WebRTC connector for Yjs
- [@google/genai](https://ai.google.dev) - Google Generative AI SDK
- [xlsx](https://github.com/SheetJS/sheetjs) - Excel file processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to Google for providing the Gemini AI platform
- Thanks to the open-source community for the amazing libraries used in this project