import { useState, useEffect, useCallback } from "react";

const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const result = array.slice();
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};

export const useOptimisticReorder = <T extends { id: string }>(
  initialItems: T[],
  onReorder: (draggedId: string, targetId: string) => Promise<void>,
  {
    suspendExternalSync = false,
  }: {
    suspendExternalSync?: boolean;
  } = {},
) => {
  const [optimisticItems, setOptimisticItems] = useState<T[] | null>(null);
  const items = optimisticItems ?? initialItems;

  useEffect(() => {
    if (
      suspendExternalSync ||
      !optimisticItems ||
      optimisticItems.length !== initialItems.length ||
      !optimisticItems.every(
        (item, index) => item.id === initialItems[index]?.id,
      )
    ) {
      return;
    }

    setOptimisticItems(null);
  }, [initialItems, optimisticItems, suspendExternalSync]);

  const reorder = useCallback(
    async (draggedId: string, targetId: string) => {
      if (!draggedId || !targetId || draggedId === targetId) {
        return;
      }

      setOptimisticItems((currentItems) => {
        const sourceItems = currentItems ?? initialItems;
        const oldIndex = sourceItems.findIndex((item) => item.id === draggedId);
        const newIndex = sourceItems.findIndex((item) => item.id === targetId);

        if (oldIndex === -1 || newIndex === -1) return sourceItems;

        return arrayMove(sourceItems, oldIndex, newIndex);
      });

      try {
        await onReorder(draggedId, targetId);
      } catch (error) {
        setOptimisticItems(null);
        throw error;
      }
    },
    [initialItems, onReorder],
  );

  return {
    items,
    reorder,
  };
};
