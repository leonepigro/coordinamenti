import { Resend } from "resend";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_placeholder")) {
    console.log("[notifiche] RESEND_API_KEY non configurata — email non inviate");
    return null;
  }
  return new Resend(key);
}

function buildMapsLink(indirizzi: string[]): string {
  const validi = indirizzi.filter(Boolean);
  if (validi.length === 0) return "";
  return (
    "https://www.google.com/maps/dir/" +
    validi.map((a) => encodeURIComponent(a)).join("/")
  );
}

function stimaOrari(interventi: any[], turno: string): string[] {
  const orari: string[] = [];
  let minuti = turno === "mattina" ? 8 * 60 : 14 * 60 + 30;
  for (const i of interventi) {
    const h = Math.floor(minuti / 60);
    const m = minuti % 60;
    orari.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    minuti += i.durata + 15; // 15 min spostamento stimato
  }
  return orari;
}

function buildHtml(
  operatoreNome: string,
  data: Date,
  mattina: any[],
  pomeriggio: any[],
): string {
  const dataLabel = format(data, "EEEE d MMMM yyyy", { locale: it });
  const orariMattina = stimaOrari(mattina, "mattina");
  const orariPomeriggio = stimaOrari(pomeriggio, "pomeriggio");

  function righeInterventi(items: any[], orari: string[]): string {
    if (items.length === 0) return `<tr><td colspan="4" style="padding:12px;color:#999;font-size:13px;">Nessun intervento</td></tr>`;
    return items
      .map(
        (i, idx) => `
        <tr style="border-bottom:1px solid #f0ebe5;">
          <td style="padding:12px 14px;font-size:14px;font-weight:600;color:#2C1810;">${orari[idx]}</td>
          <td style="padding:12px 14px;font-size:14px;color:#2C1810;">${i.utente.nome}</td>
          <td style="padding:12px 14px;font-size:13px;color:#8B6E5A;">${i.tipoServizio?.nome ?? "—"}</td>
          <td style="padding:12px 14px;font-size:13px;color:#8B6E5A;">${i.durata} min</td>
        </tr>
        <tr style="border-bottom:1px solid #f0ebe5;background:#fdfaf7;">
          <td></td>
          <td colspan="3" style="padding:4px 14px 12px;font-size:12px;color:#999;">
            📍 ${i.utente.indirizzo || "—"}
          </td>
        </tr>`,
      )
      .join("");
  }

  function sezione(label: string, orario: string, items: any[], orari: string[], colore: string): string {
    const indirizzi = items.map((i) => i.utente.indirizzo).filter(Boolean);
    const mapsLink = buildMapsLink(indirizzi);
    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <span style="font-size:15px;font-weight:700;color:${colore};">${label}</span>
            <span style="font-size:12px;color:#999;margin-left:8px;">${orario}</span>
          </div>
          ${mapsLink && items.length > 0 ? `<a href="${mapsLink}" style="font-size:12px;padding:6px 14px;border-radius:6px;background:${colore};color:#fff;text-decoration:none;font-weight:600;">🗺 Apri percorso</a>` : ""}
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #f0ebe5;">
          <thead>
            <tr style="background:#fdfaf7;">
              <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#999;text-align:left;letter-spacing:.05em;text-transform:uppercase;">Orario</th>
              <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#999;text-align:left;letter-spacing:.05em;text-transform:uppercase;">Utente</th>
              <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#999;text-align:left;letter-spacing:.05em;text-transform:uppercase;">Servizio</th>
              <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#999;text-align:left;letter-spacing:.05em;text-transform:uppercase;">Durata</th>
            </tr>
          </thead>
          <tbody>${righeInterventi(items, orari)}</tbody>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#2C1810;border-radius:12px 12px 0 0;padding:28px 28px 20px;">
      <div style="font-size:10px;font-weight:600;color:#C4714A;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px;">Coordina</div>
      <div style="font-size:22px;font-weight:300;color:#fff;font-style:italic;margin-bottom:16px;">menti</div>
      <div style="font-size:18px;font-weight:600;color:#fff;">Ciao ${operatoreNome.split(" ")[0]} 👋</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.65);margin-top:6px;text-transform:capitalize;">Il tuo piano per ${dataLabel}</div>
    </div>

    <!-- Body -->
    <div style="background:#fdfaf7;border-radius:0 0 12px 12px;padding:28px;">
      ${mattina.length > 0 ? sezione("Mattina", "8:00 – 14:30", mattina, orariMattina, "#C4714A") : ""}
      ${pomeriggio.length > 0 ? sezione("Pomeriggio", "14:30 – 18:30", pomeriggio, orariPomeriggio, "#5A7A6A") : ""}
      ${mattina.length === 0 && pomeriggio.length === 0 ? `<p style="color:#999;text-align:center;padding:32px 0;">Nessun intervento previsto per oggi.</p>` : ""}

      <div style="margin-top:16px;padding:16px;background:#f0ebe5;border-radius:8px;font-size:12px;color:#8B6E5A;line-height:1.6;">
        Gli orari sono indicativi. Per qualsiasi variazione contatta il coordinatore.
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;font-size:11px;color:#bbb;">
      Coordinamenti · Gestione turni domiciliari
    </div>
  </div>
</body>
</html>`;
}

export async function inviaRiepilogoGiornaliero(data: Date): Promise<number> {
  const resend = getResend();
  if (!resend) return 0;

  const emailFrom = process.env.EMAIL_FROM ?? "turni@coordinamenti.app";
  const dataInizio = new Date(data);
  dataInizio.setHours(0, 0, 0, 0);
  const dataFine = new Date(data);
  dataFine.setHours(23, 59, 59, 999);

  const operatori = await prisma.operatore.findMany({
    where: { attivo: true, email: { not: null } },
    include: {
      interventi: {
        where: {
          data: { gte: dataInizio, lte: dataFine },
          completato: false,
        },
        include: { utente: true, tipoServizio: true },
        orderBy: [{ turno: "asc" }, { id: "asc" }],
      },
    },
  });

  let inviati = 0;
  for (const op of operatori) {
    if (op.interventi.length === 0) continue;

    const mattina = op.interventi.filter((i) => i.turno === "mattina");
    const pomeriggio = op.interventi.filter((i) => i.turno === "pomeriggio");
    const html = buildHtml(op.nome, data, mattina, pomeriggio);

    const dataLabel = format(data, "EEEE d MMMM", { locale: it });
    await resend.emails.send({
      from: emailFrom,
      to: op.email!,
      subject: `Il tuo giro — ${dataLabel}`,
      html,
    });
    inviati++;
  }

  console.log(`[notifiche] ${inviati} email inviate per il ${format(data, "yyyy-MM-dd")}`);
  return inviati;
}

export async function inviaAggiornamentoPianificazione(
  dataInizio: Date,
  dataFine: Date,
): Promise<number> {
  let totale = 0;
  const cursor = new Date(dataInizio);
  while (cursor <= dataFine) {
    totale += await inviaRiepilogoGiornaliero(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return totale;
}
