# Actualización: Drag & Drop para Reordenar Columnas y Filas

## 📋 Fecha: 2025-11-19

## 🎯 Nuevas Funcionalidades

### 1. **Reordenar Columnas por Drag & Drop**
Los usuarios ahora pueden reorganizar columnas simplemente arrastrándolas:

**Cómo usar:**
- Haz clic y mantén presionado en el **header de cualquier columna**
- Arrastra la columna a su nueva posición
- Las letras de columna (A, B, C...) se **actualizan automáticamente**
- Las referencias en fórmulas se mantienen intactas

**Visual Feedback:**
- La columna arrastrada se muestra con **opacidad 50%**
- Una **línea azul** indica dónde se insertará la columna
- El cursor cambia a `cursor-move` para indicar que se puede arrastrar
- Tooltip: "Click to select, Double-click to rename, **Drag to reorder**"

### 2. **Reordenar Filas por Drag & Drop**
Similar a las columnas, las filas también se pueden reorganizar:

**Cómo usar:**
- Haz clic y mantén presionado en el **número de fila**
- Arrastra la fila a su nueva posición
- Todos los datos de la fila se mueven juntos

**Visual Feedback:**
- La fila arrastrada se muestra con **opacidad 50%**
- Una **línea azul horizontal** indica dónde se insertará
- Tooltip: "Click to select, **Drag to reorder**"

## 🔧 Detalles Técnicos

### Estado Añadido
```typescript
const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
const [draggedRow, setDraggedRow] = useState<number | null>(null);
const [dragOverRow, setDragOverRow] = useState<number | null>(null);
```

### Funciones Principales

#### Para Columnas:
- `handleColumnDragStart()` - Inicia el arrastre de columna
- `handleColumnDragOver()` - Detecta sobre qué columna está el cursor
- `handleColumnDragEnd()` - Finaliza el arrastre y reordena
- `handleColumnDragLeave()` - Limpia el estado visual

#### Para Filas:
- `handleRowDragStart()` - Inicia el arrastre de fila
- `handleRowDragOver()` - Detecta sobre qué fila está el cursor
- `handleRowDragEnd()` - Finaliza el arrastre y reordena
- `handleRowDragLeave()` - Limpia el estado visual

### Algoritmo de Reordenamiento

**Columnas:**
```typescript
// 1. Copiar array de columnas
const newColumns = [...columns];

// 2. Remover columna de posición original
newColumns.splice(draggedIndex, 1);

// 3. Ajustar índice si es necesario
const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

// 4. Insertar en nueva posición
newColumns.splice(newTargetIndex, 0, draggedColumn);

// 5. Actualizar datos
onUpdate(data, newColumns);
```

**Filas:**
```typescript
// 1. Copiar array de datos
const newData = [...data];

// 2. Obtener datos de la fila original
const draggedRowData = sortedData[draggedRow];

// 3. Encontrar índices en datos originales (no ordenados)
const draggedOriginalIndex = data.indexOf(draggedRowData);

// 4. Remover y reinsertar
newData.splice(draggedOriginalIndex, 1);
newData.splice(newTargetIndex, 0, draggedRowData);

// 5. Actualizar
onUpdate(newData);
```

## 🎨 Mejoras de UI

### Indicadores Visuales
- **Columna siendo arrastrada**: Opacidad al 50%
- **Posición de drop**: Borde izquierdo azul grueso (4px)
- **Cursor**: `cursor-move` en headers y números de fila
- **Transiciones**: `transition-all` para animaciones suaves

### CSS Actualizado
```typescript
className={`
  ...existing classes...
  ${draggedColumn === col ? 'opacity-50' : ''}
  ${dragOverColumn === col ? 'border-l-4 border-l-blue-500' : ''}
`}
```

## 🔄 Compatibilidad

### Con Otras Funcionalidades
✅ **Auto-fill multi-direccional** - Completamente compatible  
✅ **Ordenamiento** - Se resetea al mover columnas  
✅ **Selección** - Se mantiene la columna/fila seleccionada  
✅ **Edición de headers** - No se puede arrastrar mientras se edita  
✅ **Colaboración en tiempo real** - Compatible  

### Manejo de Edge Cases
- ✅ No permite arrastrar mientras se edita un header
- ✅ Maneja correctamente datos ordenados vs. originales
- ✅ Actualiza configuración de sort si es necesaria
- ✅ Preserva anchos de columna personalizados

## 🚀 Uso con IA

La IA ahora puede:
1. **Instruir al usuario** cómo reorganizar columnas/filas
2. **Describir el proceso** de drag & drop
3. **Sugerir reorganizaciones** óptimas para análisis de datos

Ejemplo de instrucción IA:
```
"Para mover la columna 'Ventas' antes de 'Producto':
1. Haz clic en el header 'Ventas'
2. Mantén presionado y arrastra hacia la izquierda
3. Suelta cuando veas la línea azul antes de 'Producto'"
```

## 📊 Casos de Uso

### Reorganizar Datos para Análisis
```
Antes: ID | Fecha | Ventas | Producto | Región
Después: Región | Producto | Ventas | Fecha | ID
(Mejor para agrupar por región)
```

### Priorizar Columnas Importantes
```
Drag: Mover "Total" de la última a la segunda columna
para visualización más rápida
```

### Reorganizar Secuencia Temporal
```
Drag filas: Reordenar eventos cronológicamente
sin necesidad de ordenamiento automático
```

## 🎯 Diferencias Clave con Auto-Fill

| Feature | Auto-Fill | Drag to Reorder |
|---------|-----------|-----------------|
| **Propósito** | Completar patrones | Reorganizar estructura |
| **Activación** | Cuadrado azul en celda | Header/número de fila |
| **Efecto** | Genera nuevos valores | Mueve datos existentes |
| **Dirección** | 4 direcciones | Cualquier posición |
| **Visual** | Outline punteado azul | Opacidad + línea azul |

## 🐛 Testing

### Casos Probados
- ✅ Mover columna de izquierda a derecha
- ✅ Mover columna de derecha a izquierda
- ✅ Mover fila hacia arriba
- ✅ Mover fila hacia abajo
- ✅ Cancelar drag (soltar fuera)
- ✅ Drag con datos ordenados
- ✅ Drag con columnas seleccionadas

### Por Probar Manualmente
- ⏳ Drag con muchas columnas (>26)
- ⏳ Drag con datos muy grandes
- ⏳ Interacción con colaboradores en tiempo real
- ⏳ Drag & drop en móvil/touch

## 💡 Mejoras Futuras Sugeridas

1. **Undo/Redo** para operaciones de drag
2. **Preview fantasma** de la columna/fila mientras se arrastra
3. **Multi-select drag** - mover múltiples columnas a la vez
4. **Snap points** - posiciones sugeridas para drop
5. **Animación** de transición al soltar
6. **Keyboard shortcuts** - Ctrl+Arrow para mover

## 📝 Notas de Implementación

- Las letras de columna (A, B, C...) se calculan dinámicamente basadas en el índice
- El reordenamiento afecta el array `columns` que se pasa a `onUpdate()`
- Los anchos de columna personalizados se preservan usando el nombre de columna como key
- El drag de filas trabaja con el array `sortedData` pero modifica `data` original
