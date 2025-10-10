import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from './index';

const prisma = new PrismaClient();

let testUserId = '' as string;
let testEmail = '' as string;
let testPassword = '' as string;
let accessToken = '' as string;

beforeAll(async () => {
  testEmail = `test-${Date.now()}@example.com`;
  testPassword = 'TestPass1234';
});

afterAll(async () => {
  if (testUserId) {
    const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId: testUserId } });
    if (orderDoc) {
      await prisma.taskListDoc.deleteMany({ where: { id: { in: orderDoc.order } } });
      await prisma.taskListDocOrderDoc.delete({ where: { userId: testUserId } });
    }
    await prisma.settings.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  }
  await prisma.$disconnect();
});

describe('認証エンドポイント', () => {
  describe('POST /api/auth/register', () => {
    it('新規ユーザーを登録できる', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword, language: 'ja' });

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.message).toBe('User registered successfully');

      testUserId = response.body.data.user.id;
      accessToken = response.body.data.accessToken;

      const settings = await prisma.settings.findUnique({ where: { userId: testUserId } });
      expect(settings).toBeDefined();
      expect(settings?.language).toBe('ja');

      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId: testUserId } });
      expect(orderDoc).toBeDefined();
      expect(orderDoc?.order.length).toBe(1);

      const taskListDoc = await prisma.taskListDoc.findUnique({ where: { id: orderDoc!.order[0] } });
      expect(taskListDoc).toBeDefined();
      expect(taskListDoc?.name).toBe('📝個人');
    });

    it('無効なメールアドレスでエラーを返す', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: testPassword, language: 'ja' });

      expect(response.status).toBe(422);
    });

    it('短すぎるパスワードでエラーを返す', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test2@example.com', password: 'short', language: 'ja' });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('登録済みユーザーでログインできる', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.message).toBe('Login successful');
    });

    it('誤ったパスワードでエラーを返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ログアウトできる', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('トークンなしでエラーを返す', async () => {
      const response = await request(app).post('/api/auth/logout');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('パスワードリセットメールを送信できる', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('未登録メールアドレスでも成功を返す（セキュリティのため）', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });
  });

  describe('DELETE /api/auth/account', () => {
    it('アカウントを削除できる', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      const token = loginResponse.body.data.accessToken as string;

      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');

      const settings = await prisma.settings.findUnique({ where: { userId: testUserId } });
      expect(settings).toBeNull();

      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({ where: { userId: testUserId } });
      expect(orderDoc).toBeNull();

      testUserId = '';
    });

    it('トークンなしでエラーを返す', async () => {
      const response = await request(app).delete('/api/auth/account');
      expect(response.status).toBe(401);
    });
  });
});