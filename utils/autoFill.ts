/**
 * AI-powered Auto-Fill Service
 * Predicts cell values when dragging/filling cells based on patterns
 */

import { RowData, CellValue } from '../types';
import { isFormula } from './formulaEngine';

export interface FillPattern {
    type: 'numeric' | 'formula' | 'text' | 'date' | 'custom';
    increment?: number;
    formula?: string;
    confidence: number;
    description: string;
}

/**
 * Analyze a range of cells to detect patterns
 */
export function detectPattern(values: CellValue[]): FillPattern | null {
    // Filter out null/undefined values
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (validValues.length === 0) return null;

    // Check if it's a formula
    if (validValues.some(v => isFormula(String(v)))) {
        return detectFormulaPattern(validValues);
    }

    // Check if it's numeric
    if (validValues.every(v => !isNaN(Number(v)))) {
        return detectNumericPattern(validValues.map(Number));
    }

    // Check if it's a text pattern
    return detectTextPattern(validValues.map(String));
}

/**
 * Detect numeric pattern (arithmetic sequence)
 */
function detectNumericPattern(numbers: number[]): FillPattern | null {
    if (numbers.length < 2) {
        return {
            type: 'numeric',
            increment: 0,
            confidence: 50,
            description: 'Repeat value'
        };
    }

    // Calculate differences
    const differences = [];
    for (let i = 1; i < numbers.length; i++) {
        differences.push(numbers[i] - numbers[i - 1]);
    }

    // Check if differences are consistent (arithmetic sequence)
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const isConsistent = differences.every(d => Math.abs(d - avgDiff) < 0.01);

    if (isConsistent) {
        return {
            type: 'numeric',
            increment: avgDiff,
            confidence: 95,
            description: `Numeric sequence (${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(2)})`
        };
    }

    // Check for geometric sequence (multiplication)
    if (numbers.every(n => n !== 0)) {
        const ratios = [];
        for (let i = 1; i < numbers.length; i++) {
            ratios.push(numbers[i] / numbers[i - 1]);
        }
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const isGeometric = ratios.every(r => Math.abs(r - avgRatio) < 0.01);

        if (isGeometric && Math.abs(avgRatio - 1) > 0.01) {
            return {
                type: 'numeric',
                increment: avgRatio,
                confidence: 90,
                description: `Geometric sequence (×${avgRatio.toFixed(2)})`
            };
        }
    }

    return {
        type: 'numeric',
        increment: 0,
        confidence: 30,
        description: 'No clear pattern'
    };
}

/**
 * Detect formula pattern
 */
function detectFormulaPattern(values: CellValue[]): FillPattern | null {
    const formulas = values.filter(v => isFormula(String(v))).map(String);

    if (formulas.length === 0) return null;

    // Get the most recent formula
    const lastFormula = formulas[formulas.length - 1];

    return {
        type: 'formula',
        formula: lastFormula,
        confidence: 85,
        description: 'Auto-increment formula cell references'
    };
}

/**
 * Detect text pattern
 */
function detectTextPattern(texts: string[]): FillPattern | null {
    if (texts.length < 2) {
        return {
            type: 'text',
            confidence: 50,
            description: 'Repeat text'
        };
    }

    // Check for number suffix increment (e.g., "Item 1", "Item 2", "Item 3")
    const pattern = /^(.+?)(\d+)$/;
    const matches = texts.map(t => t.match(pattern));

    if (matches.every(m => m !== null)) {
        const prefixes = matches.map(m => m![1]);
        const numbers = matches.map(m => parseInt(m![2]));

        // Check if all prefixes are the same
        if (prefixes.every(p => p === prefixes[0])) {
            // Check if numbers increment by 1
            let isSequential = true;
            for (let i = 1; i < numbers.length; i++) {
                if (numbers[i] !== numbers[i - 1] + 1) {
                    isSequential = false;
                    break;
                }
            }

            if (isSequential) {
                return {
                    type: 'text',
                    increment: 1,
                    confidence: 95,
                    description: `Text sequence ("${prefixes[0]}N")`
                };
            }
        }
    }

    // Check for days of week
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const lowerTexts = texts.map(t => t.toLowerCase());

    if (lowerTexts.every(t => daysOfWeek.includes(t))) {
        return {
            type: 'text',
            confidence: 90,
            description: 'Days of week sequence'
        };
    }

    // Check for months
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    if (lowerTexts.every(t => months.includes(t))) {
        return {
            type: 'text',
            confidence: 90,
            description: 'Months sequence'
        };
    }

    return {
        type: 'text',
        confidence: 30,
        description: 'No clear text pattern'
    };
}

