import { CellValue } from '../types';

// Detect if value looks like a currency
export function isCurrency(value: any): boolean {
    if (typeof value === 'number') return false; // Already numeric
    const str = String(value).trim();

    // Patterns: $123, 123$, USD 123, 123 USD, €123, £123
    return /^[\$€£¥]?\s?\d+([,\d]*)?(\.\d{1,2})?\s?[\$€£¥]?$/.test(str) ||
        /^(USD|EUR|GBP|JPY)\s?\d+/.test(str) ||
        /\d+\s?(USD|EUR|GBP|JPY)$/.test(str);
}

// Detect if value looks like a percentage
export function isPercentage(value: any): boolean {
    const str = String(value).trim();
    return /^\d+(\.\d+)?%$/.test(str) || /^0\.\d+$/.test(str);
}

// Detect if value looks like a date
export function isDate(value: any): boolean {
    const str = String(value).trim();

    // Patterns: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY, Month DD YYYY, etc.
    const datePatterns = [
        /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/,  // YYYY-MM-DD
        /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/,  // DD/MM/YYYY or MM/DD/YYYY
        /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}$/i, // Month DD, YYYY
    ];

    return datePatterns.some(pattern => pattern.test(str)) || !isNaN(Date.parse(str));
}

// Format value as currency
export function formatCurrency(value: any): string {
    const numStr = String(value).replace(/[^\d.-]/g, '');
    const num = parseFloat(numStr);

    if (isNaN(num)) return String(value);

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// Format value as percentage
export function formatPercentage(value: any): string {
    let num: number;
    const str = String(value).replace('%', '');

    num = parseFloat(str);
    if (isNaN(num)) return String(value);

    // If value is 0.15, display as 15%
    // If value is 15, display as 15%
    if (num < 1 && num > 0) {
        num = num * 100;
    }

    return `${num.toFixed(2)}%`;
}

// Format value as date
export function formatDate(value: any): string {
    const date = new Date(value);

    if (isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Main auto-format function
export function autoFormat(value: CellValue): CellValue {
    if (value === null || value === undefined || value === '') {
        return value;
    }

    // Skip if already a number (not string representation)
    if (typeof value === 'number') {
        return value;
    }

    const strValue = String(value);

    // Try currency formatting
    if (isCurrency(strValue)) {
        return formatCurrency(strValue);
    }

    // Try percentage formatting
    if (isPercentage(strValue)) {
        return formatPercentage(strValue);
    }

    // Try date formatting
    if (isDate(strValue)) {
        return formatDate(strValue);
    }

    // Return as-is
    return value;
}

// Auto-format entire dataset
export function autoFormatData(data: any[]): any[] {
    return data.map(row => {
        if (!row) return row;

        const formatted: any = {};
        Object.keys(row).forEach(key => {
            formatted[key] = autoFormat(row[key]);
        });
        return formatted;
    });
}

// Detect if a column should have specific formatting
export interface ColumnFormatSuggestion {
    column: string;
    format: 'currency' | 'percentage' | 'date' | 'number' | 'text';
    confidence: number;
    sample: string;
}

export function detectColumnFormats(data: any[], columns: string[]): ColumnFormatSuggestion[] {
    const suggestions: ColumnFormatSuggestion[] = [];

    columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
        if (values.length === 0) return;

        let currencyCount = 0;
        let percentageCount = 0;
        let dateCount = 0;
        let numberCount = 0;

        values.forEach(v => {
            if (isCurrency(v)) currencyCount++;
            else if (isPercentage(v)) percentageCount++;
            else if (isDate(v)) dateCount++;
            else if (!isNaN(parseFloat(String(v))) && isFinite(v)) numberCount++;
        });

        const total = values.length;
        const currencyPct = currencyCount / total;
        const percentagePct = percentageCount / total;
        const datePct = dateCount / total;
        const numberPct = numberCount / total;

        const threshold = 0.6; // 60% of values must match

        if (currencyPct >= threshold) {
            suggestions.push({
                column: col,
                format: 'currency',
                confidence: Math.round(currencyPct * 100),
                sample: formatCurrency(values[0])
            });
        } else if (percentagePct >= threshold) {
            suggestions.push({
                column: col,
                format: 'percentage',
                confidence: Math.round(percentagePct * 100),
                sample: formatPercentage(values[0])
            });
        } else if (datePct >= threshold) {
            suggestions.push({
                column: col,
                format: 'date',
                confidence: Math.round(datePct * 100),
                sample: formatDate(values[0])
            });
        } else if (numberPct >= threshold) {
            suggestions.push({
                column: col,
                format: 'number',
                confidence: Math.round(numberPct * 100),
                sample: values[0]
            });
        }
    });

    return suggestions;
}
