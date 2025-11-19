/**
 * Formula Context for AI
 * This file provides comprehensive documentation of all available formulas
 * to be used as context for AI formula generation and fixing
 */

export interface FormulaFunction {
    name: string;
    description: string;
    syntax: string;
    examples: string[];
    category: 'math' | 'statistical' | 'arithmetic' | 'logical';
}

export const FORMULA_FUNCTIONS: FormulaFunction[] = [
    {
        name: 'SUM',
        description: 'Adds all numbers in a range of cells',
        syntax: '=SUM(range)',
        examples: [
            '=SUM(B2:E2)  // Sum row 2 from column B to E',
            '=SUM(A1:A10) // Sum column A from row 1 to 10',
            '=SUM(B2:D5)  // Sum all cells in rectangular range'
        ],
        category: 'math'
    },
    {
        name: 'AVERAGE',
        description: 'Calculates the average (mean) of numbers in a range',
        syntax: '=AVERAGE(range)',
        examples: [
            '=AVERAGE(B2:E2)  // Average of row 2 from column B to E',
            '=AVERAGE(A1:A10) // Average of column A from row 1 to 10'
        ],
        category: 'statistical'
    },
    {
        name: 'AVG',
        description: 'Alias for AVERAGE - calculates the mean of numbers',
        syntax: '=AVG(range)',
        examples: [
            '=AVG(B2:E2)  // Same as AVERAGE'
        ],
        category: 'statistical'
    },
    {
        name: 'MAX',
        description: 'Returns the largest number in a range',
        syntax: '=MAX(range)',
        examples: [
            '=MAX(C2:C10) // Find highest value in column C',
            '=MAX(B2:E5)  // Find highest value in rectangular range'
        ],
        category: 'statistical'
    },
    {
        name: 'MIN',
        description: 'Returns the smallest number in a range',
        syntax: '=MIN(range)',
        examples: [
            '=MIN(D2:D10) // Find lowest value in column D',
            '=MIN(B2:E5)  // Find lowest value in rectangular range'
        ],
        category: 'statistical'
    },
    {
        name: 'COUNT',
        description: 'Counts how many numbers are in a range',
        syntax: '=COUNT(range)',
        examples: [
            '=COUNT(A2:A10) // Count numeric values in column A'
        ],
        category: 'statistical'
    },
    {
        name: 'MEDIAN',
        description: 'Returns the median (middle value) of numbers in a range',
        syntax: '=MEDIAN(range)',
        examples: [
            '=MEDIAN(B2:B20) // Find median of column B'
        ],
        category: 'statistical'
    },
    {
        name: 'PRODUCT',
        description: 'Multiplies all numbers in a range together',
        syntax: '=PRODUCT(range)',
        examples: [
            '=PRODUCT(B2:B5) // Multiply all values in range'
        ],
        category: 'math'
    }
];

export const ARITHMETIC_OPERATIONS = [
    {
        operation: 'Addition',
        description: 'Add two or more cell values or numbers',
        syntax: '=CELL1 + CELL2 + ...',
        examples: [
            '=B2+C2        // Add two cells',
            '=B2+C2+D2     // Add three cells',
            '=B2+100       // Add cell and number',
            '=(B2+C2)*D2   // Use parentheses for order of operations'
        ]
    },
    {
        operation: 'Subtraction',
        description: 'Subtract cell values or numbers',
        syntax: '=CELL1 - CELL2',
        examples: [
            '=B2-C2        // Subtract C2 from B2',
            '=B2-C2-D2     // Subtract multiple values',
            '=(B2-C2)/D2   // Calculate difference and divide'
        ]
    },
    {
        operation: 'Multiplication',
        description: 'Multiply cell values or numbers',
        syntax: '=CELL1 * CELL2',
        examples: [
            '=B2*C2        // Multiply two cells',
            '=B2*0.10      // Calculate 10% of B2',
            '=B2*C2*D2     // Multiply multiple cells'
        ]
    },
    {
        operation: 'Division',
        description: 'Divide cell values or numbers',
        syntax: '=CELL1 / CELL2',
        examples: [
            '=B2/C2        // Divide B2 by C2',
            '=B2/100       // Divide by constant',
            '=(B2+C2)/D2   // Divide sum by value'
        ]
    },
    {
        operation: 'Percentage',
        description: 'Calculate percentage of values',
        syntax: '=(CELL1/CELL2)*100',
        examples: [
            '=(B2/C2)*100     // Calculate percentage',
            '=(B2/C2)*100     // What percent is B2 of C2?',
            '=((B2-C2)/C2)*100 // Calculate percentage change'
        ]
    }
];

