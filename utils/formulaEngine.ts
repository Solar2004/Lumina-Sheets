import { RowData } from '../types';

// Formula evaluation engine
export interface FormulaResult {
    value: number | string | null;
    error?: string;
}

// Parse cell reference like "B2" to {col: "B", row: 2}
function parseCellRef(ref: string): { col: string; row: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return { col: match[1], row: parseInt(match[2]) };
}

// Parse range like "B2:E2" to array of cell refs
function parseRange(range: string): string[] | null {
    const parts = range.split(':');
    if (parts.length !== 2) return null;

    const start = parseCellRef(parts[0]);
    const end = parseCellRef(parts[1]);
    if (!start || !end) return null;

    const cells: string[] = [];

    // Convert column letter to number (A=1, B=2, etc.)
    const colToNum = (col: string) => {
        let num = 0;
        for (let i = 0; i < col.length; i++) {
            num = num * 26 + (col.charCodeAt(i) - 64);
        }
        return num;
    };

    // Convert number to column letter
    const numToCol = (num: number): string => {
        let col = '';
        while (num > 0) {
            const remainder = (num - 1) % 26;
            col = String.fromCharCode(65 + remainder) + col;
            num = Math.floor((num - 1) / 26);
        }
        return col;
    };

    const startCol = colToNum(start.col);
    const endCol = colToNum(end.col);
    const startRow = start.row;
    const endRow = end.row;

    // Generate all cells in range
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            cells.push(`${numToCol(col)}${row}`);
        }
    }

    return cells;
}

// Convert column letter to index (A=0, B=1, etc.)
function columnLetterToIndex(letter: string): number {
    let num = 0;
    for (let i = 0; i < letter.length; i++) {
        num = num * 26 + (letter.charCodeAt(i) - 64);
    }
    return num - 1; // Convert to 0-indexed
}

