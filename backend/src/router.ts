import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function geocodifica(
  indirizzo: string,
): Promise<{ lat: number; lon: number } | null> {
  try {
    const encoded = encodeURIComponent(indirizzo);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "turni-domiciliari-app" },
    });
    const data = (await res.json()) as any[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function ordinaInterventi(
  puntoPartenza: { lat: number; lon: number },
  interventi: { id: number; lat: number; lon: number; nome: string }[],
): Promise<
  { id: number; lat: number; lon: number; nome: string; ordine: number }[]
> {
  const rimanenti = [...interventi];
  const ordinate = [];
  let posizione = puntoPartenza;
  let ordine = 1;

  while (rimanenti.length > 0) {
    let minDurata = Infinity;
    let indiceVicino = 0;

    for (let i = 0; i < rimanenti.length; i++) {
      const durata = await getDurataStradale(
        posizione.lat,
        posizione.lon,
        rimanenti[i].lat,
        rimanenti[i].lon,
      );
      if (durata < minDurata) {
        minDurata = durata;
        indiceVicino = i;
      }
    }

    const scelta = rimanenti.splice(indiceVicino, 1)[0];
    ordinate.push({ ...scelta, ordine });
    posizione = { lat: scelta.lat, lon: scelta.lon };
    ordine++;
  }

  return ordinate;
}
async function getDurataStradale(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  mezzo: string = "driving",
): Promise<number> {
  try {
    // OSRM supporta: driving, cycling, foot
    const profilo =
      mezzo === "cycling" ? "cycling" : mezzo === "foot" ? "foot" : "driving";
    const url = `http://router.project-osrm.org/route/v1/${profilo}/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url);
    const data = (await res.json()) as any;
    if (data.code !== "Ok") return 9999;
    return data.routes[0].duration;
  } catch {
    const dx = (lat2 - lat1) * 111000;
    const dy = (lon2 - lon1) * 111000;
    return Math.sqrt(dx * dx + dy * dy) / 10;
  }
}

// Genera link Google Maps per il percorso completo
function generaLinkGoogleMaps(
  partenza: { lat: number; lon: number },
  tappe: { lat: number; lon: number; nome: string }[],
  mezzo: string,
): string {
  const modoGmaps =
    mezzo === "cycling"
      ? "bicycling"
      : mezzo === "foot"
        ? "transit"
        : "driving";

  if (tappe.length === 0) return "";

  const origine = `${partenza.lat},${partenza.lon}`;
  const destinazione = `${tappe[tappe.length - 1].lat},${tappe[tappe.length - 1].lon}`;
  const waypoints = tappe
    .slice(0, -1)
    .map((t) => `${t.lat},${t.lon}`)
    .join("|");

  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${origine}`;
  url += `&destination=${destinazione}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  url += `&travelmode=${modoGmaps}`;

  return url;
}

export async function ottimizzaGiornata(operatoreId: number, data: Date) {
  const operatore = await prisma.operatore.findUnique({
    where: { id: operatoreId },
    select: {
      id: true,
      nome: true,
      lat: true,
      lon: true,
      mezzoTrasporto: true,
    },
  });

  if (!operatore || !operatore.lat || !operatore.lon) {
    throw new Error("Operatore non trovato o coordinate mancanti");
  }

  const mezzo = operatore.mezzoTrasporto ?? "driving";

  const inizioGiorno = new Date(data);
  inizioGiorno.setHours(0, 0, 0, 0);
  const fineGiorno = new Date(data);
  fineGiorno.setHours(23, 59, 59, 999);

  const interventi = await prisma.intervento.findMany({
    where: {
      operatoreId,
      data: { gte: inizioGiorno, lte: fineGiorno },
    },
    include: { utente: true },
  });

  if (interventi.length === 0) return { percorso: [], linkMaps: "" };

  const punti = interventi
    .filter((i) => i.utente.lat && i.utente.lon)
    .map((i) => ({
      id: i.id,
      lat: i.utente.lat!,
      lon: i.utente.lon!,
      nome: i.utente.nome,
    }));

  // Nearest neighbor con mezzo specifico
  const rimanenti = [...punti];
  const ordinate: (typeof punti)[0][] = [];
  let posizione = { lat: operatore.lat, lon: operatore.lon };

  while (rimanenti.length > 0) {
    let minDurata = Infinity;
    let indiceVicino = 0;

    for (let i = 0; i < rimanenti.length; i++) {
      const durata = await getDurataStradale(
        posizione.lat,
        posizione.lon,
        rimanenti[i].lat,
        rimanenti[i].lon,
        mezzo,
      );
      if (durata < minDurata) {
        minDurata = durata;
        indiceVicino = i;
      }
    }

    const scelta = rimanenti.splice(indiceVicino, 1)[0];
    ordinate.push(scelta);
    posizione = { lat: scelta.lat, lon: scelta.lon };
  }

  // Salva ordine nel DB
  for (let i = 0; i < ordinate.length; i++) {
    await prisma.intervento.update({
      where: { id: ordinate[i].id },
      data: { ordineGiornata: i + 1 },
    });
  }

  const linkMaps = generaLinkGoogleMaps(
    { lat: operatore.lat, lon: operatore.lon },
    ordinate,
    mezzo,
  );

  return {
    percorso: ordinate.map((p, i) => ({ ...p, ordine: i + 1 })),
    linkMaps,
    mezzo,
    operatore: operatore.nome,
  };
}
