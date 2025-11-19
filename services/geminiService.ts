
import { GoogleGenAI } from "@google/genai";
import { AIActionType, AIResponseParsed, RowData, ChartConfig, AIConfig } from '../types';
import { analyzeDataForChart, getQuickChartSuggestion } from '../utils/chartRecommender';

// Helper to sanitize JSON from potential markdown code blocks
const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const SYSTEM_INSTRUCTION = `
You are Lumina, an elite Data Scientist and AI Spreadsheet Assistant with advanced chart recommendation capabilities.
Your goal is to manipulate data, generate deep insights, and visualize trends with intelligent chart suggestions.

**CORE CAPABILITIES & INTENTS:**

1. **DATA MANIPULATION (Action: UPDATE_DATA)**:
   - **Add/Calc Columns**: e.g., "Add a Profit Margin column".
   - **Clean Data**: e.g., "Standardize phone numbers", "Fix capitalization", "Remove duplicates". Return the *entire* cleaned dataset in the JSON.
   - **Synthetic Data**: e.g., "Generate 5 more rows like this". Analyze the distribution/schema of the current data and generate realistic new rows appended to the dataset.
   - **Sort/Filter**: If asked to "Remove rows where X < 10", return the filtered dataset.

2. **DEEP ANALYSIS (Action: SHOW_INSIGHTS)**:
   - Trigger this when asked to "Analyze the data", "Give me a summary", "Find trends", or "What does this data tell us?".
   - Return a structured JSON summary of the data including key statistics, trends, and actionable recommendations.

3. **INTELLIGENT VISUALIZATION (Action: CREATE_CHART)**:
   - I will provide smart chart recommendations based on the data selected.
   - You can suggest charts for trends, comparisons, or distributions.
   - When user asks for a chart, analyze the data and recommend the best chart type.
   - Consider: time series (line/area), comparisons (bar), correlations (scatter), proportions (pie).

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

**C) To Create Chart (with AI recommendation context):**
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

**D) To Create Formula:**
\`\`\`json
{
  "type": "CREATE_FORMULA",
  "formula": "=SUM(B2:E2)",
  "cell": "F2",
  "description": "Brief explanation of what the formula does"
}
\`\`\`

**Available Formula Functions:**
- SUM(range) - Add numbers
- AVERAGE(range) - Calculate average
- MAX(range) - Find maximum
- MIN(range) - Find minimum
- COUNT(range) - Count numbers
- MEDIAN(range) - Find median
- PRODUCT(range) - Multiply numbers
- Arithmetic: =B2+C2, =B2-C2, =B2*C2, =B2/C2
- Percentage: =(B2/C2)*100
- Complex: =(B2+C2)*D2

**Formula Examples:**
- **Subtraction**: \`=B2-C2\` (Calculate difference)
- **Multiplication**: \`=B2*C2\` (Calculate product)
- **Division**: \`=B2/C2\` (Calculate ratio)
- **Profit**: \`=Revenue-Cost\` (e.g., \`=B2-C2\`)
- **Margin**: \`=(Profit/Revenue)*100\` (e.g., \`=(D2/B2)*100\`)

**General Rules:**
- **Accuracy**: If calculating, be precise.
- **Completeness**: When updating data, return the FULL dataset (up to reasonable limits) or the modified subset if appending.
- **Tone**: Professional, helpful, data-driven.
- **Chart Intelligence**: When creating charts, consider the AI recommendation provided in the context.
- **Simplicity**: Do NOT use \`VALUE()\` or \`SUBSTITUTE()\` to clean currency symbols (e.g., "$"). The engine handles this automatically. Use simple cell references (e.g., \`=B2-C2\`) instead of complex parsing.
`;

const processAIResponse = (fullText: string, groundingChunks: any[] = []): AIResponseParsed => {
  const groundingUrls = groundingChunks
    .map(chunk => chunk.web ? { title: chunk.web.title || 'Source', uri: chunk.web.uri || '' } : null)
    .filter((u): u is { title: string, uri: string } => u !== null && u.uri !== '');

  // Parse JSON actions
  const jsonMatches = [...fullText.matchAll(/```json([\s\S]*?)```/g)];

  const actions: { type: AIActionType; payload: any }[] = [];
  let displayText = fullText;

  for (const match of jsonMatches) {
    try {
      const jsonContent = cleanJson(match[1]);
      const parsed = JSON.parse(jsonContent);

      if (parsed.type === "UPDATE_DATA") {
        actions.push({ type: AIActionType.UPDATE_DATA, payload: parsed.data });
      } else if (parsed.type === "CREATE_CHART") {
        actions.push({ type: AIActionType.CREATE_CHART, payload: parsed.config });
      } else if (parsed.type === "SHOW_INSIGHTS") {
        actions.push({ type: AIActionType.SHOW_INSIGHTS, payload: parsed.config });
      } else if (parsed.type === "CREATE_FORMULA") {
        actions.push({ type: AIActionType.CREATE_FORMULA, payload: parsed });
      }

      // Remove the JSON block from display text
      displayText = displayText.replace(match[0], '').trim();
    } catch (e) {
      console.error("Failed to parse AI JSON action:", e);
      displayText += "\n\n(Error: Generated invalid JSON action.)";
    }
  }

  if (!displayText && actions.length > 0) {
    displayText = "I've processed your request.";
  }

  return {
    text: displayText,
    action: actions.length > 0 ? actions[0].type : AIActionType.NONE,
    payload: actions.length > 0 ? actions[0].payload : undefined,
    actions,
    groundingUrls
  };
};

export const generateResponse = async (
  prompt: string,
  currentData: RowData[],
  currentColumns: string[],
  history: { role: string, parts: { text: string }[] }[],
  config?: AIConfig
): Promise<AIResponseParsed> => {

  // Context preparation
  const dataPreview = JSON.stringify(currentData.slice(0, 50));
  const columnInfo = currentColumns.join(", ");

  // Check if user is asking for a chart/visualization
  const isChartRequest = /chart|graph|plot|visual|show.*trend|compare.*visual/i.test(prompt);
  let chartRecommendation = '';

  if (isChartRequest && currentColumns.length > 0) {
    const recommendation = analyzeDataForChart(currentData, currentColumns);
    if (recommendation) {
      chartRecommendation = `\n\n📊 AI Chart Recommendation:\n- Type: ${recommendation.recommendedType}\n- Confidence: ${recommendation.confidence}%\n- Reason: ${recommendation.reason}\n- Suggested X-axis: ${recommendation.dataKeyX}\n- Suggested Y-axis: ${Array.isArray(recommendation.dataKeyY) ? recommendation.dataKeyY.join(', ') : recommendation.dataKeyY}\n`;
    }
  }

  const fullSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nCurrent Data Context:\n- Columns: ${columnInfo}\n- First 50 rows (JSON): ${dataPreview}${chartRecommendation}`;

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