/**
 * Generate the next value(s) based on detected pattern
 */
export function generateNextValues(values: CellValue[], count: number, startRow: number): CellValue[] {
    const pattern = detectPattern(values);

    if (!pattern || pattern.confidence < 40) {
        // No clear pattern, repeat last value
        const lastValue = values[values.length - 1];
        return Array(count).fill(lastValue);
    }

    const result: CellValue[] = [];

    switch (pattern.type) {
        case 'numeric':
            const lastNum = Number(values[values.length - 1]);
            for (let i = 0; i < count; i++) {
                if (pattern.increment !== undefined && pattern.increment > 1.5) {
                    // Geometric sequence
                    result.push(lastNum * Math.pow(pattern.increment, i + 1));
                } else {
                    // Arithmetic sequence
                    result.push(lastNum + (pattern.increment || 0) * (i + 1));
                }
            }
            break;

        case 'formula':
            // Increment cell references in formula
            const lastFormula = String(values[values.length - 1]);
            for (let i = 0; i < count; i++) {
                result.push(incrementFormulaReferences(lastFormula, i + 1 + startRow));
            }
            break;

        case 'text':
            const lastText = String(values[values.length - 1]);

            // Check for number suffix
            const match = lastText.match(/^(.+?)(\d+)$/);
            if (match && pattern.increment) {
                const prefix = match[1];
                const lastNum = parseInt(match[2]);
                for (let i = 0; i < count; i++) {
                    result.push(`${prefix}${lastNum + pattern.increment * (i + 1)}`);
                }
            } else if (pattern.description.includes('Days of week')) {
                result.push(...generateDaysOfWeek(lastText, count));
            } else if (pattern.description.includes('Months')) {
                result.push(...generateMonths(lastText, count));
            } else {
                // Repeat last value
                result.push(...Array(count).fill(lastText));
            }
            break;

        default:
            // Repeat last value
            const lastValue = values[values.length - 1];
            result.push(...Array(count).fill(lastValue));
    }

    return result;
}

/**
 * Increment cell references in a formula
 * e.g., "=B2+C2" becomes "=B3+C3" when incrementing by 1
 */
function incrementFormulaReferences(formula: string, increment: number): string {
    return formula.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
        const newRow = parseInt(row) + increment;
        return `${col}${newRow}`;
    });
}

/**
 * Generate next days of week
 */
function generateDaysOfWeek(lastDay: string, count: number): string[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const lowerDays = days.map(d => d.toLowerCase());

    const lastIndex = lowerDays.indexOf(lastDay.toLowerCase());
    if (lastIndex === -1) return Array(count).fill(lastDay);

    const result: string[] = [];
    for (let i = 0; i < count; i++) {
        const nextIndex = (lastIndex + i + 1) % 7;
        // Match capitalization of input
        const isCapitalized = lastDay[0] === lastDay[0].toUpperCase();
        const day = days[nextIndex];
        result.push(isCapitalized ? day : day.toLowerCase());
    }
    return result;
}

/**
 * Generate next months
 */
function generateMonths(lastMonth: string, count: number): string[] {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const lowerMonths = months.map(m => m.toLowerCase());

    const lastIndex = lowerMonths.indexOf(lastMonth.toLowerCase());
    if (lastIndex === -1) return Array(count).fill(lastMonth);

    const result: string[] = [];
    for (let i = 0; i < count; i++) {
        const nextIndex = (lastIndex + i + 1) % 12;
        const isCapitalized = lastMonth[0] === lastMonth[0].toUpperCase();
        const month = months[nextIndex];
        result.push(isCapitalized ? month : month.toLowerCase());
    }
    return result;
}

/**
 * AI-enhanced pattern detection prompt generator
 */
export function generateAIFillPrompt(
    values: CellValue[],
    columnName: string,
    data: RowData[],
    columns: string[]
): string {
    const pattern = detectPattern(values);

    return `I'm filling cells in column "${columnName}" by dragging down. Here are the last few values:
${values.map((v, i) => `  Row ${i + 1}: ${v}`).join('\n')}

${pattern ? `Detected pattern: ${pattern.description} (confidence: ${pattern.confidence}%)` : 'No clear pattern detected'}

Full data context:
Columns: ${columns.join(', ')}
Sample data: ${JSON.stringify(data.slice(0, 3))}

Please generate the next value that would logically continue this sequence. If it's a formula, make sure cell references increment correctly. Return ONLY the value, no explanation.`;
}
