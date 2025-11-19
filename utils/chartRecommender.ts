import { RowData } from '../types';

// Helper to check if value is numeric
const isNumeric = (val: any): boolean => {
    return !isNaN(parseFloat(val)) && isFinite(val);
};

// Helper to detect if column contains time/date data
const isTimeData = (values: any[]): boolean => {
    const timePatterns = /\d{4}[-\/]\d{2}[-\/]\d{2}|Q\d|quarter|month|year|date|time/i;
    return values.some(v => timePatterns.test(String(v)));
};

export interface ChartAnalysis {
    recommendedType: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
    confidence: number;
    reason: string;
    alternatives: Array<{ type: 'bar' | 'line' | 'area' | 'pie' | 'scatter', confidence: number }>;
    dataKeyX: string;
    dataKeyY: string | string[];
}

export function analyzeDataForChart(
    data: RowData[],
    columns: string[]
): ChartAnalysis | null {
    if (!data || data.length === 0 || columns.length === 0) {
        return null;
    }

    // Analyze each column
    const columnAnalysis = columns.map(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
        const numericCount = values.filter(isNumeric).length;
        const isNumericCol = numericCount > values.length * 0.7;
        const isTime = isTimeData(values);

        return {
            name: col,
            isNumeric: isNumericCol,
            isTime,
            uniqueValues: new Set(values).size,
            totalValues: values.length
        };
    });

    const numericCols = columnAnalysis.filter(c => c.isNumeric);
    const categoricalCols = columnAnalysis.filter(c => !c.isNumeric);
    const timeCols = columnAnalysis.filter(c => c.isTime);

    // Recommendation logic
    let recommendation: ChartAnalysis;

    // Case 1: Time series (1+ time column + 1+ numeric)
    if (timeCols.length > 0 && numericCols.length > 0) {
        recommendation = {
            recommendedType: 'line',
            confidence: 95,
            reason: `Perfect for showing trends over time in ${numericCols.map(c => c.name).join(', ')}`,
            alternatives: [
                { type: 'area', confidence: 85 },
                { type: 'bar', confidence: 60 }
            ],
            dataKeyX: timeCols[0].name,
            dataKeyY: numericCols.length === 1 ? numericCols[0].name : numericCols.map(c => c.name)
        };
    }
    // Case 2: 1 categorical + 1 numeric (comparison)
    else if (categoricalCols.length === 1 && numericCols.length === 1) {
        const categorical = categoricalCols[0];
        const numeric = numericCols[0];

        // If few categories and data sums to ~100, suggest pie
        if (categorical.uniqueValues <= 6) {
            const total = data.reduce((sum, row) => sum + (Number(row[numeric.name]) || 0), 0);
            const isProportion = total > 90 && total < 110;

            if (isProportion) {
                recommendation = {
                    recommendedType: 'pie',
                    confidence: 90,
                    reason: `Great for showing proportion of ${numeric.name} across ${categorical.name}`,
                    alternatives: [
                        { type: 'bar', confidence: 80 },
                        { type: 'line', confidence: 40 }
                    ],
                    dataKeyX: categorical.name,
                    dataKeyY: numeric.name
                };
            } else {
                recommendation = {
                    recommendedType: 'bar',
                    confidence: 92,
                    reason: `Ideal for comparing ${numeric.name} across different ${categorical.name}`,
                    alternatives: [
                        { type: 'line', confidence: 70 },
                        { type: 'pie', confidence: 50 }
                    ],
                    dataKeyX: categorical.name,
                    dataKeyY: numeric.name
                };
            }
        } else {
            recommendation = {
                recommendedType: 'bar',
                confidence: 88,
                reason: `Best for comparing ${numeric.name} across many categories`,
                alternatives: [
                    { type: 'line', confidence: 65 }
                ],
                dataKeyX: categorical.name,
                dataKeyY: numeric.name
            };
        }
    }
    // Case 3: Multiple numeric columns (trend comparison)
    else if (numericCols.length >= 2 && categoricalCols.length <= 1) {
        const xCol = categoricalCols.length > 0 ? categoricalCols[0].name : numericCols[0].name;
        const yCol = categoricalCols.length > 0 ? numericCols.map(c => c.name) : numericCols.slice(1).map(c => c.name);

        // If 2 numeric and no categorical, might be correlation
        if (categoricalCols.length === 0 && numericCols.length === 2) {
            recommendation = {
                recommendedType: 'scatter',
                confidence: 85,
                reason: `Shows correlation between ${numericCols[0].name} and ${numericCols[1].name}`,
                alternatives: [
                    { type: 'line', confidence: 75 },
                    { type: 'bar', confidence: 60 }
                ],
                dataKeyX: numericCols[0].name,
                dataKeyY: numericCols[1].name
            };
        } else {
            recommendation = {
                recommendedType: 'line',
                confidence: 87,
                reason: `Perfect for comparing trends across multiple metrics`,
                alternatives: [
                    { type: 'area', confidence: 80 },
                    { type: 'bar', confidence: 70 }
                ],
                dataKeyX: xCol,
                dataKeyY: yCol
            };
        }
    }
    // Default: Bar chart
    else {
        recommendation = {
            recommendedType: 'bar',
            confidence: 75,
            reason: 'Bar charts work well for general comparisons',
            alternatives: [
                { type: 'line', confidence: 60 },
                { type: 'pie', confidence: 50 }
            ],
            dataKeyX: columns[0],
            dataKeyY: columns.length > 1 ? columns[1] : columns[0]
        };
    }

    return recommendation;
}

// Quick helper to get a one-liner recommendation
export function getQuickChartSuggestion(data: RowData[], columns: string[]): string {
    const analysis = analyzeDataForChart(data, columns);
    if (!analysis) return "Select data to get chart recommendations";

    const typeNames = {
        bar: 'Bar Chart',
        line: 'Line Chart',
        area: 'Area Chart',
        pie: 'Pie Chart',
        scatter: 'Scatter Plot'
    };

    return `📊 ${typeNames[analysis.recommendedType]} (${analysis.confidence}% confidence): ${analysis.reason}`;
}
