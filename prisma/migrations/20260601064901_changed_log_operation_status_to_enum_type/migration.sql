/*
  Warnings:

  - Changed the type of `operationStatus` on the `Log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "operationStatus",
ADD COLUMN     "operationStatus" "OperationStatus" NOT NULL,
ALTER COLUMN "requestId" SET DATA TYPE TEXT;
