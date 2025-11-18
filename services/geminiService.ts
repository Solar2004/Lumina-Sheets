
import { GoogleGenAI } from "@google/genai";
import { AIActionType, AIResponseParsed, RowData, ChartConfig, AIConfig } from '../types';

// Helper to sanitize JSON from potential markdown code blocks
const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const SYSTEM_INSTRUCTION = `
You are Lumina, an elite Data Scientist and AI Spreadsheet Assistant.
Your goal is to manipulate data, generate deep insights, and visualize trends.

**CORE CAPABILITIES & INTENTS:**

1. **DATA MANIPULATION (Action: UPDATE_DATA)**:
   - **Add/Calc Columns**: e.g., "Add a Profit Margin column".
   - **Clean Data**: e.g., "Standardize phone numbers", "Fix capitalization", "Remove duplicates". Return the *entire* cleaned dataset in the JSON.
   - **Synthetic Data**: e.g., "Generate 5 more rows like this". Analyze the distribution/schema of the current data and generate realistic new rows appended to the dataset.
   - **Sort/Filter**: If asked to "Remove rows where X < 10", return the filtered dataset.

2. **DEEP ANALYSIS (Action: SHOW_INSIGHTS)**:
   - Trigger this when asked to "Analyze the data", "Give me a summary", "Find trends", or "What does this data tell us?".
   - Return a structured JSON summary of the data including key statistics, trends, and actionable recommendations.

3. **VISUALIZATION (Action: CREATE_CHART)**:
   - Generate charts for trends, comparisons, or distributions.

4. **WEB SEARCH** (Only if available in tools):
   - Use search to find real-world data.
   - If using search, always incorporate the found data into an UPDATE_DATA action if applicable.

**OUTPUT FORMATS (JSON Blocks):**

**A) To Update/Clean/Generate Data:**
\`\`\`json
{
  "type": "UPDATE_DATA",
  "data": [ ... complete array of all rows including new/modified ones ... ]
}
\`\`\`

**B) To Show Deep Insights:**
\`\`\`json
{
  "type": "SHOW_INSIGHTS",
  "config": {
    "summary": "A concise, high-level executive summary of the data trends and anomalies.",
    "keyStats": [
      {"label": "Total Revenue", "value": "$1.2M", "trend": "up"},
      {"label": "Avg Margin", "value": "15%", "trend": "neutral"},
      {"label": "Churn Rate", "value": "2%", "trend": "down"}
    ],
    "recommendation": "Actionable advice based on the findings (e.g., 'Focus marketing on Q3')."
  }
}
\`\`\`

**C) To Create Chart:**
\`\`\`json
{
  "type": "CREATE_CHART",
  "config": {
    "type": "bar" | "line" | "area" | "pie" | "scatter",
    "dataKeyX": "ColumnName",
    "dataKeyY": "ColumnName" (or ["Col1", "Col2"]),
    "title": "Chart Title",
    "description": "Brief description"
  }
}
\`\`\`

**General Rules:**
- **Accuracy**: If calculating, be precise.
- **Completeness**: When updating data, return the FULL dataset (up to reasonable limits) or the modified subset if appending.
- **Tone**: Professional, helpful, data-driven.
`;

const processAIResponse = (fullText: string, groundingChunks: any[] = []): AIResponseParsed => {
  const groundingUrls = groundingChunks
      .map(chunk => chunk.web ? { title: chunk.web.title || 'Source', uri: chunk.web.uri || '' } : null)
      .filter((u): u is {title: string, uri: string} => u !== null && u.uri !== '');

  // Parse JSON actions
  const jsonMatch = fullText.match(/```json([\s\S]*?)```/);
  
  let action = AIActionType.NONE;
  let payload = undefined;
  let displayText = fullText;

  if (jsonMatch) {
    try {
      const jsonContent = cleanJson(jsonMatch[1]);
      const parsed = JSON.parse(jsonContent);
      
      if (parsed.type === "UPDATE_DATA") {
        action = AIActionType.UPDATE_DATA;
        payload = parsed.data;
        displayText = fullText.replace(jsonMatch[0], '').trim(); 
        if(!displayText) displayText = "I've updated the spreadsheet as requested.";
      } else if (parsed.type === "CREATE_CHART") {
        action = AIActionType.CREATE_CHART;
        payload = parsed.config;
        displayText = fullText.replace(jsonMatch[0], '').trim();
        if(!displayText) displayText = "Here is the visualization.";
      } else if (parsed.type === "SHOW_INSIGHTS") {
        action = AIActionType.SHOW_INSIGHTS;
        payload = parsed.config;
        displayText = fullText.replace(jsonMatch[0], '').trim();
        if(!displayText) displayText = "I've analyzed your data.";
      }
    } catch (e) {
      console.error("Failed to parse AI JSON action:", e);
      displayText += "\n\n(Error: Generated invalid JSON action.)";
    }
  }

  return {
    text: displayText,
    action,
    payload,
    groundingUrls
  };
};

export const generateResponse = async (
  prompt: string, 
  currentData: RowData[], 
  currentColumns: string[],
  history: {role: string, parts: {text: string}[]}[],
  config?: AIConfig
): Promise<AIResponseParsed> => {
  
  // Context preparation
  const dataPreview = JSON.stringify(currentData.slice(0, 50)); 
  const columnInfo = currentColumns.join(", ");
  const fullSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nCurrent Data Context:\n- Columns: ${columnInfo}\n- First 50 rows (JSON): ${dataPreview}`;

  // --- OPENROUTER HANDLER ---
  if (config?.provider === 'openrouter') {
    if (!config.openRouterKey) {
      return { text: "Please provide an OpenRouter API Key in Settings.", action: AIActionType.NONE };
    }

    try {
      // Construct messages for OpenRouter (OpenAI compatible)
      const messages = [
        { role: "system", content: fullSystemInstruction },
        ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
        { role: "user", content: prompt }
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.openRouterKey}`,
          "HTTP-Referer": window.location.href, 
          "X-Title": "LuminaData", 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": config.openRouterModel || "google/gemini-2.0-flash-lite-preview-02-05:free", // Fallback to a generally free model if empty
          "messages": messages
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter Error: ${err}`);
      }

      const json = await response.json();
      const fullText = json.choices?.[0]?.message?.content || "";
      
      return processAIResponse(fullText);

    } catch (error) {
      console.error("OpenRouter API Error:", error);
      return {
        text: `I encountered an error communicating with OpenRouter: ${error instanceof Error ? error.message : String(error)}`,
        action: AIActionType.NONE,
        groundingUrls: []
      };
    }
  }

  // --- GEMINI (DEFAULT) HANDLER ---
  if (!process.env.API_KEY) {
    return {
      text: "API Key is missing. Please check your environment configuration.",
      action: AIActionType.NONE
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.parts[0].text }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: fullSystemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.3, 
      }
    });

    const fullText = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return processAIResponse(fullText, groundingChunks);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "I encountered an error communicating with the AI service. Please try again.",
      action: AIActionType.NONE,
      groundingUrls: []
    };
  }
};
