-- AlterTable
ALTER TABLE "Operatore" ADD COLUMN     "nazionalita" TEXT,
ADD COLUMN     "sesso" TEXT;

-- AlterTable
ALTER TABLE "PianoAssistenziale" ADD COLUMN     "vincoloNazionalita" TEXT,
ADD COLUMN     "vincoloSesso" TEXT;
