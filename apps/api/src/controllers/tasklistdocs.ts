import express from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { CrdtArray } from '@lightlist/lib';
import { prisma, AuthenticatedRequest } from '../index';

import { TaskListDocument } from '../services/tasklistdocument';

const createTaskListDocSchema = z
  .object({
    name: z.string().min(1).max(300),
    background: z.string().max(100).optional(),
  })
  .strict();

const updateTaskListDocSchema = z
  .object({
    updates: z.string(),
  })
  .strict();

const updateTaskListDocOrderSchema = z
  .object({
    updates: z.string(),
  })
  .strict();

const taskListDocService = {
  // helper to sync denormalized snapshots
  syncSnapshots(doc: TaskListDocument) {
    const root = doc.getMap('root');
    const tasks = doc.getMovableList('tasks');
    return {
      name: (root.get('name') as string) || '',
      background: (root.get('background') as string) || '',
      tasks: tasks.toArray() as any,
      history: [],
    };
  },
  async createTaskListDoc(
    userId: string,
    name: string,
    background: string = ''
  ) {
    const taskListId = randomBytes(16).toString('hex');

    const taskListDoc = new TaskListDocument(userId);
    const root = taskListDoc.getMap('root');
    root.set('name', name);
    root.set('background', background);
    taskListDoc.getMovableList('tasks');
    taskListDoc.getMovableList('history');

    const orderDoc = await prisma.taskListDocOrderDoc.upsert({
      where: { userId },
      create: {
        userId,
        doc: Buffer.from(
          JSON.stringify(
            new CrdtArray<string>({ actorId: userId }).toSnapshot()
          )
        ),
        order: [],
      },
      update: {},
    });
    let orderCrdt = new CrdtArray<string>({ actorId: userId });
    const orderSnapshot = JSON.parse(orderDoc.doc.toString());
    if (orderSnapshot) {
      orderCrdt = CrdtArray.fromSnapshot<string>(orderSnapshot);
    }
    orderCrdt.insert(orderCrdt.toArray().length, taskListId);

    const [newTaskListDoc] = await prisma.$transaction([
      prisma.taskListDoc.create({
        data: {
          id: taskListId,
          doc: Buffer.from(taskListDoc.export()),
          ...taskListDocService.syncSnapshots(taskListDoc),
        },
      }),
      prisma.taskListDocOrderDoc.update({
        where: { userId },
        data: {
          doc: Buffer.from(JSON.stringify(orderCrdt.toSnapshot())),
          order: orderCrdt.toArray() as string[],
        },
      }),
    ]);

    return newTaskListDoc;
  },

  async getTaskListDocs(userId: string) {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
      where: { userId },
    });

    if (!orderDoc) {
      return [];
    }

    const taskListDocs = await prisma.taskListDoc.findMany({
      where: { id: { in: orderDoc.order } },
    });

    const orderedTaskListDocs = orderDoc.order
      .map(id => taskListDocs.find(doc => doc.id === id))
      .filter((doc): doc is NonNullable<typeof doc> => doc !== undefined);

    return orderedTaskListDocs;
  },

  async updateTaskListDoc(
    userId: string,
    taskListId: string,
    updates: Uint8Array
  ) {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
      where: { userId },
    });

    if (!orderDoc || !orderDoc.order.includes(taskListId)) {
      throw new Error('TaskListDoc not found or unauthorized');
    }

    const existingDoc = await prisma.taskListDoc.findUnique({
      where: { id: taskListId },
    });

    if (!existingDoc) {
      throw new Error('TaskListDoc not found');
    }

    const taskListDoc = new TaskListDocument(userId);
    taskListDoc.import(existingDoc.doc);
    taskListDoc.applyUpdates(updates);

    const root = taskListDoc.getMap('root');
    const tasks = taskListDoc.getMovableList('tasks');

    const updatedDoc = await prisma.taskListDoc.update({
      where: { id: taskListId },
      data: {
        doc: Buffer.from(taskListDoc.export()),
        ...taskListDocService.syncSnapshots(taskListDoc),
      },
    });

    return updatedDoc;
  },

  async deleteTaskListDoc(userId: string, taskListId: string) {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
      where: { userId },
    });

    if (!orderDoc || !orderDoc.order.includes(taskListId)) {
      throw new Error('TaskListDoc not found or unauthorized');
    }

    let orderCrdt = new CrdtArray<string>({ actorId: userId });
    const orderSnapshot = JSON.parse(orderDoc.doc.toString());
    if (orderSnapshot) {
      orderCrdt = CrdtArray.fromSnapshot<string>(orderSnapshot);
    }

    const currentOrder = orderCrdt.toArray() as string[];
    const index = currentOrder.indexOf(taskListId);
    if (index !== -1) {
      orderCrdt.remove(index);
    }

    await prisma.$transaction([
      prisma.taskListDoc.delete({
        where: { id: taskListId },
      }),
      prisma.taskListDocOrderDoc.update({
        where: { userId },
        data: {
          doc: Buffer.from(JSON.stringify(orderCrdt.toSnapshot())),
          order: orderCrdt.toArray() as string[],
        },
      }),
    ]);

    return { id: taskListId };
  },

  async updateTaskListDocOrder(userId: string, updates: Uint8Array) {
    const orderDoc = await prisma.taskListDocOrderDoc.upsert({
      where: { userId },
      create: {
        userId,
        doc: Buffer.from(
          JSON.stringify(
            new CrdtArray<string>({ actorId: userId }).toSnapshot()
          )
        ),
        order: [],
      },
      update: {},
    });
    let orderCrdt = new CrdtArray<string>({ actorId: userId });
    const orderSnapshot = JSON.parse(orderDoc.doc.toString());
    if (orderSnapshot) {
      orderCrdt = CrdtArray.fromSnapshot<string>(orderSnapshot);
    }

    // 更新を適用
    const ops = JSON.parse(Buffer.from(updates).toString());
    orderCrdt.applyRemote(ops);

    await prisma.taskListDocOrderDoc.update({
      where: { userId },
      data: {
        doc: Buffer.from(JSON.stringify(orderCrdt.toSnapshot())),
        order: orderCrdt.toArray() as string[],
      },
    });

    return { updatedCount: orderCrdt.toArray().length };
  },
};

