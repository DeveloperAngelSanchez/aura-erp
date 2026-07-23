import { useState, useCallback, useRef, useEffect } from 'react';

export function useResizableColumns<T extends string>(
  initialWidths: Record<T, number>,
  storageKey?: string
) {
  const [columnWidths, setColumnWidths] = useState<Record<T, number>>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialWidths, ...parsed };
        }
      } catch (err) {
        console.error('Error loading column widths from localStorage:', err);
      }
    }
    return initialWidths;
  });

  const resizingColumn = useRef<T | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(columnWidths));
      } catch (err) {
        console.error('Error saving column widths to localStorage:', err);
      }
    }
  }, [columnWidths, storageKey]);

  const handleMouseDown = useCallback((column: T, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColumn.current = column;
    startX.current = e.clientX;
    startWidth.current = columnWidths[column] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColumn.current) return;
      const deltaX = moveEvent.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + deltaX);
      
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn.current!]: newWidth,
      }));
    };

    const onMouseUp = () => {
      resizingColumn.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  const resetWidths = useCallback(() => {
    setColumnWidths(initialWidths);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error('Error resetting column widths in localStorage:', err);
      }
    }
  }, [initialWidths, storageKey]);

  return { columnWidths, handleMouseDown, resetWidths };
}
