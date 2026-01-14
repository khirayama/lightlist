# @lightlist/sdk

Shared SDK for LightList applications (Web & Native).

## Structure

- `src/types.ts`: Shared TypeScript interfaces
- `src/store.ts`: State management logic
- `src/hooks/`: React hooks
- `src/mutations/`: Firebase mutation wrappers
- `src/utils/`: Shared utilities

## Hooks

### useOptimisticReorder

Handles optimistic updates and API calls for list reordering.

```typescript
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";

const { items, setItems, reorder } = useOptimisticReorder(
  initialItems,
  async (draggedId, targetId) => {
    // Call API to update order
  },
);
```
