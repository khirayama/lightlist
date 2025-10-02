-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" VARCHAR(50) NOT NULL DEFAULT 'light',
    "language" VARCHAR(20) NOT NULL DEFAULT 'ja',
    "taskInsertPosition" VARCHAR(50) NOT NULL DEFAULT 'top',
    "autoSort" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskListDocOrderDoc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "doc" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "order" TEXT[],

    CONSTRAINT "TaskListDocOrderDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskListDoc" (
    "id" TEXT NOT NULL,
    "doc" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "background" VARCHAR(100) DEFAULT '',
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "shareToken" TEXT,

    CONSTRAINT "TaskListDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskListDocOrderDoc_userId_key" ON "TaskListDocOrderDoc"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskListDoc_shareToken_key" ON "TaskListDoc"("shareToken");
