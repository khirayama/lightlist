import * as Y from "yjs";

export const config = {
  initialValue: (): GlobalStateV2 => {
    const doc = new Y.Doc();
    const da = doc.getMap("app");
    da.set("taskInsertPosition", "BOTTOM");
    da.set("taskListIds", new Y.Array());
    da.set("online", true);

    return {
      app: {
        ...da.toJSON(),
        update: Y.encodeStateAsUpdate(doc),
      } as AppV2,
      profile: {
        displayName: "",
        email: "",
      },
      preferences: {
        lang: "EN",
        theme: "SYSTEM",
      },
      taskLists: {},
    };
  },
};
