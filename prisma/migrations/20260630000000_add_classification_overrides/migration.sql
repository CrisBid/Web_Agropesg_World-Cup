-- CreateTable
CREATE TABLE "classification_overrides" (
    "participantId" TEXT NOT NULL,
    "slot"          TEXT NOT NULL,
    "team"          TEXT NOT NULL,

    CONSTRAINT "classification_overrides_pkey" PRIMARY KEY ("participantId", "slot")
);

-- AddForeignKey
ALTER TABLE "classification_overrides"
    ADD CONSTRAINT "classification_overrides_participantId_fkey"
    FOREIGN KEY ("participantId") REFERENCES "participants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
