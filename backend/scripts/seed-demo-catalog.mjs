import { PrismaClient } from '@prisma/client';

// Local demonstration data. Existing catalog records are never changed.
const examples = [
  {
    category: 'Strategiczne',
    title: 'Wyspa odkrywców',
    description:
      'Zbieraj zasoby, buduj osady i planuj kolejne ruchy. Każda decyzja przybliża Cię do zwycięstwa.',
    minPlayers: 2,
    maxPlayers: 4,
    recommendedAge: 10,
    durationMinutes: 75,
    copies: 2,
  },
  {
    category: 'Strategiczne',
    title: 'Miasto przyszłości',
    description:
      'Zaprojektuj tętniącą życiem metropolię i wykorzystaj każdą parcelę jak najlepiej.',
    minPlayers: 2,
    maxPlayers: 5,
    recommendedAge: 12,
    durationMinutes: 90,
    copies: 1,
  },
  {
    category: 'Rodzinne',
    title: 'Leśna wyprawa',
    description:
      'Wyrusz na kolorowy szlak pełen niespodzianek. Proste zasady i mnóstwo śmiechu dla całej rodziny.',
    minPlayers: 2,
    maxPlayers: 6,
    recommendedAge: 6,
    durationMinutes: 30,
    copies: 3,
  },
  {
    category: 'Rodzinne',
    title: 'Kawiarnia marzeń',
    description:
      'Komponuj zamówienia, poznawaj gości i stwórz najbardziej przytulne miejsce w mieście.',
    minPlayers: 2,
    maxPlayers: 4,
    recommendedAge: 8,
    durationMinutes: 45,
    copies: 2,
  },
  {
    category: 'Kooperacyjne',
    title: 'Załoga kosmiczna',
    description:
      'Wspólnie poprowadźcie statek przez nieznane układy. Zwyciężycie tylko dzięki dobrej współpracy.',
    minPlayers: 2,
    maxPlayers: 5,
    recommendedAge: 10,
    durationMinutes: 60,
    copies: 2,
  },
  {
    category: 'Kooperacyjne',
    title: 'Tajemnica latarni',
    description:
      'Odkrywaj wskazówki i rozwiązuj zagadki razem z drużyną, zanim zgaśnie ostatnie światło.',
    minPlayers: 1,
    maxPlayers: 4,
    recommendedAge: 12,
    durationMinutes: 50,
    copies: 1,
  },
  {
    category: 'Rodzinne',
    title: 'Rzeka opowieści',
    description:
      'Układaj historie z kart i odkrywaj zakręty pełne niespodzianek.',
    minPlayers: 2,
    maxPlayers: 6,
    recommendedAge: 7,
    durationMinutes: 35,
    copies: 2,
  },
  {
    category: 'Strategiczne',
    title: 'Targowisko',
    description:
      'Handluj, planuj i przechytrz rywali, by zbudować najbogatszy stragan.',
    minPlayers: 2,
    maxPlayers: 5,
    recommendedAge: 10,
    durationMinutes: 60,
    copies: 1,
  },
  {
    category: 'Kooperacyjne',
    title: 'Podwodne królestwo',
    description:
      'Wspólnie odkrywajcie głębiny i chrońcie ich niezwykłych mieszkańców.',
    minPlayers: 2,
    maxPlayers: 4,
    recommendedAge: 9,
    durationMinutes: 55,
    copies: 2,
  },
  {
    category: 'Strategiczne',
    title: 'Zegar tajemnic',
    description: 'Każda runda przybliża finał. Wybieraj ruchy z wyprzedzeniem.',
    minPlayers: 2,
    maxPlayers: 4,
    recommendedAge: 12,
    durationMinutes: 70,
    copies: 1,
  },
  {
    category: 'Rodzinne',
    title: 'Park marzeń',
    description:
      'Zaprojektuj najbardziej kolorowy park i zaproś do niego gości.',
    minPlayers: 2,
    maxPlayers: 5,
    recommendedAge: 8,
    durationMinutes: 40,
    copies: 2,
  },
  {
    category: 'Strategiczne',
    title: 'Wioska na wzgórzu',
    description:
      'Rozwijaj swoją wioskę, zdobywaj surowce i dbaj o mieszkańców.',
    minPlayers: 2,
    maxPlayers: 4,
    recommendedAge: 10,
    durationMinutes: 80,
    copies: 1,
  },
  {
    category: 'Rodzinne',
    title: 'Wyprawa po skarb',
    description:
      'Przemierzaj mapę, zbieraj wskazówki i dotrzyj do skarbu przed innymi.',
    minPlayers: 2,
    maxPlayers: 6,
    recommendedAge: 6,
    durationMinutes: 30,
    copies: 2,
  },
  {
    category: 'Kooperacyjne',
    title: 'Szyfr ogrodu',
    description:
      'Łączcie tropy i odszyfrujcie wiadomość ukrytą między roślinami.',
    minPlayers: 1,
    maxPlayers: 4,
    recommendedAge: 10,
    durationMinutes: 45,
    copies: 1,
  },
];

const prisma = new PrismaClient();
try {
  for (const [index, example] of examples.entries()) {
    const category = await prisma.category.upsert({
      where: { name: example.category },
      create: { name: example.category },
      update: {},
    });
    let game = await prisma.game.findFirst({
      where: { title: example.title, categoryId: category.id },
      select: { id: true },
    });
    if (!game) {
      game = await prisma.game.create({
        data: {
          title: example.title,
          description: example.description,
          minPlayers: example.minPlayers,
          maxPlayers: example.maxPlayers,
          recommendedAge: example.recommendedAge,
          durationMinutes: example.durationMinutes,
          categoryId: category.id,
        },
        select: { id: true },
      });
    }
    for (let copy = 1; copy <= example.copies; copy++) {
      await prisma.gameCopy.upsert({
        where: { inventoryCode: `DEMO-BR-${index + 1}-${copy}` },
        create: {
          inventoryCode: `DEMO-BR-${index + 1}-${copy}`,
          gameId: game.id,
        },
        update: {},
      });
    }
  }
  console.log(
    'Przykładowy katalog gotowy. Odśwież frontend, aby zobaczyć gry.',
  );
} catch {
  console.error(
    'Nie udało się dodać przykładowych gier. Sprawdź połączenie z bazą i migracje.',
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
