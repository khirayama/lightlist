import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomBytes } from 'crypto';
import { LoroDoc } from 'loro-crdt';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import app from '../index';

const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('TaskListDocs API', () => {
  let accessToken: string;
  let userId: string;
  let taskListId: string;

  beforeAll(async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123';

    const {
      data: { user },
    } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!user) {
      throw new Error('Failed to create test user');
    }

    userId = user.id;

    const {
      data: { session },
    } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (!session) {
      throw new Error('Failed to sign in');
    }

    accessToken = session.access_token;

    const taskListName = '📝Personal';
    const initialTaskListId = randomBytes(16).toString('hex');

    const orderDoc = new LoroDoc();
    const orderList = orderDoc.getMovableList('order');
    orderList.push(initialTaskListId);

    const taskListDoc = new LoroDoc();
    const root = taskListDoc.getMap('root');
    root.set('name', taskListName);
    root.set('background', '');
    taskListDoc.getMovableList('tasks');
    taskListDoc.getMovableList('history');

    await prisma.$transaction([
      prisma.settings.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'en',
          taskInsertPosition: 'top',
          autoSort: false,
        },
      }),
      prisma.taskListDocOrderDoc.create({
        data: {
          userId: user.id,
          doc: Buffer.from(orderDoc.export({ mode: 'snapshot' })),
          order: [initialTaskListId],
        },
      }),
      prisma.taskListDoc.create({
        data: {
          id: initialTaskListId,
          doc: Buffer.from(taskListDoc.export({ mode: 'snapshot' })),
          name: taskListName,
          background: '',
          tasks: [],
          history: [],
        },
      }),
    ]);
  });

  afterAll(async () => {
    if (userId) {
      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
        where: { userId },
      });

      if (orderDoc) {
        await prisma.taskListDoc.deleteMany({
          where: { id: { in: orderDoc.order } },
        });
        await prisma.taskListDocOrderDoc.delete({
          where: { userId },
        });
      }

      await prisma.settings.deleteMany({
        where: { userId },
      });

      await supabase.auth.admin.deleteUser(userId);
    }

    await prisma.$disconnect();
  });

  it('should create a new task list', async () => {
    const response = await request(app)
      .post('/api/tasklistdocs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Task List',
        background: '#ff5733',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.name).toBe('Test Task List');
    expect(response.body.data.background).toBe('#ff5733');
    expect(response.body.message).toBe('TaskList created successfully');

    taskListId = response.body.data.id;
  });

  it('should get all task lists', async () => {
    const response = await request(app)
      .get('/api/tasklistdocs')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.message).toBe('TaskLists retrieved successfully');
  });

  it('should update a task list', async () => {
    const response = await request(app)
      .put(`/api/tasklistdocs/${taskListId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Task List',
        background: '#00ff00',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Task List');
    expect(response.body.data.background).toBe('#00ff00');
    expect(response.body.message).toBe('TaskList updated successfully');
  });

  it('should update task list order', async () => {
    const getResponse = await request(app)
      .get('/api/tasklistdocs')
      .set('Authorization', `Bearer ${accessToken}`);

    const taskLists = getResponse.body.data;
    const taskListOrders = taskLists.map((tl: any, index: number) => ({
      id: tl.id,
      order: taskLists.length - 1 - index,
    }));

    const response = await request(app)
      .put('/api/tasklistdocs/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taskListOrders });

    expect(response.status).toBe(200);
    expect(response.body.data.updatedCount).toBe(taskLists.length);
    expect(response.body.message).toBe('TaskList order updated successfully');
  });

  it('should delete a task list', async () => {
    const response = await request(app)
      .delete(`/api/tasklistdocs/${taskListId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(taskListId);
    expect(response.body.message).toBe('TaskList deleted successfully');
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app).get('/api/tasklistdocs');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Access token required');
  });
});