export const taskListDocsController = {
  async createTaskListDoc(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const { name, background } = createTaskListDocSchema.parse(req.body);
    const result = await taskListDocService.createTaskListDoc(
      userId,
      name,
      background
    );

    res.status(201).json({
      data: {
        id: result.id,
        name: result.name,
        background: result.background,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        doc: result.doc.toString('base64'),
      },
      message: 'TaskList created successfully',
    });
  },

  async getTaskListDocs(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const result = await taskListDocService.getTaskListDocs(userId);

    res.json({
      data: result.map(doc => ({
        id: doc.id,
        name: doc.name,
        background: doc.background,
        tasks: doc.tasks,
        shareToken: doc.shareToken,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        doc: doc.doc.toString('base64'),
      })),
      message: 'TaskLists retrieved successfully',
    });
  },

  async updateTaskListDoc(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const { taskListId } = req.params;
    const { updates } = updateTaskListDocSchema.parse(req.body);
    const updatesData = Buffer.from(updates, 'base64');
    const result = await taskListDocService.updateTaskListDoc(
      userId,
      taskListId,
      updatesData
    );

    res.json({
      data: {
        id: result.id,
        name: result.name,
        background: result.background,
        updatedAt: result.updatedAt,
        doc: result.doc.toString('base64'),
      },
      message: 'TaskList updated successfully',
    });
  },

  async deleteTaskListDoc(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const { taskListId } = req.params;
    const result = await taskListDocService.deleteTaskListDoc(
      userId,
      taskListId
    );

    res.json({
      data: result,
      message: 'TaskList deleted successfully',
    });
  },

  async updateTaskListDocOrder(
    req: AuthenticatedRequest,
    res: express.Response
  ) {
    const userId = req.userId!;
    const { updates } = updateTaskListDocOrderSchema.parse(req.body);
    const updatesData = Buffer.from(updates, 'base64');
    const result = await taskListDocService.updateTaskListDocOrder(
      userId,
      updatesData
    );

    res.json({
      data: result,
      message: 'TaskList order updated successfully',
    });
  },
};