// Get cell value from data
function getCellValue(cellRef: string, data: RowData[], columns: string[], visited: Set<string> = new Set()): number | null {
    // Check for circular references
    if (visited.has(cellRef)) return 0;

    const parsed = parseCellRef(cellRef);
    if (!parsed) return null;

    const rowIndex = parsed.row - 1; // Convert to 0-indexed
    if (rowIndex < 0 || rowIndex >= data.length) return null;

    // Map column letter to actual column name
    const colIndex = columnLetterToIndex(parsed.col);
    if (colIndex < 0 || colIndex >= columns.length) return null;

    const actualColumnName = columns[colIndex];
    const row = data[rowIndex];
    let value = row[actualColumnName];

    // If the value is a formula, evaluate it first
    if (value !== null && value !== undefined && isFormula(String(value))) {
        // Create a new set for the next level to track path
        const newVisited = new Set(visited);
        newVisited.add(cellRef);

        // Pass visited set to evaluateFormula (we need to update evaluateFormula signature too, or handle it here)
        // Since we can't easily change evaluateFormula signature everywhere, we'll just use a simplified evaluation here
        // or we assume evaluateFormula will call getCellValue which will check the visited set if we could pass it.

        // PROBLEM: evaluateFormula doesn't accept visited. 
        // FIX: We will just return 0 if it's a formula to be safe for now, OR we implement the internal evaluator.
        // Given the user wants a quick push, let's revert to non-recursive for safety OR implement the fix properly.

        // Let's try to pass visited by temporarily attaching it to the function or similar hack? No.
        // Let's just NOT evaluate recursive formulas for this push to ensure stability.
        // It's better to have 0 than a crash.

        // BUT the user specifically asked for formula chaining.
        // Let's implement the internal evaluator pattern correctly this time.

        return evaluateFormulaInternal(String(value), data, columns, newVisited).value as number;
    }

    if (value === null || value === undefined || value === '') return 0;

    const num = parseFloat(String(value).replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
}

// Internal evaluator that accepts visited set
function evaluateFormulaInternal(formula: string, data: RowData[], columns: string[], visited: Set<string>): FormulaResult {
    // Remove leading =
    let expr = formula.trim();
    if (expr.startsWith('=')) {
        expr = expr.substring(1);
    }

    // Check if it's a simple cell reference to pass visited
    const cellRef = parseCellRef(expr);
    if (cellRef) {
        const value = getCellValue(expr, data, columns, visited);
        return { value };
    }

    // For arithmetic, we need to manually parse and call getCellValue with visited
    try {
        let evalExpr = expr;
        const cellRefs = expr.match(/[A-Z]+\d+/g) || [];

        for (const ref of cellRefs) {
            const value = getCellValue(ref, data, columns, visited);
            if (value === null) return { value: null, error: `Invalid ref: ${ref}` };
            evalExpr = evalExpr.replace(new RegExp(ref, 'g'), String(value));
        }

        if (!/^[\d\s+\-*/.()]+$/.test(evalExpr)) return { value: null, error: 'Invalid expression' };

        const result = eval(evalExpr);
        return { value: isFinite(result) && !isNaN(result) ? result : null };
    } catch (e) {
        return { value: null, error: 'Eval error' };
    }
}

// Evaluate formula functions
function evaluateFunction(funcName: string, args: string[], data: RowData[], columns: string[]): FormulaResult {
    const func = funcName.toUpperCase();

    // Get all values from arguments (handle ranges)
    const values: number[] = [];
    for (const arg of args) {
        if (arg.includes(':')) {
            // Range
            const cells = parseRange(arg);
            if (!cells) return { value: null, error: `Invalid range: ${arg}` };

            for (const cell of cells) {
                const val = getCellValue(cell, data, columns);
                if (val !== null) values.push(val);
            }
        } else {
            // Single cell
            const val = getCellValue(arg, data, columns);
            if (val !== null) values.push(val);
        }
    }

    if (values.length === 0) {
        return { value: 0 };
    }

    switch (func) {
        case 'SUM':
            return { value: values.reduce((a, b) => a + b, 0) };

        case 'AVERAGE':
        case 'AVG':
            return { value: values.reduce((a, b) => a + b, 0) / values.length };

        case 'MAX':
            return { value: Math.max(...values) };

        case 'MIN':
            return { value: Math.min(...values) };

        case 'COUNT':
            return { value: values.length };

        case 'MEDIAN':
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return {
                value: sorted.length % 2 === 0
                    ? (sorted[mid - 1] + sorted[mid]) / 2
                    : sorted[mid]
            };

        case 'PRODUCT':
            return { value: values.reduce((a, b) => a * b, 1) };

        default:
            return { value: null, error: `Unknown function: ${funcName}` };
    }
}

// Main formula evaluator
export function evaluateFormula(formula: string, data: RowData[], columns: string[]): FormulaResult {
    // Remove leading =
    let expr = formula.trim();
    if (expr.startsWith('=')) {
        expr = expr.substring(1);
    }

    // Check if it's a function call
    const funcMatch = expr.match(/^([A-Z]+)\((.*)\)$/i);
    if (funcMatch) {
        const funcName = funcMatch[1];
        const argsStr = funcMatch[2];

        // Parse arguments (split by comma, but not inside parentheses)
        const args: string[] = [];
        let current = '';
        let depth = 0;

        for (const char of argsStr) {
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (char === ',' && depth === 0) {
                args.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        if (current.trim()) args.push(current.trim());

        return evaluateFunction(funcName, args, data, columns);
    }

    // Check if it's a simple cell reference
    const cellRef = parseCellRef(expr);
    if (cellRef) {
        const value = getCellValue(expr, data, columns);
        return { value };
    }

    // Try to evaluate as arithmetic expression
    try {
        // Replace cell references with values
        let evalExpr = expr;
        const cellRefs = expr.match(/[A-Z]+\d+/g) || [];

        for (const ref of cellRefs) {
            const value = getCellValue(ref, data, columns);
            if (value === null) {
                return { value: null, error: `Invalid cell reference: ${ref}` };
            }
            evalExpr = evalExpr.replace(new RegExp(ref, 'g'), String(value));
        }

        // Safe eval (only allow numbers and basic operators)
        if (!/^[\d\s+\-*/.()]+$/.test(evalExpr)) {
            return { value: null, error: 'Invalid expression' };
        }

        const result = eval(evalExpr);
        if (!isFinite(result) || isNaN(result)) {
            return { value: null, error: 'Calculation Error' };
        }
        return { value: result };
    } catch (error) {
        return { value: null, error: 'Evaluation error' };
    }
}

// Check if a value is a formula
export function isFormula(value: any): boolean {
    return typeof value === 'string' && value.trim().startsWith('=');
}

// AI-assisted formula builder
export interface FormulaTemplate {
    name: string;
    description: string;
    template: string;
    example: string;
}

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
    {
        name: 'Sum',
        description: 'Add up numbers in a range',
        template: '=SUM(START:END)',
        example: '=SUM(B2:E2)'
    },
    {
        name: 'Average',
        description: 'Calculate average of numbers',
        template: '=AVERAGE(START:END)',
        example: '=AVERAGE(B2:B10)'
    },
    {
        name: 'Maximum',
        description: 'Find the largest number',
        template: '=MAX(START:END)',
        example: '=MAX(C2:C10)'
    },
    {
        name: 'Minimum',
        description: 'Find the smallest number',
        template: '=MIN(START:END)',
        example: '=MIN(D2:D10)'
    },
    {
        name: 'Count',
        description: 'Count how many numbers',
        template: '=COUNT(START:END)',
        example: '=COUNT(A2:A10)'
    },
    {
        name: 'Arithmetic',
        description: 'Basic math operations',
        template: '=CELL1 + CELL2',
        example: '=B2+C2'
    },
    {
        name: 'Percentage',
        description: 'Calculate percentage',
        template: '=(CELL1/CELL2)*100',
        example: '=(B2/C2)*100'
    }
];

// Parse natural language to formula
export function naturalLanguageToFormula(input: string, columns: string[]): string | null {
    const lower = input.toLowerCase();

    // Sum patterns
    if (lower.includes('sum') || lower.includes('total') || lower.includes('add')) {
        // Try to extract range
        const rangeMatch = input.match(/([A-Z]+\d+):([A-Z]+\d+)/i);
        if (rangeMatch) {
            return `=SUM(${rangeMatch[0].toUpperCase()})`;
        }
    }

    // Average patterns
    if (lower.includes('average') || lower.includes('mean')) {
        const rangeMatch = input.match(/([A-Z]+\d+):([A-Z]+\d+)/i);
        if (rangeMatch) {
            return `=AVERAGE(${rangeMatch[0].toUpperCase()})`;
        }
    }

    // Max/Min patterns
    if (lower.includes('max') || lower.includes('largest') || lower.includes('highest')) {
        const rangeMatch = input.match(/([A-Z]+\d+):([A-Z]+\d+)/i);
        if (rangeMatch) {
            return `=MAX(${rangeMatch[0].toUpperCase()})`;
        }
    }

    if (lower.includes('min') || lower.includes('smallest') || lower.includes('lowest')) {
        const rangeMatch = input.match(/([A-Z]+\d+):([A-Z]+\d+)/i);
        if (rangeMatch) {
            return `=MIN(${rangeMatch[0].toUpperCase()})`;
        }
    }

    return null;
}
