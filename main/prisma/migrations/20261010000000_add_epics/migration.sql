-- CreateTable
CREATE TABLE "epics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "epics_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "epic_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "epics_name_key" ON "epics"("name");

-- CreateIndex
CREATE INDEX "tasks_epic_id_idx" ON "tasks"("epic_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_epic_id_fkey" FOREIGN KEY ("epic_id") REFERENCES "epics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
