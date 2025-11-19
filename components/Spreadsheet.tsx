
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RowData, CellValue, Collaborator } from '../types';
import { Plus, Trash2, Image as ImageIcon, ArrowUp, ArrowDown, ArrowUpDown, Edit2 } from 'lucide-react';
import { evaluateFormula, isFormula } from '../utils/formulaEngine';

interface SpreadsheetProps {
  data: RowData[];
  columns: string[];
  onUpdate: (newData: RowData[], newColumns?: string[]) => void;
  onSelectionChange?: (selection: { row: number, col: string } | null) => void;
  collaborators?: Collaborator[];
}

const isImageUrl = (value: string) => {
  return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(value) || value.startsWith('https://images.unsplash.com') || value.startsWith('http');
};

const isNumeric = (val: any): boolean => {
  return !isNaN(parseFloat(val)) && isFinite(val);
};

// Get display value for cell (evaluates formulas)
const getCellDisplayValue = (value: CellValue, data: RowData[], columns: string[]): string | number => {
  if (value === null || value === undefined) return '';

  const strValue = String(value);

  // Check if it's a formula
  if (isFormula(strValue)) {
    const result = evaluateFormula(strValue, data, columns);
    if (result.error) {
      return `#ERROR: ${result.error}`;
    }
    if (result.value === null) return '#N/A';
    return result.value;
  }

  return value;
};

