```sh
just build
just emulator Pixel_9_API_35
just run

just run emulator-5554
just emulator Medium_Phone_API_36.1
```

## Current UI

- The app opens on the `TaskLists` page after login.
- The `TaskLists` page subscribes to Firestore `taskListOrder/{uid}` and `taskLists/{taskListId}` and shows task lists in that order.
- Tapping a task list opens `TaskList` details at the selected list, and the detail page supports horizontal paging across neighboring task lists.
- The `TaskList` page subscribes to the same ordered task lists, shows tasks in each list, and keeps the selected page in sync with the current task list.
- The `TaskLists` page allows navigation to `Settings`.
