-- AlterTable
ALTER TABLE "Group" ADD COLUMN "lastMessageAt" DATETIME;

-- CreateIndex
CREATE INDEX "isGroup_idx" ON "Group"("isGroup");

-- CreateIndex
CREATE INDEX "userId_idx" ON "GroupUser"("userId");

-- CreateIndex
CREATE INDEX "groupId_idx" ON "Message"("groupId");
