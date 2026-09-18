```sh
just build
just emulator "iPhone 16"
just run
just emulator "3D7C2C1C-0000-0000-0000-000000000000"
```

## Current UI

- The app opens on the `TaskLists` page after login.
- The `TaskLists` page subscribes to Firestore `taskListOrder/{uid}` and `taskLists/{taskListId}` and shows task lists in that order.
- Tapping a task list opens `TaskList` details at the selected list, and the detail page supports horizontal paging across neighboring task lists.
- The `TaskList` page subscribes to the same ordered task lists, shows tasks in each list, and keeps the selected page in sync with the current task list.
- The `TaskLists` page allows navigation to `Settings`.

## Navigation behavior

- Compact layouts use one value-based `NavigationStack` rooted at `TaskLists`.
- Regular layouts use `NavigationSplitView` while preserving the same logical destination: task list detail, calendar, or settings.
- When the horizontal size class changes, the compact path and regular detail selection are synchronized so rotation and window resizing do not reset the current page.
- Authentication, password reset, and shared-list preview are mutually exclusive full-screen presentations.
- Task list detail keeps horizontal paging between ordered task lists inside the destination instead of adding another navigation-stack entry.
