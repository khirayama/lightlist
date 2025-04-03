import { useEffect, useState } from "react";
import qs from "query-string";

import {
  Carousel,
  CarouselList,
  CarouselItem,
  CarouselIndicator,
} from "components/primitives/Carousel";
import { TaskList } from "components/TaskList";

function getTaskListIdIndex(taskListIds: string[]) {
  const taskListId = (qs.parse(window.location.search).taskListId ||
    "") as string;
  const taskListIndex = taskListIds.includes(taskListId)
    ? taskListIds.indexOf(taskListId)
    : 0;
  return taskListIndex;
}

export function AppMain({ app, taskLists }) {
  const [index, setIndex] = useState(getTaskListIdIndex(app.taskListIds));

  useEffect(() => {
    setIndex(getTaskListIdIndex(app.taskListIds));
  }, [window.location.search, app]);

  return (
    <Carousel
      index={index}
      onIndexChange={(idx) => {
        const taskListId = app.taskListIds[idx];
        console.log("TODO: move to task list and update URL");
      }}
    >
      <CarouselIndicator />
      <CarouselList>
        {app.taskListIds.map((taskListId: string) => {
          const taskList = taskLists[taskListId];
          return taskList ? (
            <CarouselItem key={taskList.id}>
              <TaskList taskList={taskList} app={app} />
            </CarouselItem>
          ) : null;
        })}
      </CarouselList>
    </Carousel>
  );
}
