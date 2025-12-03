export function reindexOrders(
  tasks: Array<{ id: string; order: number }>,
): Array<{ id: string; order: number }> {
  const sorted = [...tasks].sort((a, b) => a.order - b.order);

  return sorted.map((task, index) => ({
    ...task,
    order: (index + 1) * 1.0,
  }));
}
