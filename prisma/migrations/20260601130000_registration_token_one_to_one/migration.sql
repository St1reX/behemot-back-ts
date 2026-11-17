-- DropIndex
DROP INDEX "RegistrationToken_tokenHash_key";

-- DropIndex
DROP INDEX "RegistrationToken_userId_idx";

-- AlterTable
ALTER TABLE "RegistrationToken" RENAME COLUMN "tokenHash" TO "token";

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationToken_token_key" ON "RegistrationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationToken_userId_key" ON "RegistrationToken"("userId");
