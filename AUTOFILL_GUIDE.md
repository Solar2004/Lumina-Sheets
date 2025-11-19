# Multi-Directional Auto-Fill Feature

## 🎯 Overview
Lumina-Sheets now supports **multi-directional auto-fill** with pattern detection! You can drag the fill handle in any direction to automatically complete patterns.

## ✨ Features

### 1. **Multi-Directional Fill**
- ⬇️ **Down**: Drag down to fill cells below
- ⬆️ **Up**: Drag up to fill cells above
- ➡️ **Right**: Drag right to fill cells to the right
- ⬅️ **Left**: Drag left to fill cells to the left

### 2. **Pattern Detection**
The system automatically detects various patterns:
- **Numeric sequences**: `1, 2, 3` → `4, 5, 6...`
- **Geometric sequences**: `2, 4, 8` → `16, 32, 64...`
- **Text patterns**: `Item 1, Item 2` → `Item 3, Item 4...`
- **Days of week**: `Monday, Tuesday` → `Wednesday, Thursday...`
- **Months**: `January, February` → `March, April...`
- **Formulas**: `=A1+B1, =A2+B2` → `=A3+B3, =A4+B4...`

### 3. **Smart Formula References**
When filling formulas:
- **Vertical fill** (up/down): Row numbers increment/decrement
  - `=A1+B1` → `=A2+B2` (down) or `=A0+B0` (up)
- **Horizontal fill** (left/right): Column letters increment/decrement
  - `=A1+B1` → `=B1+C1` (right) or `=Z1+A1` (left)

## 🎮 How to Use

### Basic Usage
1. **Select a cell** with data
2. **Click the small blue square** in the bottom-right corner of the selected cell
3. **Drag in any direction** (up, down, left, or right)
4. **Release** to auto-fill with the detected pattern

### Pattern Preview
- As you drag, you'll see a **tooltip** showing the detected pattern
- The confidence level indicates how certain the system is about the pattern
- Direction arrows (↓ ↑ → ←) show which way you're filling

### Multiple Cell Selection
1. **Enter values** in multiple cells to establish a pattern
2. **Select the last cell** in your pattern
3. **Drag** to continue the pattern in any direction

## 📊 Examples

### Numeric Sequence
```
Cells: 5, 10, 15
Drag down → 20, 25, 30, 35...
Drag up from 5 → 0, -5, -10...
```

### Days of Week
```
Cells: Monday
Drag right → Tuesday, Wednesday, Thursday...
Drag left → Sunday, Saturday, Friday...
```

### Formulas (Horizontal)
```
Cell A1: =B1*2
Drag right → C1: =C1*2, D1: =D1*2...
```

### Mixed Patterns
```
Cells: Product 1, Product 2
Drag down → Product 3, Product 4, Product 5...
```

## 🎨 Visual Feedback
- **Selected cell**: Blue outline with fill handle
- **Drag preview**: Dashed blue outline on target cells
- **Pattern tooltip**: Shows detected pattern and direction
- **Formula cells**: Purple background tint

## 💡 Tips
- The more cells you select with a pattern, the more accurate the detection
- For formulas, references automatically adjust based on drag direction
- If no pattern is detected, the last value is repeated
- Works with sorted data - fills based on visual order

## 🔧 Technical Details
- Pattern detection uses AI algorithms with confidence scoring
- Supports both arithmetic and geometric sequences
- Handles edge cases like negative numbers and boundary columns
- Preserves cell formatting and data types