export const COMMON_PATTERNS = [
    {
        pattern: 'Profit Calculation',
        description: 'Calculate profit from revenue and cost',
        formula: '=Revenue - Cost',
        example: '=B2-C2  // If B2 is Revenue, C2 is Cost'
    },
    {
        pattern: 'Profit Margin',
        description: 'Calculate profit margin as percentage',
        formula: '=(Profit/Revenue)*100',
        example: '=(D2/B2)*100  // If D2 is Profit, B2 is Revenue'
    },
    {
        pattern: 'Total Row Sum',
        description: 'Sum all values in a row',
        formula: '=SUM(FirstCol:LastCol)',
        example: '=SUM(B2:E2)  // Sum columns B through E in row 2'
    },
    {
        pattern: 'Column Average',
        description: 'Average all values in a column',
        formula: '=AVERAGE(FirstRow:LastRow)',
        example: '=AVERAGE(B2:B10)  // Average column B from rows 2-10'
    },
    {
        pattern: 'Percentage Growth',
        description: 'Calculate percentage growth/change',
        formula: '=((New-Old)/Old)*100',
        example: '=((C2-B2)/B2)*100  // Growth from B2 to C2'
    }
];

/**
 * Generate comprehensive formula context for AI
 */
export function getFormulaContextForAI(): string {
    let context = `# LUMINA SHEETS - FORMULA REFERENCE

## IMPORTANT RULES:
1. Cell references use COLUMN LETTER + ROW NUMBER (e.g., A1, B2, C10)
2. Formulas MUST start with = sign
3. Currency symbols ($) are automatically handled - DO NOT use VALUE() or SUBSTITUTE()
4. Column letters are case-insensitive (B2 = b2)
5. Ranges use colon notation (B2:E2 for row, A1:A10 for column)

## AVAILABLE FUNCTIONS:\n\n`;

    // Add all formula functions
    const categories = ['math', 'statistical', 'arithmetic', 'logical'] as const;
    categories.forEach(cat => {
        const funcs = FORMULA_FUNCTIONS.filter(f => f.category === cat);
        if (funcs.length > 0) {
            context += `### ${cat.toUpperCase()} FUNCTIONS:\n\n`;
            funcs.forEach(func => {
                context += `**${func.name}**\n`;
                context += `  Description: ${func.description}\n`;
                context += `  Syntax: ${func.syntax}\n`;
                context += `  Examples:\n`;
                func.examples.forEach(ex => {
                    context += `    ${ex}\n`;
                });
                context += `\n`;
            });
        }
    });

    // Add arithmetic operations
    context += `## ARITHMETIC OPERATIONS:\n\n`;
    ARITHMETIC_OPERATIONS.forEach(op => {
        context += `**${op.operation}**\n`;
        context += `  Description: ${op.description}\n`;
        context += `  Syntax: ${op.syntax}\n`;
        context += `  Examples:\n`;
        op.examples.forEach(ex => {
            context += `    ${ex}\n`;
        });
        context += `\n`;
    });

    // Add common patterns
    context += `## COMMON FORMULA PATTERNS:\n\n`;
    COMMON_PATTERNS.forEach(pattern => {
        context += `**${pattern.pattern}**\n`;
        context += `  Description: ${pattern.description}\n`;
        context += `  Formula: ${pattern.formula}\n`;
        context += `  Example: ${pattern.example}\n\n`;
    });

    return context;
}

/**
 * Get a brief summary of available formulas for inline help
 */
export function getFormulaSummary(): string {
    const functionNames = FORMULA_FUNCTIONS.map(f => f.name).join(', ');
    return `Available functions: ${functionNames}\nArithmetic: +, -, *, /\nPercentage: (A/B)*100`;
}

/**
 * Search for formulas by keyword
 */
export function searchFormulas(keyword: string): FormulaFunction[] {
    const lower = keyword.toLowerCase();
    return FORMULA_FUNCTIONS.filter(f =>
        f.name.toLowerCase().includes(lower) ||
        f.description.toLowerCase().includes(lower) ||
        f.examples.some(ex => ex.toLowerCase().includes(lower))
    );
}
