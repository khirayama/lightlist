import { useState, useEffect, useCallback } from "react";

// Utility to move item in array
export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const result = array.slice();
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};

export const useOptimisticReorder = <T extends { id: string }>(
  initialItems: T[],
  onReorder: (draggedId: string, targetId: string) => Promise<void>,
) => {
  const [items, setItems] = useState<T[]>(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const reorder = useCallback(
    async (draggedId: string, targetId: string) => {
      if (!draggedId || !targetId || draggedId === targetId) {
        return;
      }

      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === draggedId,
        );
        const newIndex = currentItems.findIndex((item) => item.id === targetId);

        if (oldIndex === -1 || newIndex === -1) return currentItems;

        return arrayMove(currentItems, oldIndex, newIndex);
      });

      try {
        await onReorder(draggedId, targetId);
      } catch (error) {
        // Rollback
        setItems(initialItems);
        throw error;
      }
    },
    [initialItems, onReorder],
  );

  return {
    items,
    setItems,
    reorder,
  };
};
