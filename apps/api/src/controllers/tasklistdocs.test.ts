import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index';
import { TaskListDocument } from '../services/tasklistdocument';
import { CrdtArray } from '@lightlist/lib';

const prisma = new PrismaClient();

describe('TaskListDocs API', () => {
  let accessToken: string;
  let userId: string;
  let taskListId: string;

  beforeAll(async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123';

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, language: 'en' });

    expect(res.status).toBe(201);
    accessToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId } });
      if (orderDoc) {
        await prisma.taskListDoc.deleteMany({ where: { id: { in: orderDoc.order } } });
        await prisma.taskListDocOrderDoc.delete({ where: { userId } });
      }
      await prisma.settings.deleteMany({ where: { userId } });
      await prisma.account.deleteMany({ where: { userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('should create a new task list', async () => {
    const response = await request(app)
      .post('/api/tasklistdocs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Task List', background: '#ff5733' });

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

  it('should update a task list via CRDT ops', async () => {
    const opsDoc = new TaskListDocument(userId);
    const root = opsDoc.getMap('root');
    root.set('name', 'Updated Task List');
    root.set('background', '#00ff00');
    const ops = opsDoc.exportOperations();
    const updates = Buffer.from(JSON.stringify(ops)).toString('base64');

    const response = await request(app)
      .put(`/api/tasklistdocs/${taskListId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ updates });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Task List');
    expect(response.body.data.background).toBe('#00ff00');
    expect(response.body.message).toBe('TaskList updated successfully');
  });

  it('should update task list order via CRDT ops', async () => {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId } });
    expect(orderDoc).toBeTruthy();

    let orderCrdt: CrdtArray<string> = new CrdtArray<string>({ actorId: userId });
    const snap = JSON.parse(orderDoc!.doc.toString());
    if (snap) orderCrdt = CrdtArray.fromSnapshot<string>(snap);

    const arr = orderCrdt.toArray();
    if (arr.length >= 2) {
      // simple swap last two
      const last = arr.length - 1;
      orderCrdt.move(last, last - 1);
    }
    const updates = Buffer.from(JSON.stringify(orderCrdt.exportOperations())).toString('base64');

    const response = await request(app)
      .put('/api/tasklistdocs/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ updates });

    expect(response.status).toBe(200);
    expect(response.body.data.updatedCount).toBeGreaterThan(0);
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
});import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index';
import { TaskListDocument } from '../services/tasklistdocument';
import { CrdtArray } from '@lightlist/lib';

const prisma = new PrismaClient();

describe('TaskListDocs API', () => {
  let accessToken: string;
  let userId: string;
  let taskListId: string;

  beforeAll(async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123';

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, language: 'en' });

    expect(res.status).toBe(201);
    accessToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId } });
      if (orderDoc) {
        await prisma.taskListDoc.deleteMany({ where: { id: { in: orderDoc.order } } });
        await prisma.taskListDocOrderDoc.delete({ where: { userId } });
      }
      await prisma.settings.deleteMany({ where: { userId } });
      await prisma.account.deleteMany({ where: { userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('should create a new task list', async () => {
    const response = await request(app)
      .post('/api/tasklistdocs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Task List', background: '#ff5733' });

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

  it('should update a task list via CRDT ops', async () => {
    const opsDoc = new TaskListDocument(userId);
    const root = opsDoc.getMap('root');
    root.set('name', 'Updated Task List');
    root.set('background', '#00ff00');
    const ops = opsDoc.exportOperations();
    const updates = Buffer.from(JSON.stringify(ops)).toString('base64');

    const response = await request(app)
      .put(`/api/tasklistdocs/${taskListId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ updates });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Task List');
    expect(response.body.data.background).toBe('#00ff00');
    expect(response.body.message).toBe('TaskList updated successfully');
  });

  it('should update task list order via CRDT ops', async () => {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId } });
    expect(orderDoc).toBeTruthy();

    let orderCrdt: CrdtArray<string> = new CrdtArray<string>({ actorId: userId });
    const snap = JSON.parse(orderDoc!.doc.toString());
    if (snap) orderCrdt = CrdtArray.fromSnapshot<string>(snap);

    const arr = orderCrdt.toArray();
    if (arr.length >= 2) {
      // simple swap last two
      const last = arr.length - 1;
      orderCrdt.move(last, last - 1);
    }
    const updates = Buffer.from(JSON.stringify(orderCrdt.exportOperations())).toString('base64');

    const response = await request(app)
      .put('/api/tasklistdocs/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ updates });

    expect(response.status).toBe(200);
    expect(response.body.data.updatedCount).toBeGreaterThan(0);
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