```sh
just build
just emulator "iPhone 16"
just run

just run "iPhone 16"
just emulator "3D7C2C1C-0000-0000-0000-000000000000"
```

## Current UI

- The app opens on the `TaskLists` page after login.
- The `TaskLists` page subscribes to Firestore `taskListOrder/{uid}` and `taskLists/{taskListId}` and shows task lists in that order.
- Tapping a task list opens `TaskList` details at the selected list, and the detail page supports horizontal paging across neighboring task lists.
- The `TaskList` page subscribes to the same ordered task lists, shows tasks in each list, and keeps the selected page in sync with the current task list.
- The `TaskLists` page allows navigation to `Settings`.
