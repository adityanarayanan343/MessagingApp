-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "profilePic" TEXT,
ADD COLUMN     "status" TEXT;
