
export type CellValue = string | number | null;

export interface RowData {
  [key: string]: CellValue;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  chartConfig?: ChartConfig;
  insightData?: InsightData;
  isError?: boolean;
  groundingUrls?: Array<{ title: string, uri: string }>;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  dataKeyX: string;
  dataKeyY: string | string[];
  title: string;
  description?: string;
}

export interface InsightData {
  summary: string;
  keyStats: { label: string; value: string | number; trend?: 'up' | 'down' | 'neutral' }[];
  recommendation: string;
}

export interface GalleryItem {
  id: string;
  type: 'chart' | 'insight';
  title: string;
  timestamp: number;
  data: ChartConfig | InsightData;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface Collaborator {
  clientId: number;
  name: string;
  color: string;
  selection?: { row: number; col: string } | null;
  cursor?: CursorPosition;
}

export interface AppState {
  data: RowData[];
  columns: string[];
  filename: string;
  chatHistory: ChatMessage[];
  isAiThinking: boolean;
  galleryItems?: GalleryItem[];
}

export const DEFAULT_DATA: RowData[] = [
  { "Product": "Laptop", "Q1_Sales": 120, "Q2_Sales": 150, "Cost": 800, "Profit": 100 },
  { "Product": "Phone", "Q1_Sales": 200, "Q2_Sales": 220, "Cost": 500, "Profit": 140 },
  { "Product": "Tablet", "Q1_Sales": 80, "Q2_Sales": 95, "Cost": 300, "Profit": 40 },
  { "Product": "Monitor", "Q1_Sales": 150, "Q2_Sales": 140, "Cost": 200, "Profit": 30 },
  { "Product": "Headphones", "Q1_Sales": 300, "Q2_Sales": 310, "Cost": 50, "Profit": 120 },
];

export enum AIActionType {
  UPDATE_DATA = 'UPDATE_DATA',
  CREATE_CHART = 'CREATE_CHART',
  SHOW_INSIGHTS = 'SHOW_INSIGHTS',
  NONE = 'NONE'
}

export interface AIResponseParsed {
  text: string;
  action: AIActionType;
  payload?: any;
  groundingUrls?: Array<{ title: string, uri: string }>;
}

export type AIProvider = 'gemini' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  openRouterKey: string;
  openRouterModel: string;
  // Feature toggles
  autoFormat?: boolean;
  smartFilters?: boolean;
}

export interface TurnConfig {
  enabled: boolean;
  urls: string;
  username?: string;
  credential?: string;
}
