/*
  Warnings:

  - You are about to drop the column `online` on the `App` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "App" DROP COLUMN "online",
ALTER COLUMN "update" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TaskList" ALTER COLUMN "update" DROP DEFAULT;
