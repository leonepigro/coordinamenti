import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- SKILL ---
  const skillOSS = await prisma.skill.create({
    data: { nome: "OSS", descrizione: "Operatore socio-sanitario" },
  });
  const skillInfermiere = await prisma.skill.create({
    data: { nome: "Infermiere", descrizione: "Assistenza infermieristica" },
  });
  const skillFisio = await prisma.skill.create({
    data: { nome: "Fisioterapia", descrizione: "Trattamenti fisioterapici" },
  });
  const skillPatente = await prisma.skill.create({
    data: { nome: "Patente B", descrizione: "Accompagno con veicolo" },
  });
  const skillMedicazioni = await prisma.skill.create({
    data: {
      nome: "Medicazioni avanzate",
      descrizione: "Gestione ferite e lesioni complesse",
    },
  });
  const skillFarmaci = await prisma.skill.create({
    data: {
      nome: "Somministrazione farmaci",
      descrizione: "Gestione terapia farmacologica",
    },
  });

  // --- TIPI SERVIZIO ---
  const srvIgiene = await prisma.tipoServizio.create({
    data: {
      nome: "Igiene personale",
      durata: 60,
      descrizione: "Bagno assistito, cura dell'igiene quotidiana",
      skills: { create: [{ skillId: skillOSS.id }] },
    },
  });

  const srvMedicazione = await prisma.tipoServizio.create({
    data: {
      nome: "Medicazione",
      durata: 45,
      descrizione: "Cambio medicazioni e gestione lesioni",
      skills: {
        create: [
          { skillId: skillInfermiere.id },
          { skillId: skillMedicazioni.id },
        ],
      },
    },
  });

  const srvFisioterapia = await prisma.tipoServizio.create({
    data: {
      nome: "Fisioterapia domiciliare",
      durata: 60,
      descrizione: "Esercizi di mobilizzazione e riabilitazione",
      skills: { create: [{ skillId: skillFisio.id }] },
    },
  });

  const srvAccompagno = await prisma.tipoServizio.create({
    data: {
      nome: "Accompagno",
      durata: 120,
      descrizione: "Accompagno a visite mediche o commissioni",
      skills: { create: [{ skillId: skillPatente.id }] },
    },
  });

  const srvFarmaci = await prisma.tipoServizio.create({
    data: {
      nome: "Somministrazione farmaci",
      durata: 30,
      descrizione: "Preparazione e somministrazione terapia",
      skills: {
        create: [{ skillId: skillInfermiere.id }, { skillId: skillFarmaci.id }],
      },
    },
  });

  const srvAssistenza = await prisma.tipoServizio.create({
    data: {
      nome: "Assistenza tutelare",
      durata: 90,
      descrizione: "Supporto nelle attività quotidiane e compagnia",
      skills: { create: [{ skillId: skillOSS.id }] },
    },
  });

  // --- OPERATORI ---
  const maria = await prisma.operatore.create({
    data: {
      nome: "Maria Rossi",
      qualifica: "OSS",
      oreSettimanali: 36,
      indirizzo: "Via Roma 1, Napoli",
      lat: 40.8518,
      lon: 14.2681,
      preferenzaTurno: "mattina",
      telefono: "333-1111111",
      skills: {
        create: [{ skillId: skillOSS.id }, { skillId: skillPatente.id }],
      },
    },
  });

  const luca = await prisma.operatore.create({
    data: {
      nome: "Luca Bianchi",
      qualifica: "Infermiere",
      oreSettimanali: 36,
      indirizzo: "Via Milano 10, Napoli",
      lat: 40.84,
      lon: 14.25,
      preferenzaTurno: "mattina",
      telefono: "333-2222222",
      skills: {
        create: [
          { skillId: skillInfermiere.id },
          { skillId: skillMedicazioni.id },
          { skillId: skillFarmaci.id },
        ],
      },
    },
  });

  const giulia = await prisma.operatore.create({
    data: {
      nome: "Giulia Verdi",
      qualifica: "OSS",
      oreSettimanali: 20,
      indirizzo: "Corso Umberto 5, Napoli",
      lat: 40.848,
      lon: 14.26,
      preferenzaTurno: "mattina",
      telefono: "333-3333333",
      skills: { create: [{ skillId: skillOSS.id }] },
    },
  });

  const antonio = await prisma.operatore.create({
    data: {
      nome: "Antonio Esposito",
      qualifica: "Fisioterapista",
      oreSettimanali: 36,
      indirizzo: "Via Caracciolo 3, Napoli",
      lat: 40.829,
      lon: 14.214,
      preferenzaTurno: "mattina",
      telefono: "333-4444444",
      skills: {
        create: [{ skillId: skillFisio.id }, { skillId: skillPatente.id }],
      },
    },
  });

  const sofia = await prisma.operatore.create({
    data: {
      nome: "Sofia Ferrari",
      qualifica: "Infermiere",
      oreSettimanali: 36,
      indirizzo: "Via Foria 22, Napoli",
      lat: 40.856,
      lon: 14.272,
      preferenzaTurno: "pomeriggio",
      telefono: "333-5555555",
      skills: {
        create: [
          { skillId: skillInfermiere.id },
          { skillId: skillFarmaci.id },
          { skillId: skillMedicazioni.id },
        ],
      },
    },
  });

  // --- UTENTI ---
  const gennaro = await prisma.utente.create({
    data: {
      nome: "Sig. Gennaro Formato",
      oreSettimanali: 12,
      indirizzo: "Via Chiaia 20, Napoli",
      lat: 40.835,
      lon: 14.245,
      note: "Anziano autosufficiente parziale, diabetico",
    },
  });

  const carla = await prisma.utente.create({
    data: {
      nome: "Sig.ra Carla Martini",
      oreSettimanali: 8,
      indirizzo: "Via Toledo 44, Napoli",
      lat: 40.842,
      lon: 14.252,
      note: "Post-operatoria, necessita medicazioni quotidiane",
    },
  });

  const antonio_u = await prisma.utente.create({
    data: {
      nome: "Sig. Antonio Serra",
      oreSettimanali: 15,
      indirizzo: "Piazza Dante 8, Napoli",
      lat: 40.853,
      lon: 14.256,
      note: "Disabilità motoria, in riabilitazione",
    },
  });

  const rosa = await prisma.utente.create({
    data: {
      nome: "Sig.ra Rosa Pellegrini",
      oreSettimanali: 10,
      indirizzo: "Via Spaccanapoli 5, Napoli",
      lat: 40.849,
      lon: 14.259,
      note: "Alzheimer lieve, necessita supervisione",
    },
  });

  // --- PIANI ASSISTENZIALI ---
  // Gennaro: igiene lun/mer/ven mattina + farmaci mar/gio
  await prisma.pianoAssistenziale.createMany({
    data: [
      {
        utenteId: gennaro.id,
        tipoServizioId: srvIgiene.id,
        giorniSettimana: "1,3,5",
        oraInizio: "08:00",
      },
      {
        utenteId: gennaro.id,
        tipoServizioId: srvFarmaci.id,
        giorniSettimana: "2,4",
        oraInizio: "09:00",
      },
      {
        utenteId: gennaro.id,
        tipoServizioId: srvAccompagno.id,
        giorniSettimana: "3",
        oraInizio: "10:30",
      },
    ],
  });

  // Carla: medicazione tutti i giorni + farmaci lun/mer/ven
  await prisma.pianoAssistenziale.createMany({
    data: [
      {
        utenteId: carla.id,
        tipoServizioId: srvMedicazione.id,
        giorniSettimana: "1,2,3,4,5",
        oraInizio: "08:30",
      },
      {
        utenteId: carla.id,
        tipoServizioId: srvFarmaci.id,
        giorniSettimana: "1,3,5",
        oraInizio: "13:00",
      },
    ],
  });

  // Antonio Serra: fisioterapia lun/mer/ven + igiene mar/gio + assistenza tutelare lun/gio
  await prisma.pianoAssistenziale.createMany({
    data: [
      {
        utenteId: antonio_u.id,
        tipoServizioId: srvFisioterapia.id,
        giorniSettimana: "1,3,5",
        oraInizio: "09:00",
      },
      {
        utenteId: antonio_u.id,
        tipoServizioId: srvIgiene.id,
        giorniSettimana: "2,4",
        oraInizio: "08:00",
      },
      {
        utenteId: antonio_u.id,
        tipoServizioId: srvAssistenza.id,
        giorniSettimana: "1,4",
        oraInizio: "14:00",
      },
    ],
  });

  // Rosa: igiene tutti i giorni + assistenza tutelare mar/gio/sab
  await prisma.pianoAssistenziale.createMany({
    data: [
      {
        utenteId: rosa.id,
        tipoServizioId: srvIgiene.id,
        giorniSettimana: "1,2,3,4,5",
        oraInizio: "08:00",
      },
      {
        utenteId: rosa.id,
        tipoServizioId: srvAssistenza.id,
        giorniSettimana: "2,4,6",
        oraInizio: "15:00",
      },
    ],
  });

  // --- EQUIPE ---
  // Equipe Gennaro: Maria principale (OSS+patente), Giulia backup
  const equipGennaro = await prisma.equipe.create({
    data: {
      utenteId: gennaro.id,
      nome: "Equipe Formato",
      membri: {
        create: [
          { operatoreId: maria.id, ruolo: "principale" },
          { operatoreId: giulia.id, ruolo: "backup" },
        ],
      },
    },
  });

  // Equipe Carla: Luca principale (infermiere), Sofia backup
  const equipCarla = await prisma.equipe.create({
    data: {
      utenteId: carla.id,
      nome: "Equipe Martini",
      membri: {
        create: [
          { operatoreId: luca.id, ruolo: "principale" },
          { operatoreId: sofia.id, ruolo: "backup" },
        ],
      },
    },
  });

  // Equipe Antonio Serra: Antonio fisio principale, Maria per igiene, Sofia per farmaci
  const equipSerra = await prisma.equipe.create({
    data: {
      utenteId: antonio_u.id,
      nome: "Equipe Serra",
      membri: {
        create: [
          { operatoreId: antonio.id, ruolo: "principale" },
          { operatoreId: maria.id, ruolo: "igiene" },
          { operatoreId: sofia.id, ruolo: "farmaci" },
        ],
      },
    },
  });

  // Equipe Rosa: Maria e Giulia si alternano
  const equipRosa = await prisma.equipe.create({
    data: {
      utenteId: rosa.id,
      nome: "Equipe Pellegrini",
      membri: {
        create: [
          { operatoreId: maria.id, ruolo: "principale" },
          { operatoreId: giulia.id, ruolo: "alternata" },
        ],
      },
    },
  });

  // Indisponibilità di esempio
  await prisma.indisponibilita.create({
    data: {
      operatoreId: giulia.id,
      data: new Date("2026-04-21"),
      motivo: "ferie",
    },
  });

  // Utenti app
  await prisma.utenteApp.createMany({
    data: [
      {
        email: "paola@coordinamenti.it",
        nome: "Paola",
        passwordHash: bcrypt.hashSync("coordinamenti2026", 10),
        ruolo: "admin",
      },
      {
        email: "maria@coordinamenti.it",
        nome: "Maria Rossi",
        passwordHash: bcrypt.hashSync("operatore123", 10),
        ruolo: "operatore",
        operatoreId: maria.id,
      },
      {
        email: "luca@coordinamenti.it",
        nome: "Luca Bianchi",
        passwordHash: bcrypt.hashSync("operatore123", 10),
        ruolo: "operatore",
        operatoreId: luca.id,
      },
    ],
  });

  console.log("✓ Skill:", 6);
  console.log("✓ Tipi servizio:", 6);
  console.log("✓ Operatori:", 5);
  console.log("✓ Utenti:", 4);
  console.log("✓ Piani assistenziali:", 10);
  console.log("✓ Equipe:", 4);
  console.log("Seed completato!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
