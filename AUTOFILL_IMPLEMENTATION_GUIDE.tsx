/**
 * GUÍA DE IMPLEMENTACIÓN: Auto-Fill Drag en Spreadsheet
 * 
 * Esta guía te muestra exactamente cómo agregar la funcionalidad de
 * arrastrar para auto-completar celdas con detección de patrones.
 */

// ============================================
// PASO 1: Agregar imports necesarios
// ============================================

// En components/Spreadsheet.tsx, agregar al inicio:
import { detectPattern, generateNextValues } from '../utils/autoFill';

// ============================================
// PASO 2: Agregar estados para el drag
// ============================================

// Dentro del componente Spreadsheet, después de los estados existentes:
const [isDragging, setIsDragging] = useState(false);
const [dragRange, setDragRange] = useState<{
  startRow: number;
  endRow: number;
  col: string;
} | null>(null);

// ============================================
// PASO 3: Agregar funciones de manejo de drag
// ============================================

const handleFillHandleMouseDown = (e: React.MouseEvent, rowIndex: number, col: string) => {
  e.preventDefault();
  e.stopPropagation();
  
  setIsDragging(true);
  setDragRange({
    startRow: rowIndex,
    endRow: rowIndex,
    col
  });

  // Agregar listeners globales
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Encontrar la celda sobre la que está el mouse
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cellElement = element?.closest('[data-row-index]');
    
    if (cellElement) {
      const rowIndex = parseInt(cellElement.getAttribute('data-row-index') || '0');
      setDragRange(prev => prev ? { ...prev, endRow: rowIndex } : null);
    }
  };

  const handleMouseUp = () => {
    if (dragRange) {
      performAutoFill();
    }
    setIsDragging(false);
    setDragRange(null);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const performAutoFill = () => {
  if (!dragRange) return;

  const { startRow, endRow, col } = dragRange;
  
  // Solo llenar hacia abajo
  if (endRow <= startRow) return;

  // Obtener los valores existentes hasta startRow
  const sourceValues: CellValue[] = [];
  for (let i = 0; i <= startRow; i++) {
    sourceValues.push(sortedData[i]?.[col] || null);
  }

  // Detectar patrón
  const pattern = detectPattern(sourceValues);
  
  // Calcular cuántos valores necesitamos generar
  const count = endRow - startRow;
  
  // Generar nuevos valores
  const newValues = generateNextValues(sourceValues, count, startRow);

  // Mostrar notificación del patrón detectado (opcional)
  if (pattern) {
    console.log(`Auto-fill pattern detected: ${pattern.description} (${pattern.confidence}% confidence)`);
  }

  // Actualizar los datos
  const newData = [...data];
  
  for (let i = 0; i < count; i++) {
    const targetRow = startRow + i + 1;
    
    if (targetRow < sortedData.length) {
      const visualRow = sortedData[targetRow];
      const originalIndex = data.indexOf(visualRow);
      
      if (originalIndex !== -1) {
        newData[originalIndex] = {
          ...newData[originalIndex],
          [col]: newValues[i]
        };
      }
    } else {
      // Si no hay suficientes filas, crear nuevas
      const newRow: RowData = {};
      columns.forEach(c => newRow[c] = c === col ? newValues[i] : null);
      newData.push(newRow);
    }
  }

  onUpdate(newData);
};

// ============================================
// PASO 4: Agregar el fill handle en el JSX
// ============================================

// En el JSX donde se renderiza cada celda, DENTRO del <td>, agregar:
// (busca la línea donde está "isEditing ? (...)" y agrega esto ANTES del cierre del <td>)

{isSelected && !isEditing && (
  <div
    className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-crosshair hover:w-2.5 hover:h-2.5 rounded-sm z-50 transition-all"
    style={{
      boxShadow: '0 0 0 1px white, 0 1px 3px rgba(0,0,0,0.5)'
    }}
    onMouseDown={(e) => handleFillHandleMouseDown(e, rowIndex, col)}
    title="Drag to fill"
  />
)}

// ============================================
// PASO 5: Agregar preview visual durante drag
// ============================================

// En el JSX de cada celda, agregar clase condicional para mostrar preview:

// Modificar la declaración de bgClass para incluir:
let bgClass = '';
if (isSelected) {
  bgClass = 'bg-blue-600/20 outline outline-2 outline-blue-500 -outline-offset-2 z-10';
} else if (
  dragRange && 
  col === dragRange.col && 
  rowIndex > dragRange.startRow && 
  rowIndex <= dragRange.endRow
) {
  // Celda en el rango de auto-fill
  bgClass = 'bg-blue-500/10 outline outline-2 outline-dashed outline-blue-400/50';
} else if (remoteUser) {
  bgClass = 'z-10';
} else if (isColSelected) {
  bgClass = 'bg-blue-900/10';
} else if (hasError) {
  bgClass = 'bg-red-900/20';
}

// ============================================
// PASO 6: Agregar data-row-index para detección
// ============================================

// En el <tr> de cada fila, agregar:
<tr
  key={rowIndex}
  data-row-index={rowIndex}  // <-- AGREGAR ESTO
  className={`...`}
>

// ============================================
// PASO 7: Estilos CSS adicionales (opcional)
// ============================================

// Agregar en index.css:
/*
.fill-handle {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border: 1px solid white;
  cursor: crosshair;
  border-radius: 2px;
  z-index: 50;
  transition: all 0.15s ease;
}

.fill-handle:hover {
  transform: scale(1.2);
  background: #2563eb;
}

.fill-preview-cell {
  background: rgba(59, 130, 246, 0.1);
  outline: 2px dashed rgba(59, 130, 246, 0.5);
  outline-offset: -2px;
}
*/

// ============================================
// PASO 8: (OPCIONAL) Agregar tooltip de patrón
// ============================================

// Si quieres mostrar el patrón detectado durante el drag:

const [detectedPattern, setDetectedPattern] = useState<string | null>(null);

// En handleFillHandleMouseDown, después de setDragRange:
useEffect(() => {
  if (dragRange && dragRange.endRow > dragRange.startRow) {
    const sourceValues: CellValue[] = [];
    for (let i = 0; i <= dragRange.startRow; i++) {
      sourceValues.push(sortedData[i]?.[dragRange.col] || null);
    }
    const pattern = detectPattern(sourceValues);
    setDetectedPattern(pattern ? pattern.description : null);
  } else {
    setDetectedPattern(null);
  }
}, [dragRange]);

// Agregar en el JSX, al final del contenedor principal:
{detectedPattern && (
  <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium z-50">
    📊 {detectedPattern}
  </div>
)}

// ============================================
// RESUMEN DE CAMBIOS
// ============================================

/*
ARCHIVOS A MODIFICAR:
1. components/Spreadsheet.tsx
   - Agregar imports de autoFill
   - Agregar estados de drag
   - Agregar funciones de manejo
   - Agregar fill handle en JSX
   - Agregar data-row-index
   - Agregar preview visual

ARCHIVOS YA CREADOS:
1. utils/autoFill.ts - Sistema de detección de patrones ✓
2. utils/formulaContext.ts - Contexto completo de fórmulas para IA ✓
3. services/geminiService.ts - Actualizado con contexto de fórmulas ✓

TESTING:
1. Prueba con números: 1, 2, 3 → debe continuar 4, 5, 6
2. Prueba con fórmulas: =A1, =A2 → debe continuar =A3, =A4
3. Prueba con texto: Item 1, Item 2 → debe continuar Item 3, Item 4
4. Prueba con días: Monday, Tuesday → debe continuar Wednesday, Thursday
*/

// ============================================
// EJEMPLO DE IMPLEMENTACIÓN COMPLETA
// ============================================

export default function SpreadsheetWithAutoFill() {
  // ... código existente ...
  
  // Estado de drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragRange, setDragRange] = useState<{
    startRow: number;
    endRow: number;
    col: string;
  } | null>(null);

  // Handler del fill handle
  const handleFillHandleMouseDown = (e: React.MouseEvent, rowIndex: number, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragRange({ startRow: rowIndex, endRow: rowIndex, col });

    const handleMouseMove = (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const cellElement = element?.closest('[data-row-index]');
      
      if (cellElement) {
        const targetRow = parseInt(cellElement.getAttribute('data-row-index') || '0');
        if (targetRow >= rowIndex) {
          setDragRange(prev => prev ? { ...prev, endRow: targetRow } : null);
        }
      }
    };

    const handleMouseUp = () => {
      if (dragRange && dragRange.endRow > dragRange.startRow) {
        // Obtener valores fuente
        const sourceValues = [];
        for (let i = 0; i <= dragRange.startRow; i++) {
          sourceValues.push(sortedData[i]?.[dragRange.col] || null);
        }

        // Generar nuevos valores
        const count = dragRange.endRow - dragRange.startRow;
        const newValues = generateNextValues(sourceValues, count, dragRange.startRow);

        // Actualizar datos
        const newData = [...data];
        for (let i = 0; i < count; i++) {
          const targetRow = dragRange.startRow + i + 1;
          if (targetRow < sortedData.length) {
            const visualRow = sortedData[targetRow];
            const originalIndex = data.indexOf(visualRow);
            if (originalIndex !== -1) {
              newData[originalIndex] = {
                ...newData[originalIndex],
                [dragRange.col]: newValues[i]
              };
            }
          }
        }
        onUpdate(newData);
      }
      
      setIsDragging(false);
      setDragRange(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    // ... JSX existente ...
    
    // En cada celda, agregar:
    {isSelected && !isEditing && (
      <div
        className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-crosshair hover:w-2.5 hover:h-2.5 rounded-sm z-50"
        onMouseDown={(e) => handleFillHandleMouseDown(e, rowIndex, col)}
      />
    )}
  );
}
