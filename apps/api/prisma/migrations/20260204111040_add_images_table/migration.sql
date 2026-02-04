-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "minioKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" JSONB,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_agentId_idx" ON "images"("agentId");

-- CreateIndex
CREATE INDEX "images_status_idx" ON "images"("status");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
