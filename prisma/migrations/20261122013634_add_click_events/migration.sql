-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClickEvent_urlId_clickedAt_idx" ON "ClickEvent"("urlId", "clickedAt");

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url"("id") ON DELETE CASCADE ON UPDATE CASCADE;
