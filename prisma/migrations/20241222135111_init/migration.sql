-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "TaskInsertPosition" AS ENUM ('BOTTOM', 'TOP');

-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('JA', 'EN');

-- CreateTable
CREATE TABLE "ShareCode" (
    "code" TEXT NOT NULL,
    "taskListId" TEXT NOT NULL,

    CONSTRAINT "ShareCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "TaskList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "update" BYTEA NOT NULL DEFAULT '\x',

    CONSTRAINT "TaskList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "taskInsertPosition" "TaskInsertPosition" NOT NULL DEFAULT 'BOTTOM',
    "taskListIds" TEXT[],
    "online" BOOLEAN NOT NULL DEFAULT false,
    "update" BYTEA NOT NULL DEFAULT '\x',

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preferences" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "lang" "Lang" NOT NULL DEFAULT 'JA',
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "App_userId_key" ON "App"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Preferences_userId_key" ON "Preferences"("userId");
