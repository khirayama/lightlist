import express from 'express';
import { z } from 'zod';
import { LoroDoc } from 'loro-crdt';
import { randomBytes } from 'crypto';
import { prisma, AuthenticatedRequest } from '../index';

const createTaskListDocSchema = z
  .object({
    name: z.string().min(1).max(300),
    background: z.string().max(100).optional(),
  })
  .strict();

const updateTaskListDocSchema = z
  .object({
    name: z.string().min(1).max(300).optional(),
    background: z.string().max(100).optional(),
    tasks: z.array(z.any()).optional(),
  })
  .strict();

const updateTaskListDocOrderSchema = z
  .object({
    taskListOrders: z.array(
      z.object({
        id: z.string(),
        order: z.number(),
      })
    ),
  })
  .strict();

const taskListDocService = {
  async createTaskListDoc(
    userId: string,
    name: string,
    background: string = ''
  ) {
    const taskListId = randomBytes(16).toString('hex');

    const taskListDoc = new LoroDoc();
    const root = taskListDoc.getMap('root');
    root.set('name', name);
    root.set('background', background);
    taskListDoc.getMovableList('tasks');
    taskListDoc.getMovableList('history');

    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
      where: { userId },
    });

    if (!orderDoc) {
      throw new Error('TaskListDocOrderDoc not found');
    }

    const loroOrderDoc = new LoroDoc();
    loroOrderDoc.import(orderDoc.doc);
    const orderList = loroOrderDoc.getMovableList('order');
    orderList.push(taskListId);

    const [newTaskListDoc] = await prisma.$transaction([
      prisma.taskListDoc.create({
        data: {
          id: taskListId,
          doc: Buffer.from(taskListDoc.export({ mode: 'snapshot' })),
          name,
          background,
          tasks: [],
          history: [],
        },
      }),
      prisma.taskListDocOrderDoc.update({
        where: { userId },
        data: {
          doc: Buffer.from(loroOrderDoc.export({ mode: 'snapshot' })),
          order: orderList.toArray() as string[],
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
    updates: {
      name?: string;
      background?: string;
      tasks?: any[];
    }
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

    const loroDoc = new LoroDoc();
    loroDoc.import(existingDoc.doc);
    const root = loroDoc.getMap('root');

    if (updates.name !== undefined) {
      root.set('name', updates.name);
    }
    if (updates.background !== undefined) {
      root.set('background', updates.background);
    }

    const updateData: any = {
      doc: Buffer.from(loroDoc.export({ mode: 'snapshot' })),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.background !== undefined) {
      updateData.background = updates.background;
    }
    if (updates.tasks !== undefined) {
      updateData.tasks = updates.tasks;
    }

    const updatedDoc = await prisma.taskListDoc.update({
      where: { id: taskListId },
      data: updateData,
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

    const loroOrderDoc = new LoroDoc();
    loroOrderDoc.import(orderDoc.doc);
    const orderList = loroOrderDoc.getMovableList('order');

    const currentOrder = orderList.toArray() as string[];
    const index = currentOrder.indexOf(taskListId);
    if (index !== -1) {
      orderList.delete(index, 1);
    }

    await prisma.$transaction([
      prisma.taskListDoc.delete({
        where: { id: taskListId },
      }),
      prisma.taskListDocOrderDoc.update({
        where: { userId },
        data: {
          doc: Buffer.from(loroOrderDoc.export({ mode: 'snapshot' })),
          order: orderList.toArray() as string[],
        },
      }),
    ]);

    return { id: taskListId };
  },

  async updateTaskListDocOrder(
    userId: string,
    taskListOrders: Array<{ id: string; order: number }>
  ) {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
      where: { userId },
    });

    if (!orderDoc) {
      throw new Error('TaskListDocOrderDoc not found');
    }

    const sortedOrders = [...taskListOrders].sort((a, b) => a.order - b.order);
    const newOrder = sortedOrders.map(item => item.id);

    for (const id of newOrder) {
      if (!orderDoc.order.includes(id)) {
        throw new Error(`TaskListDoc ${id} not found or unauthorized`);
      }
    }

    const loroOrderDoc = new LoroDoc();
    loroOrderDoc.import(orderDoc.doc);
    const orderList = loroOrderDoc.getMovableList('order');

    orderList.delete(0, orderList.length);
    for (const id of newOrder) {
      orderList.push(id);
    }

    await prisma.taskListDocOrderDoc.update({
      where: { userId },
      data: {
        doc: Buffer.from(loroOrderDoc.export({ mode: 'snapshot' })),
        order: newOrder,
      },
    });

    return { updatedCount: newOrder.length };
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
      })),
      message: 'TaskLists retrieved successfully',
    });
  },

  async updateTaskListDoc(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const { taskListId } = req.params;
    const updates = updateTaskListDocSchema.parse(req.body);
    const result = await taskListDocService.updateTaskListDoc(
      userId,
      taskListId,
      updates
    );

    res.json({
      data: {
        id: result.id,
        name: result.name,
        background: result.background,
        updatedAt: result.updatedAt,
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
    const { taskListOrders } = updateTaskListDocOrderSchema.parse(req.body);
    const result = await taskListDocService.updateTaskListDocOrder(
      userId,
      taskListOrders
    );

    res.json({
      data: result,
      message: 'TaskList order updated successfully',
    });
  },
};
