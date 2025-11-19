import { RowData } from '../types';

// Parse natural language filter command
export interface FilterRule {
    column: string;
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'contains' | 'startsWith' | 'endsWith';
    value: string | number;
}

export function parseFilterCommand(command: string, columns: string[]): FilterRule | null {
    const lower = command.toLowerCase().trim();

    // Pattern: "show/filter [column] where [condition]"
    // Examples:
    // - "show profit > 100"
    // - "filter product contains phone"
    // - "where cost < 500"

    // Remove common prefixes
    let cleanCmd = lower
        .replace(/^(show|filter|where|get|find)\s+(me\s+)?/i, '')
        .replace(/\s+is\s+/gi, ' = ')
        .replace(/\s+equals?\s+/gi, ' = ')
        .replace(/\s+greater\s+than\s+/gi, ' > ')
        .replace(/\s+less\s+than\s+/gi, ' < ')
        .replace(/\s+not\s+/gi, ' != ');

    // Try to find column name
    let matchedColumn: string | null = null;
    let remainingCmd = cleanCmd;

    for (const col of columns) {
        const colLower = col.toLowerCase();
        if (cleanCmd.includes(colLower)) {
            matchedColumn = col;
            remainingCmd = cleanCmd.replace(colLower, '').trim();
            break;
        }
    }

    if (!matchedColumn) return null;

    // Parse operator and value
    const operators = [
        { pattern: />=\s*(.+)/, op: '>=' as const },
        { pattern: /<=\s*(.+)/, op: '<=' as const },
        { pattern: /!=\s*(.+)/, op: '!=' as const },
        { pattern: />\s*(.+)/, op: '>' as const },
        { pattern: /<\s*(.+)/, op: '<' as const },
        { pattern: /=\s*(.+)/, op: '=' as const },
        { pattern: /contains?\s+(.+)/i, op: 'contains' as const },
        { pattern: /starts?\s+with\s+(.+)/i, op: 'startsWith' as const },
        { pattern: /ends?\s+with\s+(.+)/i, op: 'endsWith' as const },
    ];

    for (const { pattern, op } of operators) {
        const match = remainingCmd.match(pattern);
        if (match) {
            let value: string | number = match[1].trim();

            // Try to parse as number
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && isFinite(numValue)) {
                value = numValue;
            }

            return {
                column: matchedColumn,
                operator: op,
                value
            };
        }
    }

    return null;
}

// Apply filter rule to data
export function applyFilter(data: RowData[], rule: FilterRule): RowData[] {
    return data.filter(row => {
        const cellValue = row[rule.column];

        if (cellValue === null || cellValue === undefined) {
            return false;
        }

        const cellStr = String(cellValue).toLowerCase();
        const ruleValueStr = String(rule.value).toLowerCase();

        switch (rule.operator) {
            case '>':
                return Number(cellValue) > Number(rule.value);
            case '<':
                return Number(cellValue) < Number(rule.value);
            case '>=':
                return Number(cellValue) >= Number(rule.value);
            case '<=':
                return Number(cellValue) <= Number(rule.value);
            case '=':
                return cellStr === ruleValueStr;
            case '!=':
                return cellStr !== ruleValueStr;
            case 'contains':
                return cellStr.includes(ruleValueStr);
            case 'startsWith':
                return cellStr.startsWith(ruleValueStr);
            case 'endsWith':
                return cellStr.endsWith(ruleValueStr);
            default:
                return true;
        }
    });
}

// Get human-readable description of filter
export function describeFilter(rule: FilterRule): string {
    const opMap = {
        '>': 'greater than',
        '<': 'less than',
        '>=': 'greater than or equal to',
        '<=': 'less than or equal to',
        '=': 'equals',
        '!=': 'not equal to',
        'contains': 'contains',
        'startsWith': 'starts with',
        'endsWith': 'ends with'
    };

    return `${rule.column} ${opMap[rule.operator]} ${rule.value}`;
}
