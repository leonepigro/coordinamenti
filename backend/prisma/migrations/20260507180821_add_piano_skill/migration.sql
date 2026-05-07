-- CreateTable
CREATE TABLE "PianoSkill" (
    "pianoId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "PianoSkill_pkey" PRIMARY KEY ("pianoId","skillId")
);

-- AddForeignKey
ALTER TABLE "PianoSkill" ADD CONSTRAINT "PianoSkill_pianoId_fkey" FOREIGN KEY ("pianoId") REFERENCES "PianoAssistenziale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PianoSkill" ADD CONSTRAINT "PianoSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
