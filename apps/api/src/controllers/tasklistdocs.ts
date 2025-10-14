import express from 'express';
import { z } from 'zod';

import type { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';
import {
  TaskListDoc,
  importTaskListDoc,
  exportSnapshot,
  applyUpdates as applyTaskListUpdates,
  toSnapshotBundle,
  loadOrderCrdt,
  saveOrderCrdt,
} from '../lib/tasklistdoc';

const createTaskListDocSchema = z
  .object({
    id: z.string().uuid(),
    doc: z.string(), // base64-encoded snapshot
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

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const taskListDocService = {
  async createTaskListDoc(userId: string, id: string, docBytes: Buffer) {
    const orderCrdt = await loadOrderCrdt(userId);

    const doc: TaskListDoc = importTaskListDoc(userId, docBytes);

    const arr = orderCrdt.toArray() as string[];
    if (!arr.includes(id)) {
      orderCrdt.insert(arr.length, id);
    }

    const [newTaskListDoc] = await prisma.$transaction([
      prisma.taskListDoc.create({
        data: {
          id,
          doc: Buffer.from(exportSnapshot(doc)),
          ...toSnapshotBundle(doc),
        },
      }),
      prisma.taskListDocOrderDoc.upsert({
        where: { userId },
        create: {
          userId,
          doc: Buffer.from(JSON.stringify(orderCrdt.toSnapshot())),
          order: orderCrdt.toArray() as string[],
        },
        update: {
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
    if (!orderDoc) return [];

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
    if (!orderDoc || !orderDoc.order.includes(taskListId))
      throw httpError(403, 'Forbidden');

    const existingDoc = await prisma.taskListDoc.findUnique({
      where: { id: taskListId },
    });
    if (!existingDoc) throw httpError(404, 'TaskListDoc not found');

    const doc: TaskListDoc = importTaskListDoc(userId, existingDoc.doc);
    applyTaskListUpdates(doc, updates);
    const updatedDoc = await prisma.taskListDoc.update({
      where: { id: taskListId },
      data: { doc: Buffer.from(exportSnapshot(doc)), ...toSnapshotBundle(doc) },
    });
    return updatedDoc;
  },

  async deleteTaskListDoc(userId: string, taskListId: string) {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
      where: { userId },
    });
    if (!orderDoc || !orderDoc.order.includes(taskListId))
      throw httpError(403, 'Forbidden');

    const crdt = await loadOrderCrdt(userId);
    const arr = crdt.toArray() as string[];
    const index = arr.indexOf(taskListId);
    if (index !== -1) crdt.remove(index);

    await prisma.$transaction([
      prisma.taskListDoc.delete({ where: { id: taskListId } }),
      prisma.taskListDocOrderDoc.update({
        where: { userId },
        data: {
          doc: Buffer.from(JSON.stringify(crdt.toSnapshot())),
          order: crdt.toArray() as string[],
        },
      }),
    ]);

    return { id: taskListId };
  },

  async updateTaskListDocOrder(userId: string, updates: Uint8Array) {
    const crdt = await loadOrderCrdt(userId);
    const ops = JSON.parse(Buffer.from(updates).toString());
    crdt.applyRemote(ops);

    await saveOrderCrdt(userId, crdt);
    return { updatedCount: crdt.toArray().length };
  },
};

export const taskListDocsController = {
  async createTaskListDoc(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const { id, doc } = createTaskListDocSchema.parse(req.body);
    let docBytes: Buffer;
    try {
      docBytes = Buffer.from(doc, 'base64');
      JSON.parse(docBytes.toString());
    } catch {
      return res.status(422).json({ data: null, message: 'Validation error' });
    }

    const result = await taskListDocService.createTaskListDoc(
      userId,
      id,
      docBytes
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
    let updatesData: Buffer;
    try {
      updatesData = Buffer.from(updates, 'base64');
      JSON.parse(updatesData.toString());
    } catch {
      return res.status(422).json({ data: null, message: 'Validation error' });
    }
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
    let updatesData: Buffer;
    try {
      updatesData = Buffer.from(updates, 'base64');
      JSON.parse(updatesData.toString());
    } catch {
      return res.status(422).json({ data: null, message: 'Validation error' });
    }
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
