import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const API_URL = 'http://localhost:3001';
const prisma = new PrismaClient();

let testUserId: string;
let testEmail: string;
let testPassword: string;
let accessToken: string;

beforeAll(async () => {
  testEmail = `test-${Date.now()}@example.com`;
  testPassword = 'TestPass123';
});

afterAll(async () => {
  if (testUserId) {
    await prisma.taskListDocOrderDoc.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.settings.deleteMany({
      where: { userId: testUserId },
    });
  }
  await prisma.$disconnect();
});

describe('認証エンドポイント', () => {
  describe('POST /api/auth/register', () => {
    it('新規ユーザーを登録できる', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          language: 'ja',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.accessToken).toBeDefined();
      expect(data.message).toBe('User registered successfully');

      testUserId = data.data.user.id;
      accessToken = data.data.accessToken;

      const settings = await prisma.settings.findUnique({
        where: { userId: testUserId },
      });
      expect(settings).toBeDefined();
      expect(settings?.language).toBe('ja');

      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
        where: { userId: testUserId },
      });
      expect(orderDoc).toBeDefined();
      expect(orderDoc?.order.length).toBe(1);

      const taskListDoc = await prisma.taskListDoc.findUnique({
        where: { id: orderDoc!.order[0] },
      });
      expect(taskListDoc).toBeDefined();
      expect(taskListDoc?.name).toBe('📝個人');
    });

    it('無効なメールアドレスでエラーを返す', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: testPassword,
          language: 'ja',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('短すぎるパスワードでエラーを返す', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test2@example.com',
          password: 'short',
          language: 'ja',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('登録済みユーザーでログインできる', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.accessToken).toBeDefined();
      expect(data.message).toBe('Login successful');
    });

    it('誤ったパスワードでエラーを返す', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123',
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ログアウトできる', async () => {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Logout successful');
    });

    it('トークンなしでエラーを返す', async () => {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('パスワードリセットメールを送信できる', async () => {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Password reset email sent');
    });

    it('未登録メールアドレスでも成功を返す（セキュリティのため）', async () => {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Password reset email sent');
    });
  });

  describe('DELETE /api/auth/account', () => {
    it('アカウントを削除できる', async () => {
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });
      const loginData = await loginResponse.json();
      const token = loginData.data.accessToken;

      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Account deleted successfully');

      const settings = await prisma.settings.findUnique({
        where: { userId: testUserId },
      });
      expect(settings).toBeNull();

      const orderDoc = await prisma.taskListDocOrderDoc.findUnique({
        where: { userId: testUserId },
      });
      expect(orderDoc).toBeNull();

      testUserId = '';
    });

    it('トークンなしでエラーを返す', async () => {
      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });
  });
});