const Spreadsheet: React.FC<SpreadsheetProps> = ({ data, columns, onUpdate, onSelectionChange, collaborators = [] }) => {
  // Editing State
  const [editCell, setEditCell] = useState<{ row: number, col: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Header Editing State
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerInputValue, setHeaderInputValue] = useState<string>('');

  // Layout State
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({});

  // Selection State
  const [selectedCell, setSelectedCell] = useState<{ row: number, col: string } | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const resizingRef = useRef<{ col: string, startX: number, startWidth: number } | null>(null);

  // Initialize widths
  useEffect(() => {
    const newWidths = { ...colWidths };
    let changed = false;
    columns.forEach(col => {
      if (!newWidths[col]) {
        newWidths[col] = 150;
        changed = true;
      }
    });
    if (changed) setColWidths(newWidths);
  }, [columns]);

  // --- Derived Data (Sorting) ---
  const sortedData = useMemo(() => {
    if (!data) return [];
    // Safety check for undefined rows in data
    const validData = data.filter(d => d !== undefined && d !== null);

    if (!sortConfig) return validData;

    return [...validData].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const compareA = isNumeric(valA) ? Number(valA) : String(valA).toLowerCase();
      const compareB = isNumeric(valB) ? Number(valB) : String(valB).toLowerCase();

      if (compareA < compareB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const toggleSort = (col: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent column selection
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === col && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: col, direction });
  };

  const handleHeaderClick = (col: string) => {
    if (editingHeader) return; // Don't select if editing
    setSelectedColumn(col);
    setSelectedRowIndex(null);
    setSelectedCell(null);
    onSelectionChange && onSelectionChange(null);
  };

  const handleHeaderDoubleClick = (col: string) => {
    setEditingHeader(col);
    setHeaderInputValue(col);
    // Ensure we don't trigger sort or select in a way that conflicts
  };

  const commitHeaderEdit = () => {
    if (!editingHeader) return;
    const oldName = editingHeader;
    const newName = headerInputValue.trim();

    if (!newName) {
      setEditingHeader(null);
      return;
    }

    if (newName !== oldName) {
      if (columns.includes(newName)) {
        alert("Column name already exists");
        // Keep editing state open so user can fix it
        return;
      }

      // Update columns list
      const newColumns = columns.map(c => c === oldName ? newName : c);

      // Update all rows in the original dataset
      const newData = data.map(row => {
        if (!row) return row;
        const newRow = { ...row };
        const val = newRow[oldName];
        delete newRow[oldName];
        newRow[newName] = val;
        return newRow;
      });

      onUpdate(newData, newColumns);

      // Update sort config if needed
      if (sortConfig?.key === oldName) {
        setSortConfig({ ...sortConfig, key: newName });
      }

      // Update selection if needed
      if (selectedColumn === oldName) {
        setSelectedColumn(newName);
      }
    }
    setEditingHeader(null);
  };

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    let count = 0;
    let sum = 0;
    let hasNumbers = false;

    const processVal = (val: any) => {
      if (val !== null && val !== '' && val !== undefined) {
        count++;
        if (isNumeric(val)) {
          const num = Number(val);
          sum += num;
          hasNumbers = true;
        }
      }
    };

    if (selectedColumn) {
      sortedData.forEach(row => {
        if (row) processVal(row[selectedColumn]);
      });
    } else if (selectedRowIndex !== null) {
      const row = sortedData[selectedRowIndex];
      if (row) {
        columns.forEach(col => processVal(row[col]));
      }
    } else if (selectedCell) {
      const row = sortedData[selectedCell.row];
      if (row) {
        processVal(row[selectedCell.col]);
      }
    }

    return { count, sum: hasNumbers ? sum : null, avg: hasNumbers && count > 0 ? sum / count : null };
  }, [selectedCell, selectedRowIndex, selectedColumn, sortedData, columns]);


  // --- Resizing ---
  const startResize = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { col, startX: e.pageX, startWidth: colWidths[col] || 150 };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const newWidth = Math.max(60, startWidth + (e.pageX - startX));
    setColWidths(prev => ({ ...prev, [col]: newWidth }));
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- Editing ---
  const handleCellClick = (rowIndex: number, colKey: string, value: CellValue) => {
    if (editCell?.row === rowIndex && editCell?.col === colKey) return;
    const sel = { row: rowIndex, col: colKey };
    setSelectedCell(sel);
    setSelectedRowIndex(null);
    setSelectedColumn(null);

    setEditCell(sel);
    setTempValue(value === null || value === undefined ? '' : String(value));

    if (onSelectionChange) onSelectionChange(sel);
  };

  const handleRowHeaderClick = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setSelectedCell(null);
    setSelectedColumn(null);
    setEditCell(null);
    onSelectionChange && onSelectionChange(null);
  };

  const handleBlur = () => {
    if (editCell) commitEdit();
  };

  const handleHeaderBlur = () => {
    if (editingHeader) commitHeaderEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditCell(null);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitHeaderEdit();
    if (e.key === 'Escape') setEditingHeader(null);
  };

  const commitEdit = () => {
    if (!editCell) return;

    const visualRow = sortedData[editCell.row];
    if (!visualRow) {
      setEditCell(null);
      return;
    }

    const originalIndex = data.indexOf(visualRow);
    if (originalIndex === -1) return;

    const newData = [...data];
    const row = { ...newData[originalIndex] };

    const numVal = Number(tempValue);
    // Basic number parsing check
    if (!isNaN(numVal) && tempValue.trim() !== '' && !tempValue.startsWith('0') && !tempValue.endsWith('.')) {
      row[editCell.col] = numVal;
    } else {
      row[editCell.col] = tempValue;
    }

    newData[originalIndex] = row;
    onUpdate(newData);
    setEditCell(null);
  };

  // --- Toolbar Actions ---
  const addRow = () => {
    const newRow: RowData = {};
    columns.forEach(c => newRow[c] = null);
    onUpdate([...data, newRow]);
  };

  const addColumn = () => {
    // Generate a unique name automatically without prompt
    let baseName = "Column";
    let counter = columns.length + 1;
    let name = `${baseName} ${counter}`;

    // Ensure uniqueness
    while (columns.includes(name)) {
      counter++;
      name = `${baseName} ${counter}`;
    }

    // Create new data mapping
    // Handle empty data case gracefully
    const newData = data.length > 0
      ? data.map(row => row ? ({ ...row, [name]: null }) : row)
      : [];

    const newColumns = [...columns, name];

    onUpdate(newData, newColumns);
  };

  const deleteRow = () => {
    const idxToDelete = selectedRowIndex !== null ? selectedRowIndex : selectedCell?.row;
    if (idxToDelete === undefined || idxToDelete === null) return;

    const visualRow = sortedData[idxToDelete];
    if (!visualRow) return;

    const originalIndex = data.indexOf(visualRow);

    if (originalIndex > -1) {
      const newData = data.filter((_, i) => i !== originalIndex);
      onUpdate(newData);
      setSelectedCell(null);
      setSelectedRowIndex(null);
    }
  };

  const deleteColumn = () => {
    const colToDelete = selectedColumn || selectedCell?.col;
    if (!colToDelete || columns.length <= 1) return;

    const newData = data.map(row => {
      if (!row) return row;
      const newRow = { ...row };
      delete newRow[colToDelete];
      return newRow;
    });

    const newCols = columns.filter(c => c !== colToDelete);
    onUpdate(newData, newCols);
    setSelectedColumn(null);
    setSelectedCell(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-google-dark border-none shadow-inner overflow-hidden relative">

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-[#2d2e31] border-b border-gray-700 z-20">
        <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-colors">
          <Plus size={14} /> Row
        </button>
        <button onClick={addColumn} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-colors">
          <Plus size={14} /> Column
        </button>
        <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
        <button
          onClick={deleteRow}
          disabled={selectedCell === null && selectedRowIndex === null}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-30"
          title="Delete Selected Row"
        >
          <Trash2 size={14} /> Row
        </button>
        <button
          onClick={deleteColumn}
          disabled={selectedCell === null && selectedColumn === null}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-30"
          title="Delete Selected Column"
        >
          <Trash2 size={14} /> Col
        </button>

        <div className="flex-1"></div>

        {/* Sort Indicator */}
        {sortConfig && (
          <span className="text-[10px] text-blue-300 bg-blue-900/30 px-2 py-1 rounded flex items-center gap-1 animate-in fade-in">
            <span>Sorted by <b>{sortConfig.key}</b></span>
            {sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            <button onClick={() => setSortConfig(null)} className="ml-2 p-0.5 hover:bg-blue-800/50 rounded-full text-blue-200"><div className="text-[10px] font-bold px-1">✕</div></button>
          </span>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-auto flex-1 relative bg-[#202124]">
        <table className="min-w-full divide-y divide-gray-700 table-fixed border-separate border-spacing-0" style={{ width: 'max-content' }}>
          <thead className="sticky top-0 z-10 backdrop-blur-md bg-[#2d2e31]/95 shadow-sm">
            <tr>
              <th className="px-0 py-0 text-left w-12 sticky left-0 z-20 border-r border-b border-gray-600 bg-[#3c4043]">
                <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 font-medium select-none">#</div>
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`
                    relative px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-b border-gray-700 group select-none cursor-pointer transition-colors
                    ${selectedColumn === col ? 'bg-blue-900/40 text-blue-300' : 'text-gray-300 hover:bg-[#3c4043]'}
                  `}
                  style={{ width: colWidths[col] || 150 }}
                  onClick={() => handleHeaderClick(col)}
                  onDoubleClick={() => handleHeaderDoubleClick(col)}
                  title="Click to select, Double-click to rename"
                >
                  {editingHeader === col ? (
                    <input
                      autoFocus
                      className="w-full bg-[#202124] text-white border border-blue-500 rounded px-1 py-0.5 outline-none font-normal normal-case"
                      value={headerInputValue}
                      onChange={(e) => setHeaderInputValue(e.target.value)}
                      onBlur={handleHeaderBlur}
                      onKeyDown={handleHeaderKeyDown}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center justify-between px-1">
                      <span className="truncate">{col}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => toggleSort(col, e)}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${sortConfig?.key === col ? 'text-blue-400 opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-500'}`}
                          title="Toggle Sort"
                        >
                          {sortConfig?.key === col ? (
                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 z-30"
                    onMouseDown={(e) => startResize(e, col)}
                    onClick={(e) => e.stopPropagation()}
                  ></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedData.map((row, rowIndex) => {
              if (!row) return null;
              return (
                <tr
                  key={rowIndex}
                  className={`
                  transition-colors group
                  ${selectedRowIndex === rowIndex ? 'bg-blue-900/30' : 'hover:bg-gray-800/50'}
                `}
                >
                  <td
                    onClick={() => handleRowHeaderClick(rowIndex)}
                    className={`
                    px-2 py-2 whitespace-nowrap text-xs border-r border-b border-gray-800 sticky left-0 group-hover:bg-[#2a2b2e] cursor-pointer text-center transition-colors
                    ${selectedRowIndex === rowIndex ? 'bg-blue-900/30 text-blue-300' : 'bg-[#202124] text-gray-500 hover:text-blue-400'}
                  `}
                  >
                    {rowIndex + 1}
                  </td>
                  {columns.map((col) => {
                    const isEditing = editCell?.row === rowIndex && editCell?.col === col;
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === col;
                    const isColSelected = selectedColumn === col;

                    const value = row[col];

                    // Get display value (evaluates formulas)
                    const displayValue = getCellDisplayValue(value, sortedData, columns);
                    const valString = String(displayValue !== null && displayValue !== undefined ? displayValue : '');
                    const isImg = isImageUrl(valString);
                    const isNum = isNumeric(displayValue) && displayValue !== '';
                    const isNegative = isNum && Number(displayValue) < 0;
                    const isFormulaCell = isFormula(String(value || ''));

                    // Collaborator cursor check
                    const remoteUser = collaborators.find(u => u.selection?.row === rowIndex && u.selection?.col === col);

                    let bgClass = '';
                    if (isSelected) bgClass = 'bg-blue-600/20 outline outline-2 outline-blue-500 -outline-offset-2 z-10';
                    else if (remoteUser) bgClass = 'z-10'; // Just z-index boost for border
                    else if (isColSelected) bgClass = 'bg-blue-900/10';

                    return (
                      <td
                        key={`${rowIndex}-${col}`}
                        className={`
                        px-2 py-1.5 text-sm border-r border-b border-gray-800 relative cursor-text
                        ${bgClass}
                        ${isEditing ? 'p-0' : ''}
                        ${isNum ? 'text-right font-mono' : 'text-left'}
                        ${isNegative ? 'text-red-400' : 'text-gray-300'}
                        ${isFormulaCell ? 'bg-purple-900/10' : ''}
                      `}
                        onClick={() => handleCellClick(rowIndex, col, value)}
                        style={{
                          width: colWidths[col] || 150,
                          maxWidth: colWidths[col] || 150,
                          boxShadow: remoteUser ? `inset 0 0 0 2px ${remoteUser.color}` : undefined
                        }}
                      >
                        {remoteUser && (
                          <div
                            className="absolute -top-3 left-0 text-[9px] px-1 rounded-t text-white z-20 pointer-events-none whitespace-nowrap shadow-sm"
                            style={{ backgroundColor: remoteUser.color }}
                          >
                            {remoteUser.name}
                          </div>
                        )}

                        {isEditing ? (
                          <input
                            autoFocus
                            className="w-full h-full bg-[#303134] text-white outline-none px-2 py-1 font-mono"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                          />
                        ) : (
                          <div className="px-1 truncate min-h-[24px] flex items-center w-full h-full">
                            {isImg ? (
                              <div className="relative group/img w-full h-10 flex items-center justify-center bg-black/20 rounded overflow-hidden">
                                <img src={valString} alt="Cell content" className="max-h-full max-w-full object-contain" />
                                <a
                                  href={valString}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ImageIcon size={14} />
                                </a>
                              </div>
                            ) : (
                              <span className="w-full truncate block">
                                {isNum ? Number(displayValue).toLocaleString(undefined, { maximumFractionDigits: 4 }) : valString}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
            <p>Empty dataset.</p>
            <button onClick={addRow} className="text-blue-400 hover:underline text-sm">Add a row</button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-[#2d2e31] border-t border-gray-700 px-4 py-1.5 text-[11px] text-gray-400 flex items-center justify-end gap-4 select-none h-8">
        {stats.count > 0 ? (
          <>
            <div className="flex items-center gap-1">
              <span>Count:</span>
              <span className="text-gray-200 font-medium">{stats.count}</span>
            </div>
            {stats.sum !== null && (
              <>
                <div className="w-[1px] h-3 bg-gray-600"></div>
                <div className="flex items-center gap-1">
                  <span>Sum:</span>
                  <span className="text-gray-200 font-medium">{stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="w-[1px] h-3 bg-gray-600"></div>
                <div className="flex items-center gap-1">
                  <span>Avg:</span>
                  <span className="text-gray-200 font-medium">{stats.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <span>Ready</span>
        )}
      </div>
    </div>
  );
};

export default Spreadsheet;