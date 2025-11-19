
import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import {
  FileSpreadsheet,
  MessageSquare,
  Download,
  Upload,
  Send,
  Sparkles,
  Save,
  X,
  Undo2,
  Redo2,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  BarChart3,
  Terminal,
  Users,
  Link as LinkIcon,
  Wifi,
  WifiOff,
  Trash2,
  Settings,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';

import { DEFAULT_DATA, RowData, ChatMessage, AIActionType, InsightData, GalleryItem, ChartConfig, Collaborator, AIConfig, AIProvider, TurnConfig } from './types';
import Spreadsheet from './components/Spreadsheet';
import ChartRenderer from './components/ChartRenderer';
import { generateResponse } from './services/geminiService';
import { exportToExcel, parseExcelFile, exportAiSession } from './services/excelService';
import { autoFormatData } from './utils/autoFormatter';
import NotificationCenter, { Notification } from './components/NotificationCenter';

// Helper to generate random user colors
const getRandomColor = () => {
  const colors = ['#f28b82', '#fdd663', '#81c995', '#8ab4f8', '#c58af9', '#e6c9a8', '#e8eaed'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getRandomName = () => {
  const names = ['Anonymous Axolotl', 'Busy Beaver', 'Curious Cat', 'Daring Dog', 'Eager Eagle', 'Funny Fox'];
  return names[Math.floor(Math.random() * names.length)];
};

// Helper to generate random room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 12; i++) { // Increased from 8 to 12 for lower collision probability
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Maximum users per room
const MAX_USERS = 10;

// Helper to download chart as PNG
const downloadChartAsPng = (chartId: string, title: string) => {
  const svgElement = document.querySelector(`#${chartId} .recharts-wrapper svg`) as SVGSVGElement;

  if (!svgElement) {
    alert("Could not locate chart element.");
    return;
  }

  // Serialize SVG to XML
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  // Create a canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Get dimensions
  const rect = svgElement.getBoundingClientRect();
  canvas.width = rect.width * 2; // 2x for retina/quality
  canvas.height = rect.height * 2;

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    if (ctx) {
      ctx.fillStyle = '#252629'; // Background color match
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);

      // Download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${title.replace(/\s+/g, '_')}_chart.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      URL.revokeObjectURL(url);
    }
  };
  img.src = url;
};

// Component: Cursor Overlay (Shows other users' cursors)
const CursorOverlay: React.FC<{ collaborators: Collaborator[] }> = ({ collaborators }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {collaborators.map(collab => collab.cursor && (
        <div
          key={collab.clientId}
          style={{
            position: 'absolute',
            left: collab.cursor.x,
            top: collab.cursor.y,
            transform: 'translate(-4px, -4px)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Modern Cursor Icon */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Shadow */}
            <g filter="url(#shadow)">
              {/* Main cursor shape with gradient */}
              <path
                d="M5 3L5 21L9.5 16.5L12 24L15 23L12.5 15.5L19 15.5L5 3Z"
                fill={collab.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </g>
            {/* Subtle highlight */}
            <path
              d="M7 5L7 17L10 14L11.5 19L13 18.5L11.5 13.5L16 13.5L7 5Z"
              fill="white"
              opacity="0.3"
            />
            <defs>
              <filter id="shadow" x="0" y="0" width="28" height="32" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="2" />
                <feGaussianBlur stdDeviation="2" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
              </filter>
            </defs>
          </svg>
          {/* User label with improved styling */}
          <div
            className="absolute top-6 left-6 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: collab.color,
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {collab.name}
          </div>
        </div>
      ))}
    </div>
  );
};

// Reusable components for layout
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'icon' | 'danger' | 'success' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20 px-4 py-2 active:scale-95",
    secondary: "bg-[#3c4043] text-gray-200 hover:bg-[#4a4e51] border border-gray-600 px-4 py-2",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-900/20 px-4 py-2 active:scale-95",
    danger: "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/50 px-4 py-2 active:scale-95",
    icon: "h-9 w-9 hover:bg-[#3c4043] text-gray-400 hover:text-white rounded-full"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Component: Insight View (Reusable)
const InsightView: React.FC<{ data: InsightData }> = ({ data }) => (
  <div className="space-y-6 p-4">
    {/* Summary Section */}
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Executive Summary</h3>
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-blue-100 shadow-inner">
        <p className="text-sm leading-relaxed">{data.summary}</p>
      </div>
    </div>

    {/* Key Stats Grid */}
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Key Metrics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.keyStats.map((stat, idx) => (
          <div key={idx} className="bg-[#303134] p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              {stat.trend === 'up' ? <TrendingUp size={32} /> : stat.trend === 'down' ? <TrendingDown size={32} /> : <Minus size={32} />}
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">{stat.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white tracking-tight truncate">{stat.value}</span>
              <div className={`flex items-center text-[10px] font-bold mb-1.5 px-1 py-0.5 rounded ${stat.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                stat.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                {stat.trend === 'up' && <TrendingUp size={10} className="mr-1" />}
                {stat.trend === 'down' && <TrendingDown size={10} className="mr-1" />}
                {stat.trend?.toUpperCase() || 'NEUTRAL'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recommendation */}
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Recommendation</h3>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
        <p className="text-sm text-gray-300 italic border-l-4 border-blue-500 pl-4">{data.recommendation}</p>
      </div>
    </div>
  </div>
);

// Component: Gallery Expanded Modal
const GalleryModal: React.FC<{
  item: GalleryItem,
  data: RowData[],
  onClose: () => void,
  onDelete: (id: string) => void
}> = ({ item, data, onClose, onDelete }) => {
  const chartId = `chart-export-${item.id}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#202124] border border-gray-700 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-[#2a2b2e] to-[#202124]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.type === 'chart' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {item.type === 'chart' ? <BarChart3 size={20} /> : <Lightbulb size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.type === 'chart' && (
              <Button variant="secondary" className="h-8 text-xs" onClick={() => downloadChartAsPng(chartId, item.title)}>
                <ImageIcon size={14} className="mr-2" /> Save as PNG
              </Button>
            )}
            <Button variant="danger" className="h-8 text-xs" onClick={() => onDelete(item.id)}>
              <Trash2 size={14} className="mr-1" /> Delete
            </Button>
            <div className="w-[1px] h-6 bg-gray-700 mx-1"></div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-[#1e1f20]">
          {item.type === 'chart' ? (
            <div className="h-[500px] w-full">
              <ChartRenderer id={chartId} config={item.data as ChartConfig} data={data} className="w-full h-full" />
            </div>
          ) : (
            <InsightView data={item.data as InsightData} />
          )}
        </div>
      </div>
    </div>
  );
};

// Component: Settings Modal
const SettingsModal: React.FC<{
  config: AIConfig,
  turnConfig: TurnConfig,
  onSave: (cfg: AIConfig) => void,
  onSaveTurn: (cfg: TurnConfig) => void,
  onClose: () => void
}> = ({ config, turnConfig, onSave, onSaveTurn, onClose }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [localTurnConfig, setLocalTurnConfig] = useState(turnConfig);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#202124] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#2a2b2e]">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-300" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">AI Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase">AI Provider</label>
            <div className="flex bg-[#151618] p-1 rounded-lg border border-gray-700">
              <button
                onClick={() => setLocalConfig({ ...localConfig, provider: 'gemini' })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${localConfig.provider === 'gemini' ? 'bg-[#303134] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Google Gemini
              </button>
              <button
                onClick={() => setLocalConfig({ ...localConfig, provider: 'openrouter' })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${localConfig.provider === 'openrouter' ? 'bg-[#303134] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                OpenRouter
              </button>
            </div>
          </div>

          {/* Gemini Info */}
          {localConfig.provider === 'gemini' && (
            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3">
              <div className="flex gap-2 text-blue-300">
                <Sparkles size={16} className="mt-0.5" />
                <div className="text-xs leading-relaxed">
                  Using built-in Google Gemini API. <br />
                  <span className="opacity-70">Fast, reliable, and supports Google Search grounding.</span>
                </div>
              </div>
            </div>
          )}

          {/* OpenRouter Fields */}
          {localConfig.provider === 'openrouter' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">OpenRouter API Key</label>
                <input
                  type="password"
                  className="w-full bg-[#151618] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  placeholder="sk-or-..."
                  value={localConfig.openRouterKey}
                  onChange={(e) => setLocalConfig({ ...localConfig, openRouterKey: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Model ID</label>
                <input
                  type="text"
                  className="w-full bg-[#151618] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 font-mono"
                  placeholder="google/gemini-2.0-flash-lite-preview-02-05:free"
                  value={localConfig.openRouterModel}
                  onChange={(e) => setLocalConfig({ ...localConfig, openRouterModel: e.target.value })}
                />
                <p className="text-[10px] text-gray-500">Examples: <code className="bg-black/30 px-1 rounded">google/gemini-2.0-flash-lite-preview-02-05:free</code>, <code className="bg-black/30 px-1 rounded">openrouter/sherlock-dash-alpha</code></p>
              </div>
            </div>
          )}

          {/* AI Features Section */}
          <div className="space-y-2 pt-4 border-t border-gray-700">
            <label className="text-xs font-medium text-gray-400 uppercase">AI Features</label>

            {/* Auto-Format Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#151618] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Auto-Formatting</div>
                <div className="text-xs text-gray-400 mt-0.5">Automatically format currencies, percentages, and dates</div>
              </div>
              <button
                onClick={() => setLocalConfig({ ...localConfig, autoFormat: !localConfig.autoFormat })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.autoFormat ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.autoFormat ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* Smart Filters Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#151618] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Smart Filters</div>
                <div className="text-xs text-gray-400 mt-0.5">Filter data using natural language commands</div>
              </div>
              <button
                onClick={() => setLocalConfig({ ...localConfig, smartFilters: !localConfig.smartFilters })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.smartFilters ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.smartFilters ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Network Configuration Section */}
          <div className="space-y-2 pt-4 border-t border-gray-700">
            <label className="text-xs font-medium text-gray-400 uppercase">Network Configuration</label>

            {/* Info about STUN */}
            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3 mb-3">
              <div className="flex gap-2 text-blue-300">
                <Wifi size={16} className="mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong>STUN servers</strong> are pre-configured for NAT traversal. <br />
                  <span className="opacity-70">Add a TURN server below for strict firewalls or VPN users.</span>
                </div>
              </div>
            </div>

            {/* TURN Enable Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#151618] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-medium text-white">TURN Server (Advanced)</div>
                <div className="text-xs text-gray-400 mt-0.5">Use relay server for strict firewall environments</div>
              </div>
              <button
                onClick={() => setLocalTurnConfig({ ...localTurnConfig, enabled: !localTurnConfig.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localTurnConfig.enabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localTurnConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* TURN Configuration Fields */}
            {localTurnConfig.enabled && (
              <div className="space-y-3 pl-3 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">TURN Server URL</label>
                  <input
                    type="text"
                    className="w-full bg-[#151618] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 font-mono"
                    placeholder="turn:a.relay.metered.ca:80"
                    value={localTurnConfig.urls}
                    onChange={(e) => setLocalTurnConfig({ ...localTurnConfig, urls: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-500">Example: turn:your-server.com:3478</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Username</label>
                  <input
                    type="text"
                    className="w-full bg-[#151618] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                    placeholder="your-username"
                    value={localTurnConfig.username || ''}
                    onChange={(e) => setLocalTurnConfig({ ...localTurnConfig, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Credential</label>
                  <input
                    type="password"
                    className="w-full bg-[#151618] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                    placeholder="your-credential"
                    value={localTurnConfig.credential || ''}
                    onChange={(e) => setLocalTurnConfig({ ...localTurnConfig, credential: e.target.value })}
                  />
                </div>
                <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-2">
                  <p className="text-[10px] text-yellow-300">
                    💡 Get free TURN at <a href="https://www.metered.ca/tools/openrelay/" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-200">metered.ca</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 bg-[#2a2b2e] flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(localConfig); onSaveTurn(localTurnConfig); onClose(); }}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

function App() {
  // --- Yjs Collaboration State ---
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected'>('disconnected');
  const [roomName, setRoomName] = useState('');
  const [roomFull, setRoomFull] = useState(false);

  // --- App State (Synced via Yjs) ---
  const [data, setData] = useState<RowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Local-only state
  const [filename, setFilename] = useState<string>("Untitled Project");
  const [expandedGalleryItem, setExpandedGalleryItem] = useState<GalleryItem | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [localUser, setLocalUser] = useState({ name: getRandomName(), color: getRandomColor() });
  const [showSettings, setShowSettings] = useState(false);

  // Pending Action State (Local Only - Confirmation before broadcast)
  const [pendingUpdate, setPendingUpdate] = useState<{ payload: RowData[], description: string } | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // AI Settings State (Persisted in LocalStorage)
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('lumina_ai_config');
    return saved ? JSON.parse(saved) : {
      provider: 'gemini',
      openRouterKey: '',
      openRouterModel: 'google/gemini-2.0-flash-lite-preview-02-05:free',
      autoFormat: true,  // Enabled by default
      smartFilters: true  // Enabled by default
    };
  });

  // TURN Server Configuration (Persisted in LocalStorage)
  const [turnConfig, setTurnConfig] = useState<TurnConfig>(() => {
    const saved = localStorage.getItem('lumina_turn_config');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      urls: 'turn:a.relay.metered.ca:80',
      username: '',
      credential: ''
    };
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    console.log('🚀 [LUMINA] Initializing collaboration system...');

    // Log environment variables (masked password for security)
    const signalingServer = import.meta.env.VITE_SIGNALING_SERVER || 'wss://signaling-server.solar2004.deno.net';
    const signalingPassword = import.meta.env.VITE_SIGNALING_PASSWORD || 'lorianthelaw1469';

    console.log('📡 [CONFIG] Signaling Server:', signalingServer);
    console.log('🔑 [CONFIG] Password Set:', signalingPassword ? `Yes (${signalingPassword.substring(0, 3)}***${signalingPassword.substring(signalingPassword.length - 3)})` : 'No');
    console.log('🌍 [ENV] import.meta.env.VITE_SIGNALING_SERVER:', import.meta.env.VITE_SIGNALING_SERVER);
    console.log('🌍 [ENV] import.meta.env.VITE_SIGNALING_PASSWORD:', import.meta.env.VITE_SIGNALING_PASSWORD ? 'SET' : 'NOT SET');
    console.log('🌍 [ENV] MODE:', import.meta.env.MODE);
    console.log('🌍 [ENV] DEV:', import.meta.env.DEV);
    console.log('🌍 [ENV] PROD:', import.meta.env.PROD);

    // Generate room code if not provided
    console.log('🔍 [URL] Current URL:', window.location.href);
    console.log('🔍 [URL] Search params:', window.location.search);
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');
    console.log('🔍 [ROOM] Param from URL:', room);

    if (!room) {
      room = generateRoomCode();
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', room);
      window.history.pushState({}, '', newUrl.toString());
      console.log('🎲 [ROOM] Generated new room:', room);
      console.log('🎲 [ROOM] Updated URL to:', newUrl.toString());
    } else {
      console.log('✅ [ROOM] Using room from URL:', room);
    }
    setRoomName(room);
    console.log('🏠 [ROOM] Room Name SET TO:', room);

    try {
      console.log('🔌 [WEBRTC] Creating WebrtcProvider...');

      // CRITICAL: Monkey-patch window.WebSocket - y-webrtc ignores WebSocketPolyfill!
      // This patch MUST remain active for the entire session to prevent reconnection auth failures
      const OriginalWebSocket = window.WebSocket;

      (window as any).WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          const urlStr = url.toString();

          // Only patch OUR signaling server
          if (urlStr.includes('signaling-server') && urlStr.includes('solar2004.deno.net')) {
            console.log(`🔐 [WS] Patching connection to: ${urlStr}`);
            console.log(`🔐 [WS] Using password: ${signalingPassword.substring(0, 3)}***`);
            super(url, signalingPassword); // FORCE password

            this.addEventListener('open', () => {
              console.log('✅ [WS] CONNECTED with auth! Protocol:', (this as any).protocol);
            });

            this.addEventListener('close', (e) => {
              console.warn(`⚠️ [WS] CLOSED: code=${e.code}`);
            });
          } else {
            // Not our server
            super(url, protocols as any);
          }
        }
      };

      // Build ICE servers array
      const iceServers: RTCIceServer[] = [
        // Google STUN Servers (Free & Reliable)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ];

      // Add TURN server if configured
      if (turnConfig.enabled && turnConfig.urls && turnConfig.username && turnConfig.credential) {
        iceServers.push({
          urls: turnConfig.urls,
          username: turnConfig.username,
          credential: turnConfig.credential
        });
        console.log('🔄 [TURN] TURN server configured:', turnConfig.urls);
      }

      // Create provider - will use patched WebSocket
      const newProvider = new WebrtcProvider(room, doc, {
        signaling: [signalingServer],
        peerOpts: {
          config: {
            iceServers
          }
        }
      });

      // DO NOT RESTORE WebSocket - keep the patch active to prevent reconnection failures!

      console.log('✅ [WEBRTC] WebrtcProvider created successfully');
      console.log('📊 [WEBRTC] Provider details:', {
        roomName: room,
        signalingUrls: [signalingServer],
        hasPassword: !!signalingPassword
      });

      setProvider(newProvider);

      const yDataArray = doc.getArray('data');
      const yColumnsArray = doc.getArray('columns');
      const yChatArray = doc.getArray('chat');
      const yGalleryArray = doc.getArray('gallery');
      const yMeta = doc.getMap('meta'); // Metadata map for initialization flag

      // Listen to connection events
      console.log('👂 [WEBRTC] Setting up event listeners...');

      // Monitor signaling connection status
      if (newProvider.signalingConns) {
        newProvider.signalingConns.forEach((conn, index) => {
          console.log(`🔗 [SIGNALING ${index}] Attempting connection to:`, signalingServer);

          conn.on('connect', () => {
            console.log(`✅ [SIGNALING ${index}] Connected successfully!`);
          });

          conn.on('disconnect', () => {
            console.warn(`⚠️ [SIGNALING ${index}] Disconnected`);
          });

          conn.on('error', (error: any) => {
            console.error(`❌ [SIGNALING ${index}] Error:`, error);
          });
        });
      }

      // Initialize Data - Works for both single and multi-user scenarios
      const initializeDataIfNeeded = () => {
        const hasBeenInitialized = yMeta.get('initialized');

        if (!hasBeenInitialized && yDataArray.length === 0) {
          console.log('📝 [INIT] Initializing data...');

          // Try to load from localStorage first
          const savedData = localStorage.getItem(`lumina_data_${room}`);
          const savedChat = localStorage.getItem(`lumina_chat_${room}`);
          const savedGallery = localStorage.getItem(`lumina_gallery_${room}`);

          doc.transact(() => {
            // Set flag atomically WITHIN the transaction
            yMeta.set('initialized', true);

            if (savedData) {
              // Load saved data
              console.log('💾 [INIT] Loading saved data from localStorage');
              const parsedData = JSON.parse(savedData);
              parsedData.forEach((row: RowData) => yDataArray.push([row]));
              if (parsedData.length > 0) {
                Object.keys(parsedData[0]).forEach(col => yColumnsArray.push([col]));
              }
            } else {
              // Populate with default data
              console.log('📝 [INIT] Using default data');
              DEFAULT_DATA.forEach(row => yDataArray.push([row]));
              Object.keys(DEFAULT_DATA[0]).forEach(col => yColumnsArray.push([col]));
            }

            if (savedChat) {
              // Load saved chat
              console.log('💬 [INIT] Loading saved chat from localStorage');
              const parsedChat = JSON.parse(savedChat);
              parsedChat.forEach((msg: ChatMessage) => yChatArray.push([msg]));
            } else {
              // Default welcome message
              yChatArray.push([{
                id: 'welcome',
                role: 'model',
                text: 'Hello! I am Lumina. I am synced via WebRTC. Ask me to analyze trends, clean data, or generate new rows.',
                timestamp: Date.now()
              }]);
            }

            if (savedGallery) {
              // Load saved gallery
              console.log('🖼️ [INIT] Loading saved gallery from localStorage');
              const parsedGallery = JSON.parse(savedGallery);
              parsedGallery.forEach((item: GalleryItem) => yGalleryArray.push([item]));
            }
          });
          console.log('✅ [INIT] Data initialized');
          setConnectionStatus('connected');
        } else {
          console.log('📊 [INIT] Data already exists, skipping initialization');
          setConnectionStatus('connected');
        }
      };

      // Listen to synced event (for multi-user rooms)
      newProvider.on('synced', (synced: any) => {
        console.log('🔄 [SYNC] Sync event fired, synced:', synced);
        if (synced) {
          initializeDataIfNeeded();
        }
      });

      // Timeout fallback for single-user rooms (synced may not fire immediately)
      const initTimeout = setTimeout(() => {
        console.log('⏰ [TIMEOUT] Initializing after timeout (single-user or slow sync)');
        initializeDataIfNeeded();
      }, 2000); // Wait 2 seconds

      // Store timeout to clear on cleanup
      const timeoutToClear = initTimeout;

      console.log('✅ [LUMINA] Initialization complete!');

      // Bind Yjs Types to React State with Notifications
      let lastDataLength = yDataArray.length;
      let lastChatLength = yChatArray.length;

      yDataArray.observe((event) => {
        setData(yDataArray.toArray() as RowData[]);

        // Create notification for remote changes only AND when there are collaborators
        if (event.transaction.origin !== doc.clientID) {
          // Get user name from awareness
          const states = newProvider.awareness.getStates();
          let userName = 'Someone';
          let hasCollaborators = false;

          states.forEach((state: any, clientId: number) => {
            if (clientId !== doc.clientID && state.user) {
              hasCollaborators = true;
              if (clientId === event.transaction.origin) {
                userName = state.user.name;
              }
            }
          });

          // Only show notification if there are other users
          if (hasCollaborators) {
            if (yDataArray.length > lastDataLength) {
              addNotification({
                type: 'data',
                user: userName,
                message: `added ${yDataArray.length - lastDataLength} row(s)`
              });
            } else if (yDataArray.length < lastDataLength) {
              addNotification({
                type: 'data',
                user: userName,
                message: `deleted ${lastDataLength - yDataArray.length} row(s)`
              });
            } else {
              addNotification({
                type: 'data',
                user: userName,
                message: 'updated the spreadsheet'
              });
            }
          }
        }
        lastDataLength = yDataArray.length;
      });

      yColumnsArray.observe(() => setColumns(yColumnsArray.toArray() as string[]));

      yChatArray.observe((event) => {
        setChatHistory(yChatArray.toArray() as ChatMessage[]);

        // Notification for new chat messages (from others) AND when there are collaborators
        if (event.transaction.origin !== doc.clientID && yChatArray.length > lastChatLength) {
          // Check if there are collaborators
          const states = newProvider.awareness.getStates();
          let hasCollaborators = false;
          let userName = 'Collaborator';

          states.forEach((state: any, clientId: number) => {
            if (clientId !== doc.clientID && state.user) {
              hasCollaborators = true;
              if (clientId === event.transaction.origin) {
                userName = state.user.name;
              }
            }
          });

          if (hasCollaborators) {
            const messages = yChatArray.toArray() as ChatMessage[];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'user') {
              addNotification({
                type: 'chat',
                user: userName,
                message: `sent a message: "${lastMessage.text.substring(0, 30)}..."`
              });
            }
          }
        }
        lastChatLength = yChatArray.length;
      });

      yGalleryArray.observe(() => setGalleryItems(yGalleryArray.toArray() as GalleryItem[]));

      // Initial State Sync
      setData(yDataArray.toArray() as RowData[]);
      setColumns(yColumnsArray.toArray() as string[]);
      setChatHistory(yChatArray.toArray() as ChatMessage[]);
      setGalleryItems(yGalleryArray.toArray() as GalleryItem[]);

      console.log('📚 [DATA] Initial state loaded:', {
        rows: yDataArray.length,
        columns: yColumnsArray.length,
        chatMessages: yChatArray.length,
        galleryItems: yGalleryArray.length
      });

      // UndoManager
      const um = new Y.UndoManager([yDataArray, yColumnsArray], {
        trackedOrigins: new Set([doc.clientID, null]), // Track changes from local and others (optional, usually just local)
      });
      setUndoManager(um);

      // Awareness (Presence)
      newProvider.awareness.setLocalStateField('user', localUser);
      console.log('👤 [PRESENCE] Local user set:', localUser.name);

      let previousCollaboratorCount = 0;
      let previousCollaboratorNames = new Set<string>();

      newProvider.awareness.on('change', () => {
        const states = newProvider.awareness.getStates();
        const activeUsers: Collaborator[] = [];
        let totalUsers = 0;

        states.forEach((state: any, clientId: number) => {
          if (state.user) {
            totalUsers++;
            if (clientId !== doc.clientID) {
              activeUsers.push({
                clientId,
                name: state.user.name,
                color: state.user.color,
                selection: state.selection,
                cursor: state.cursor
              });
            }
          }
        });

        // Track user joins/leaves
        const currentNames = new Set(activeUsers.map(u => u.name));

        // User joined
        currentNames.forEach(name => {
          if (!previousCollaboratorNames.has(name)) {
            addNotification({
              type: 'user',
              user: name,
              message: 'joined the room'
            });
          }
        });

        // User left
        previousCollaboratorNames.forEach(name => {
          if (!currentNames.has(name)) {
            addNotification({
              type: 'user',
              user: name,
              message: 'left the room'
            });
          }
        });

        previousCollaboratorCount = activeUsers.length;
        previousCollaboratorNames = currentNames;

        setCollaborators(activeUsers);
        console.log('👥 [PRESENCE] Active collaborators:', activeUsers.length, activeUsers.map(u => u.name));
        console.log('📊 [USERS] Total users in room:', totalUsers);

        // Check room capacity
        if (totalUsers > MAX_USERS) {
          console.error('🚫 [LIMIT] Room is full! Disconnecting...');
          setRoomFull(true);
          newProvider.disconnect();
        }
      });

      console.log('✅ [LUMINA] Initialization complete!');

      return () => {
        console.log('🔌 [CLEANUP] Disconnecting provider...');
        clearTimeout(timeoutToClear);
        newProvider.disconnect();
        newProvider.destroy();
        doc.destroy();
        console.log('✅ [CLEANUP] Cleanup complete');
      };
    } catch (error) {
      console.error('💥 [ERROR] Fatal error during initialization:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      setConnectionStatus('disconnected');
    }
  }, []);

  // Mouse tracking for cursor sharing
  useEffect(() => {
    if (!provider) return;

    let lastUpdate = 0;
    const THROTTLE_MS = 50; // Update cursor every 50ms max

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;

      lastUpdate = now;
      provider.awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      // Clear cursor when leaving
      provider.awareness.setLocalStateField('cursor', null);
    };
  }, [provider]);

  // Persist data to localStorage (per room)
  useEffect(() => {
    if (!roomName || data.length === 0) return;
    const key = `lumina_data_${roomName}`;
    localStorage.setItem(key, JSON.stringify(data));
  }, [data, roomName]);

  // Persist chat to localStorage (per room)
  useEffect(() => {
    if (!roomName || chatHistory.length === 0) return;
    const key = `lumina_chat_${roomName}`;
    localStorage.setItem(key, JSON.stringify(chatHistory));
  }, [chatHistory, roomName]);

  // Persist gallery to localStorage (per room)
  useEffect(() => {
    if (!roomName) return;
    const key = `lumina_gallery_${roomName}`;
    localStorage.setItem(key, JSON.stringify(galleryItems));
  }, [galleryItems, roomName]);

  // Filename persistence with ref to prevent initial save
  const filenameLoadedRef = useRef(false);
  const currentRoomRef = useRef(roomName);

  // Load filename when room changes
  useEffect(() => {
    if (!roomName) return;

    const key = `lumina_filename_${roomName}`;
    const saved = localStorage.getItem(key);

    filenameLoadedRef.current = false; // Reset flag

    if (saved) {
      console.log('📝 [FILENAME] Loading saved filename:', saved);
      setFilename(saved);
    } else {
      console.log('📝 [FILENAME] No saved filename, using default');
      setFilename("Untitled Project");
    }

    // Mark as loaded after a short delay to allow setFilename to complete
    setTimeout(() => {
      filenameLoadedRef.current = true;
      currentRoomRef.current = roomName;
    }, 100);
  }, [roomName]); // Only run when roomName changes

  // Save filename only after it's been loaded and user changes it
  useEffect(() => {
    if (!roomName || !filenameLoadedRef.current || currentRoomRef.current !== roomName) return;

    const key = `lumina_filename_${roomName}`;
    localStorage.setItem(key, filename);
    console.log('💾 [FILENAME] Saved:', filename);
  }, [filename, roomName]);

  // Scroll Chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, showChat, pendingUpdate]);

  // Save AI Config
  useEffect(() => {
    localStorage.setItem('lumina_ai_config', JSON.stringify(aiConfig));
  }, [aiConfig]);

  // Save TURN Config
  useEffect(() => {
    localStorage.setItem('lumina_turn_config', JSON.stringify(turnConfig));
  }, [turnConfig]);

  // --- Handlers (Update Yjs) ---

  const updateData = (newData: RowData[], newColumns?: string[]) => {
    doc.transact(() => {
      const yDataArray = doc.getArray('data');
      const yColumnsArray = doc.getArray('columns');

      // Update Columns if needed
      if (newColumns) {
        yColumnsArray.delete(0, yColumnsArray.length);
        yColumnsArray.push(newColumns);
      }

      // Update Data (Full Replace strategy for simplicity with small datasets)
      yDataArray.delete(0, yDataArray.length);
      yDataArray.push(newData);
    });
  };

  const updateSelection = (selection: { row: number, col: string } | null) => {
    provider?.awareness.setLocalStateField('selection', selection);
  };

  const addChatMessage = (msg: ChatMessage) => {
    doc.transact(() => {
      doc.getArray('chat').push([msg]);
    });
  };

  // Notification Helpers
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random(),
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20)); // Keep last 20
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const addGalleryItem = (item: GalleryItem) => {
    doc.transact(() => {
      const arr = doc.getArray('gallery');
      arr.insert(0, [item]); // Prepend
    });
  };

  const deleteGalleryItem = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item? This will remove it for all collaborators.")) return;

    // If the deleted item is the one currently expanded, close the modal.
    if (expandedGalleryItem?.id === id) {
      setExpandedGalleryItem(null);
    }

    doc.transact(() => {
      const arr = doc.getArray('gallery');
      let indexToDelete = -1;
      const items = arr.toArray() as GalleryItem[];
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          indexToDelete = i;
          break;
        }
      }
      if (indexToDelete !== -1) {
        arr.delete(indexToDelete, 1);
      }
    });
  };

  const handleUndo = () => {
    undoManager?.undo();
  };

  const handleRedo = () => {
    undoManager?.redo();
  };

  const resetChat = () => {
    if (!window.confirm("Are you sure you want to reset the chat? This will clear all messages for this room.")) return;

    doc.transact(() => {
      const arr = doc.getArray('chat');
      // Clear all messages
      arr.delete(0, arr.length);
      // Add welcome message
      arr.push([{
        id: 'welcome-' + Date.now(),
        role: 'model',
        text: 'Hello! I am Lumina. Chat has been reset. Ask me to analyze trends, clean data, or generate new rows.',
        timestamp: Date.now()
      }]);
    });

    // Clear localStorage for this room
    if (roomName) {
      localStorage.removeItem(`lumina_chat_${roomName}`);
    }
  };

  const handleDataUpdate = (newData: RowData[], newColumns?: string[]) => {
    // Apply auto-formatting if enabled
    let processedData = newData;
    if (aiConfig.autoFormat) {
      processedData = autoFormatData(newData) as RowData[];
    }

    // Logic to merge columns if not provided
    let finalCols = newColumns ? [...newColumns] : [...columns];
    if (!newColumns && processedData.length > 0) {
      const allKeys = new Set<string>();
      processedData.forEach(row => {
        if (row) Object.keys(row).forEach(k => allKeys.add(k));
      });
      const currentSet = new Set(columns);
      const newKeys = Array.from(allKeys).filter(k => !currentSet.has(k));
      finalCols = [...columns.filter(c => allKeys.has(c)), ...newKeys];
    } else if (!newColumns && processedData.length === 0) {
      finalCols = columns;
    }
    updateData(processedData, finalCols);
  };

  // Pending Action Handlers
  const confirmPendingUpdate = () => {
    if (pendingUpdate) {
      handleDataUpdate(pendingUpdate.payload);
      addChatMessage({
        id: Date.now().toString(),
        role: 'model',
        text: '✅ Changes applied successfully.',
        timestamp: Date.now()
      });
      setPendingUpdate(null);
    }
  };

  const discardPendingUpdate = () => {
    if (pendingUpdate) {
      addChatMessage({
        id: Date.now().toString(),
        role: 'model',
        text: '❌ Changes discarded.',
        timestamp: Date.now()
      });
      setPendingUpdate(null);
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseExcelFile(file);
      if (parsedData && parsedData.length > 0) {
        updateData(parsedData, Object.keys(parsedData[0]));
        setFilename(file.name.replace(/\.[^/.]+$/, ""));
        addChatMessage({
          id: Date.now().toString(),
          role: 'model',
          text: `Successfully imported ${file.name} with ${parsedData.length} rows.`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(error);
      alert("Error parsing Excel file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to convert cell reference (e.g., "A1") to coordinates
  const cellToCoordinates = (cellRef: string): { row: number, colIndex: number } | null => {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const colStr = match[1];
    const rowStr = match[2];

    let colIndex = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
    }
    colIndex -= 1; // 0-based

    const row = parseInt(rowStr) - 1; // 0-based
    return { row, colIndex };
  };

  const handleFormulaFixRequest = async (row: number, col: string, formula: string, error: string) => {
    // Open chat if closed
    if (!showChat) setShowChat(true);

    const prompt = `I have a formula error in cell ${col}${row + 1}.
Formula: ${formula}
Error: ${error}
Please fix this formula for me.`;

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: prompt,
      timestamp: Date.now()
    };
    addChatMessage(userMsg);
    setIsThinking(true);

    // Call AI
    const apiHistory = chatHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await generateResponse(prompt, data, columns, apiHistory, aiConfig);
    setIsThinking(false);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      timestamp: Date.now(),
      groundingUrls: response.groundingUrls
    };

    addChatMessage(modelMsg);

    // Process Actions
    const actionsToProcess = response.actions || (response.action !== AIActionType.NONE ? [{ type: response.action, payload: response.payload }] : []);

    if (actionsToProcess.length > 0) {
      // We'll apply formula fixes directly
      const newData = [...data];
      let hasUpdates = false;

      actionsToProcess.forEach(action => {
        if (action.type === AIActionType.CREATE_FORMULA && action.payload) {
          const { cell, formula: newFormula } = action.payload;
          const coords = cellToCoordinates(cell);

          if (coords) {
            const { row, colIndex } = coords;
            if (colIndex < columns.length && row < newData.length) {
              const colName = columns[colIndex];
              const newRow = { ...newData[row] };
              newRow[colName] = newFormula;
              newData[row] = newRow;
              hasUpdates = true;
            }
          }
        }
      });

      if (hasUpdates) {
        updateData(newData);
        addChatMessage({
          id: Date.now().toString() + '-fix',
          role: 'model',
          text: '✅ I have applied the formula fixes.',
          timestamp: Date.now()
        });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };

    addChatMessage(userMsg);
    setInputMessage("");
    setIsThinking(true);

    // Only send text history to AI to save tokens
    const apiHistory = chatHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // PASS AI CONFIG TO SERVICE
    const response = await generateResponse(userMsg.text, data, columns, apiHistory, aiConfig);

    setIsThinking(false);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      timestamp: Date.now(),
      groundingUrls: response.groundingUrls
    };

    addChatMessage(modelMsg);

    // Handle Actions
    const actionsToProcess = response.actions || (response.action !== AIActionType.NONE ? [{ type: response.action, payload: response.payload }] : []);

    // We need to handle updates carefully. 
    // If there's an UPDATE_DATA, it overrides everything.
    // If there are CREATE_FORMULA actions, we can batch them.

    let pendingDataUpdate: RowData[] | null = null;
    let pendingDescription = "";

    // Check for UPDATE_DATA first as it's the most destructive
    const updateAction = actionsToProcess.find(a => a.type === AIActionType.UPDATE_DATA);
    if (updateAction) {
      setPendingUpdate({
        payload: updateAction.payload,
        description: response.text
      });
      return; // Stop processing other actions if we have a full data update pending
    }

    // Handle other actions
    const formulaUpdates: { row: number, col: string, val: string }[] = [];

    actionsToProcess.forEach(action => {
      if (action.type === AIActionType.CREATE_CHART && action.payload) {
        // Attach chart to message (visual only in chat for now, but also add to gallery)
        // We can't easily attach to the existing message object in state without updating it.
        // But we can add a gallery item.
        addGalleryItem({
          id: Date.now().toString() + Math.random(),
          type: 'chart',
          title: action.payload.title || 'New Chart',
          timestamp: Date.now(),
          data: action.payload
        });

        // Also update the chat message to show it has a chart? 
        // The current implementation adds it to gallery.
        // Let's keep it simple.

      } else if (action.type === AIActionType.SHOW_INSIGHTS && action.payload) {
        const item: GalleryItem = {
          id: Date.now().toString() + Math.random(),
          type: 'insight',
          title: 'Analysis Result',
          timestamp: Date.now(),
          data: action.payload
        };
        addGalleryItem(item);
        setExpandedGalleryItem(item);

      } else if (action.type === AIActionType.CREATE_FORMULA && action.payload) {
        const { cell, formula } = action.payload;
        const coords = cellToCoordinates(cell);
        if (coords) {
          const { row, colIndex } = coords;
          if (colIndex < columns.length) {
            formulaUpdates.push({ row, col: columns[colIndex], val: formula });
          }
        }
      }
    });

    // Apply formula updates if any
    if (formulaUpdates.length > 0) {
      const newData = [...data];
      // Ensure rows exist
      const maxRow = Math.max(...formulaUpdates.map(u => u.row));
      while (newData.length <= maxRow) {
        const newRow: RowData = {};
        columns.forEach(c => newRow[c] = null);
        newData.push(newRow);
      }

      formulaUpdates.forEach(u => {
        if (newData[u.row]) {
          const newRow = { ...newData[u.row] };
          newRow[u.col] = u.val;
          newData[u.row] = newRow;
        }
      });

      updateData(newData);
      addChatMessage({
        id: Date.now().toString() + '-formula',
        role: 'model',
        text: `✅ Applied ${formulaUpdates.length} formula(s).`,
        timestamp: Date.now()
      });
    }
  };

  const copyRoomLink = async () => {
    const url = new URL(window.location.href);

    // Force the room parameter into the URL if not present
    if (!url.searchParams.has('room')) {
      url.searchParams.set('room', roomName);
      // Update the browser's address bar without reloading
      window.history.pushState({}, '', url.toString());
    }

    const link = url.toString();

    const showSuccess = () => {
      const btn = document.getElementById('room-share-btn');
      if (btn) {
        // Store original HTML only if not already stored to avoid overwriting with "Copied!"
        if (!btn.dataset.originalHtml) {
          btn.dataset.originalHtml = btn.innerHTML;
        }

        btn.innerHTML = '<span class="text-green-400 font-bold">Copied!</span>';

        // Reset after timeout
        setTimeout(() => {
          if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
          }
        }, 2000);
      } else {
        alert("Room link copied to clipboard!");
      }
    };

    try {
      await navigator.clipboard.writeText(link);
      showSuccess();
    } catch (err) {
      console.warn("Clipboard API failed, attempting fallback...", err);

      // Fallback: Create hidden textarea
      const textArea = document.createElement("textarea");
      textArea.value = link;

      // Make it invisible but part of the DOM
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          showSuccess();
        } else {
          throw new Error("Fallback copy failed");
        }
      } catch (fallbackErr) {
        document.body.removeChild(textArea);
        console.error("Copy failed", fallbackErr);
        prompt("Could not copy automatically. Please copy this link:", link);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1f20] text-gray-200 font-sans overflow-hidden selection:bg-blue-500/30">

      {/* Cursor Overlay */}
      <CursorOverlay collaborators={collaborators} />

      {/* Modals */}
      {expandedGalleryItem && <GalleryModal item={expandedGalleryItem} data={data} onClose={() => setExpandedGalleryItem(null)} onDelete={deleteGalleryItem} />}
      {showSettings && <SettingsModal config={aiConfig} turnConfig={turnConfig} onSave={setAiConfig} onSaveTurn={setTurnConfig} onClose={() => setShowSettings(false)} />}

      {/* Room Full Modal */}
      {roomFull && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#202124] border-2 border-red-500/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-br from-red-900/30 to-[#202124]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Room is Full</h2>
                  <p className="text-sm text-gray-400">Maximum capacity reached</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                This room has reached its maximum capacity of <strong className="text-red-400">{MAX_USERS} users</strong>.
                Please try creating a new room or wait for someone to leave.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  window.location.href = window.location.pathname; // Reload to generate new room
                }}
              >
                Create New Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#202124] border-b border-gray-700 shadow-md z-30 relative shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40">
            <FileSpreadsheet size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide uppercase opacity-90">LuminaData <span className="text-blue-400 text-[10px] bg-blue-400/10 px-1.5 py-0.5 rounded ml-1">LIVE</span></h1>
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="bg-transparent text-xs text-gray-400 border-none focus:ring-0 p-0 hover:text-white w-32 transition-colors font-medium truncate"
              />
              <span className="text-[10px] text-gray-600 px-1">|</span>
              <button
                id="room-share-btn"
                onClick={copyRoomLink}
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30 transition-colors min-w-[80px] justify-center"
                title="Click to copy invite link"
              >
                <LinkIcon size={10} /> {roomName}
              </button>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-gray-700 mx-2"></div>
          <div className="flex items-center gap-1">
            <Button variant="icon" onClick={handleUndo} title="Undo (Collaborative)">
              <Undo2 size={18} />
            </Button>
            <Button variant="icon" onClick={handleRedo} title="Redo (Collaborative)">
              <Redo2 size={18} />
            </Button>
          </div>

          {/* Collaborators */}
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#202124] flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: localUser.color }} title={`You: ${localUser.name}`}>
                {localUser.name.charAt(0)}
              </div>
              {collaborators.slice(0, 3).map(c => (
                <div key={c.clientId} className="w-8 h-8 rounded-full border-2 border-[#202124] flex items-center justify-center text-xs font-bold text-white relative group" style={{ backgroundColor: c.color }}>
                  {c.name.charAt(0)}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-[10px] px-1 rounded whitespace-nowrap">{c.name}</div>
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-[#202124] bg-gray-600 flex items-center justify-center text-[10px] text-white">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
            {/* User count indicator */}
            <div className={`text-[10px] font-mono px-2 py-1 rounded ${(collaborators.length + 1) >= MAX_USERS
              ? 'bg-red-900/30 text-red-400 border border-red-900/50'
              : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
              }`}>
              <Users size={10} className="inline mr-1" />
              {collaborators.length + 1}/{MAX_USERS}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          <NotificationCenter
            notifications={notifications}
            onDismiss={dismissNotification}
            onClearAll={clearAllNotifications}
          />

          <Button variant="icon" onClick={() => setShowSettings(true)} title="AI Settings">
            <Settings size={18} className={aiConfig.provider === 'openrouter' ? 'text-green-400' : ''} />
          </Button>
          <div className="h-6 w-[1px] bg-gray-700"></div>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} className="mr-2" /> Import
          </Button>
          <Button variant="secondary" onClick={() => exportToExcel(data, filename)}>
            <Download size={16} className="mr-2" /> Export
          </Button>
          <Button variant="secondary" onClick={() => exportAiSession(chatHistory, filename)}>
            <Save size={16} className="mr-2" /> Save Chat
          </Button>
          <Button variant="icon" onClick={() => setShowChat(!showChat)} className={showChat ? 'text-blue-400 bg-blue-400/10' : ''}>
            <MessageSquare size={20} />
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Left Section: Spreadsheet + Gallery Dock */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${showChat ? 'mr-96' : ''}`}>

          {/* Spreadsheet Container */}
          <div className="flex-1 p-4 pb-0 min-h-0 relative">
            <div className="h-full flex flex-col rounded-t-xl overflow-hidden border border-gray-700 shadow-2xl bg-[#202124]">
              <Spreadsheet
                data={data}
                columns={columns}
                onUpdate={handleDataUpdate}
                onSelectionChange={updateSelection}
                onFormulaFixRequest={handleFormulaFixRequest}
                collaborators={collaborators}
              />
            </div>
          </div>

          {/* Bottom Gallery Dock */}
          <div className="h-56 bg-[#1a1b1e] border-t border-gray-700 flex flex-col shrink-0 relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
            <div className="px-4 py-2 bg-[#252629] border-b border-gray-700 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                <Terminal size={14} />
                <span className="font-bold tracking-wider">SHARED_VISUAL_GALLERY</span>
                <span className="animate-pulse inline-block w-1.5 h-3 bg-blue-500 ml-1"></span>
              </div>
              <span className="text-[10px] text-gray-600 uppercase">{galleryItems.length} Items Generated</span>
            </div>

            <div className="flex-1 overflow-x-auto p-4 flex items-center gap-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {galleryItems.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50">
                  <BarChart3 size={32} />
                  <p className="text-xs font-mono">Ask AI to create charts. They will appear here for everyone.</p>
                </div>
              ) : (
                galleryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setExpandedGalleryItem(item)}
                    className="min-w-[220px] w-[220px] h-[140px] bg-[#202124] border border-gray-700 hover:border-blue-500/50 rounded-lg cursor-pointer relative group transition-all hover:scale-105 hover:shadow-xl flex flex-col overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        className="p-1 bg-red-500/80 hover:bg-red-600 rounded text-white"
                        onClick={(e) => { e.stopPropagation(); deleteGalleryItem(item.id); }}
                        title="Delete for everyone"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button className="p-1 bg-black/50 hover:bg-blue-600 rounded text-white">
                        <Maximize2 size={12} />
                      </button>
                    </div>

                    <div className="px-3 py-2 border-b border-gray-800 bg-[#252629] flex items-center gap-2">
                      {item.type === 'chart' ? <BarChart3 size={12} className="text-purple-400" /> : <Lightbulb size={12} className="text-blue-400" />}
                      <span className="text-[10px] font-medium text-gray-300 truncate w-full">{item.title}</span>
                    </div>

                    <div className="flex-1 p-2 overflow-hidden relative">
                      {item.type === 'chart' ? (
                        <div className="pointer-events-none transform scale-50 origin-top-left w-[200%] h-[200%]">
                          <ChartRenderer config={item.data as ChartConfig} data={data} />
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-400 leading-relaxed line-clamp-4 p-1">
                          {(item.data as InsightData).summary}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div
          className={`fixed top-[61px] bottom-0 right-0 w-96 bg-[#28292c] border-l border-gray-700 shadow-2xl flex flex-col z-30 transform transition-transform duration-300 ease-cubic ${showChat ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-[#2d2e31] shadow-sm shrink-0">
            <div className="flex items-center gap-2 text-blue-400 font-medium">
              <Sparkles size={18} className="animate-pulse" />
              <span>Group AI Assistant</span>
              {aiConfig.provider === 'openrouter' && <span className="text-[9px] bg-green-900/50 text-green-400 px-1 rounded border border-green-900">OPENROUTER</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className="text-gray-500 hover:text-orange-400 transition-colors p-1 rounded hover:bg-gray-700/50"
                title="Reset chat context"
              >
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={chatScrollRef}>
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md relative group ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-[#3c4043] text-gray-100 rounded-bl-none border border-gray-600'
                    }`}
                >
                  <div className="whitespace-pre-wrap">
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 min-h-[1em]">{line}</p>
                    ))}
                  </div>

                  {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <div className="flex flex-wrap gap-2">
                        {msg.groundingUrls.slice(0, 3).map((url, idx) => (
                          <a
                            key={idx}
                            href={url.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-black/20 hover:bg-black/40 px-2 py-1 rounded text-blue-200 truncate max-w-[140px] transition-colors"
                          >
                            {url.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 mt-1 px-1 select-none">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {/* Pending Update Confirmation Card */}
            {pendingUpdate && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4 shadow-lg mx-1">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-yellow-200">Review Data Changes</h4>
                    <p className="text-xs text-gray-400 mt-1">The AI has prepared a data update. This will modify the spreadsheet for everyone.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="danger" className="h-8 text-xs" onClick={discardPendingUpdate}>
                    Discard
                  </Button>
                  <Button variant="success" className="h-8 text-xs" onClick={confirmPendingUpdate}>
                    <CheckCircle2 size={14} className="mr-1" /> Apply Changes
                  </Button>
                </div>
              </div>
            )}

            {isThinking && (
              <div className="flex items-center gap-3 text-gray-500 text-sm p-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-xs">Lumina is processing...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#2d2e31] border-t border-gray-700 shrink-0">
            <div className="relative flex items-center group">
              <input
                type="text"
                className="w-full bg-[#202124] text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-600 group-hover:border-gray-500 transition-colors placeholder-gray-500 text-sm"
                placeholder={aiConfig.provider === 'openrouter' ? `Ask ${aiConfig.openRouterModel.split('/').pop()}...` : "Ask Lumina (Gemini)..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !pendingUpdate && handleSendMessage()}
                disabled={isThinking || !!pendingUpdate}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isThinking || !!pendingUpdate}
                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-0 disabled:scale-90 transition-all duration-200"
              >
                <Send size={16} />
              </button>
            </div>
            {pendingUpdate && <p className="text-[10px] text-center text-yellow-500/70 mt-2">Please confirm changes before sending new messages.</p>}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
