/**
 * Printable, standard-style PDF export for campaign character sheets.
 * Kept separate from the random character generator so it can be loaded only
 * when the player explicitly requests a download.
 */

import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';

import {
  type AbilityScores,
  type CharacterPublicProfile,
  type CharacterSheet,
} from '@guild/models/character.model';
import { type BilingualText } from '@guild/models/language.model';
import { SPELL_CATEGORIES } from '@arcana/constants/spells.constants';
import { SPELL_SCHOOLS, isSpellEntry, type SpellEntry } from '@arcana/models/compendium.model';

export type CampaignPdfLanguage = 'en' | 'it';

type AbilityKey = keyof AbilityScores;

interface SkillDefinition {
  readonly en: string;
  readonly it: string;
  readonly ability: AbilityKey;
  readonly abbreviation: string;
}

interface ResolvedSpell {
  readonly categoryId?: string;
  readonly entry?: SpellEntry;
  readonly originalName: string;
}

export interface CampaignCharacterPdfOptions {
  readonly publicProfile?: CharacterPublicProfile;
  readonly profileImageUrl?: string;
  readonly portraitImageUrl?: string;
  readonly chapterTitle?: BilingualText;
  readonly recordedAt?: string;
}

interface PdfArtwork {
  readonly token?: string;
  readonly portrait?: string;
}

type RgbColor = [number, number, number];

const PAGE = {
  width: 210,
  height: 297,
  margin: 12,
  contentWidth: 186,
} as const;

const COLOR: Record<
  'ink' | 'muted' | 'line' | 'paper' | 'panel' | 'header' | 'gold' | 'burgundy' | 'white',
  RgbColor
> = {
  ink: [32, 31, 38],
  muted: [100, 96, 104],
  line: [193, 188, 178],
  paper: [248, 241, 220],
  panel: [235, 224, 196],
  header: [43, 27, 34],
  gold: [171, 126, 38],
  burgundy: [105, 34, 44],
  white: [255, 255, 255],
};

const ABILITIES: ReadonlyArray<{
  readonly key: AbilityKey;
  readonly en: string;
  readonly it: string;
  readonly abbreviationEn: string;
  readonly abbreviationIt: string;
}> = [
  { key: 'strength', en: 'Strength', it: 'Forza', abbreviationEn: 'STR', abbreviationIt: 'FOR' },
  {
    key: 'dexterity',
    en: 'Dexterity',
    it: 'Destrezza',
    abbreviationEn: 'DEX',
    abbreviationIt: 'DES',
  },
  {
    key: 'constitution',
    en: 'Constitution',
    it: 'Costituzione',
    abbreviationEn: 'CON',
    abbreviationIt: 'COS',
  },
  {
    key: 'intelligence',
    en: 'Intelligence',
    it: 'Intelligenza',
    abbreviationEn: 'INT',
    abbreviationIt: 'INT',
  },
  { key: 'wisdom', en: 'Wisdom', it: 'Saggezza', abbreviationEn: 'WIS', abbreviationIt: 'SAG' },
  { key: 'charisma', en: 'Charisma', it: 'Carisma', abbreviationEn: 'CHA', abbreviationIt: 'CAR' },
];

const SKILLS: ReadonlyArray<SkillDefinition> = [
  { en: 'Acrobatics', it: 'Acrobazia', ability: 'dexterity', abbreviation: 'DEX' },
  { en: 'Animal Handling', it: 'Addestrare Animali', ability: 'wisdom', abbreviation: 'WIS' },
  { en: 'Arcana', it: 'Arcano', ability: 'intelligence', abbreviation: 'INT' },
  { en: 'Athletics', it: 'Atletica', ability: 'strength', abbreviation: 'STR' },
  { en: 'Deception', it: 'Inganno', ability: 'charisma', abbreviation: 'CHA' },
  { en: 'History', it: 'Storia', ability: 'intelligence', abbreviation: 'INT' },
  { en: 'Insight', it: 'Intuizione', ability: 'wisdom', abbreviation: 'WIS' },
  { en: 'Intimidation', it: 'Intimidire', ability: 'charisma', abbreviation: 'CHA' },
  { en: 'Investigation', it: 'Indagare', ability: 'intelligence', abbreviation: 'INT' },
  { en: 'Medicine', it: 'Medicina', ability: 'wisdom', abbreviation: 'WIS' },
  { en: 'Nature', it: 'Natura', ability: 'intelligence', abbreviation: 'INT' },
  { en: 'Perception', it: 'Percezione', ability: 'wisdom', abbreviation: 'WIS' },
  { en: 'Performance', it: 'Intrattenere', ability: 'charisma', abbreviation: 'CHA' },
  { en: 'Persuasion', it: 'Persuasione', ability: 'charisma', abbreviation: 'CHA' },
  { en: 'Religion', it: 'Religione', ability: 'intelligence', abbreviation: 'INT' },
  { en: 'Sleight of Hand', it: 'Rapidità di Mano', ability: 'dexterity', abbreviation: 'DEX' },
  { en: 'Stealth', it: 'Furtività', ability: 'dexterity', abbreviation: 'DEX' },
  { en: 'Survival', it: 'Sopravvivenza', ability: 'wisdom', abbreviation: 'WIS' },
];

/** Generates a three-page illustrated A4 character dossier. */
export async function generateCampaignCharacterSheetPdf(
  characterName: string,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  options: CampaignCharacterPdfOptions = {},
): Promise<Blob> {
  const artwork = await loadArtwork(options);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `${characterName} - Character Sheet`,
    subject: 'Fantasy RPG Character Sheet',
    author: 'QuestKeeper',
    creator: 'QuestKeeper',
  });

  drawProfilePage(doc, characterName, sheet, language, options, artwork);
  doc.addPage();
  drawPageOne(doc, characterName, sheet, language);
  doc.addPage();
  drawPageTwo(doc, characterName, sheet, language);
  drawPageNumbers(doc, language);

  return doc.output('blob');
}

function drawProfilePage(
  doc: jsPDF,
  characterName: string,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  options: CampaignCharacterPdfOptions,
  artwork: PdfArtwork,
): void {
  drawHeader(
    doc,
    characterName,
    sheet,
    language,
    language === 'it' ? "Dossier dell'avventuriero" : 'Adventurer dossier',
  );

  const tokenSize = 30;
  if (artwork.token !== undefined) {
    drawFramedImage(doc, artwork.token, PAGE.margin, 36, tokenSize, tokenSize);
  } else {
    drawImagePlaceholder(doc, PAGE.margin, 36, tokenSize, tokenSize);
  }

  doc.setFont('times', 'bold');
  doc.setTextColor(...COLOR.burgundy);
  doc.setFontSize(18);
  doc.text(characterName, 47, 45);
  doc.setFont('times', 'italic');
  doc.setTextColor(...COLOR.muted);
  doc.setFontSize(9);
  doc.text(
    `${sheet.race} | ${sheet.classType} | ${language === 'it' ? 'Livello' : 'Level'} ${sheet.level}`,
    47,
    53,
  );

  const chapterLabel = language === 'it' ? `Capitolo ${sheet.level}` : `Chapter ${sheet.level}`;
  const chapterTitle = options.chapterTitle;
  const chapterText =
    chapterTitle === undefined
      ? chapterLabel
      : `${chapterLabel} - ${language === 'it' ? chapterTitle.it : chapterTitle.en}`;
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.gold);
  doc.text(chapterText, 47, 61);
  if (options.recordedAt !== undefined) {
    doc.setFont('times', 'normal');
    doc.setTextColor(...COLOR.muted);
    doc.setFontSize(7);
    doc.text(formatRecordedDate(options.recordedAt, language), 47, 65);
  }

  const portraitX = 132;
  const portraitY = 37;
  const portraitWidth = 64;
  const portraitHeight = 96;
  if (artwork.portrait !== undefined) {
    drawFramedImage(doc, artwork.portrait, portraitX, portraitY, portraitWidth, portraitHeight);
  } else {
    drawImagePlaceholder(doc, portraitX, portraitY, portraitWidth, portraitHeight);
  }

  const profile = options.publicProfile;
  if (profile === undefined) {
    sectionTitle(
      doc,
      language === 'it' ? 'Profilo pubblico' : 'Public profile',
      79,
      PAGE.margin,
      110,
    );
    doc.setFont('times', 'italic');
    doc.setTextColor(...COLOR.muted);
    doc.setFontSize(9);
    doc.text(
      language === 'it' ? 'Profilo ancora da raccontare.' : 'This profile is still being written.',
      PAGE.margin,
      89,
    );
    return;
  }

  let leftY = drawProfileText(
    doc,
    language === 'it' ? 'Storia' : 'Backstory',
    localized(profile.backstory, language),
    PAGE.margin,
    78,
    110,
    7.4,
  );

  const knownY = Math.max(145, leftY + 5);
  const knownEnd = drawProfileText(
    doc,
    language === 'it' ? 'Storia conosciuta' : 'Known history',
    localized(profile.knownHistory, language),
    PAGE.margin,
    knownY,
    PAGE.contentWidth,
    7.4,
  );

  const detailsY = knownEnd + 6;
  const columnGap = 6;
  const columnWidth = (PAGE.contentWidth - columnGap) / 2;
  leftY = drawProfileText(
    doc,
    language === 'it' ? 'Tratti caratteriali' : 'Personality traits',
    localized(profile.traits, language),
    PAGE.margin,
    detailsY,
    columnWidth,
    7,
  );
  drawProfileText(
    doc,
    language === 'it' ? 'Ideali' : 'Ideals',
    localized(profile.ideals, language),
    PAGE.margin,
    leftY + 4,
    columnWidth,
    7,
  );

  const rightX = PAGE.margin + columnWidth + columnGap;
  let rightY = drawProfileText(
    doc,
    language === 'it' ? 'Legami' : 'Bonds',
    localized(profile.bonds, language),
    rightX,
    detailsY,
    columnWidth,
    7,
  );
  rightY = drawProfileText(
    doc,
    language === 'it' ? 'Difetti' : 'Flaws',
    localized(profile.flaws, language),
    rightX,
    rightY + 4,
    columnWidth,
    7,
  );

  const profileEnd = Math.max(leftY, rightY) + 5;
  drawDividerOrnament(doc, profileEnd);
  if (profileEnd <= 243) {
    drawJourneySummary(doc, sheet, language, profileEnd + 9);
  }
}

function drawJourneySummary(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): void {
  sectionTitle(
    doc,
    language === 'it' ? 'Sigillo del viaggio' : 'Journey seal',
    y,
    PAGE.margin,
    PAGE.contentWidth,
  );

  const entries: ReadonlyArray<readonly [string, string]> = [
    [language === 'it' ? 'Livello' : 'Level', String(sheet.level)],
    ['HP', `${sheet.hitPoints}/${sheet.maxHitPoints}`],
    ['AC', String(sheet.armorClass)],
    [language === 'it' ? 'Competenza' : 'Proficiency', `+${sheet.proficiencyBonus}`],
    ['XP', String(sheet.experiencePoints)],
  ];
  const gap = 3;
  const cardWidth = (PAGE.contentWidth - gap * (entries.length - 1)) / entries.length;
  const cardY = y + 4;

  entries.forEach(([label, value], index) => {
    const x = PAGE.margin + index * (cardWidth + gap);
    doc.setFillColor(...COLOR.panel);
    doc.setDrawColor(...COLOR.gold);
    doc.roundedRect(x, cardY, cardWidth, 18, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setTextColor(...COLOR.burgundy);
    doc.setFontSize(11);
    doc.text(value, x + cardWidth / 2, cardY + 8, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setTextColor(...COLOR.muted);
    doc.setFontSize(6.2);
    doc.text(label.toUpperCase(), x + cardWidth / 2, cardY + 13.5, { align: 'center' });
  });
}

function formatRecordedDate(value: string, language: CampaignPdfLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'it' ? 'it-IT' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function drawPageOne(
  doc: jsPDF,
  characterName: string,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
): void {
  drawHeader(
    doc,
    characterName,
    sheet,
    language,
    language === 'it' ? 'Scheda personaggio' : 'Character sheet',
  );

  let y = 35;
  y = drawIdentity(doc, sheet, language, y);
  y = drawCombatSummary(doc, sheet, language, y + 5);
  y = drawAbilityScores(doc, sheet, language, y + 6);
  drawProficiencyColumns(doc, sheet, language, y + 7);
}

function drawPageTwo(
  doc: jsPDF,
  characterName: string,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
): void {
  drawHeader(
    doc,
    characterName,
    sheet,
    language,
    language === 'it' ? 'Dotazioni e magia' : 'Equipment & spellcasting',
  );
  let y = 35;

  y = drawFeatureAndInventoryColumns(doc, sheet, language, y);
  y = drawSpellcasting(doc, sheet, language, y + 6);
  drawNotes(doc, language, y + 7);
}

function drawHeader(
  doc: jsPDF,
  characterName: string,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  pageTitle: string,
): void {
  drawPageBackground(doc);
  doc.setFillColor(...COLOR.header);
  doc.rect(0, 0, PAGE.width, 29, 'F');
  doc.setFillColor(...COLOR.gold);
  doc.rect(0, 28, PAGE.width, 1, 'F');

  doc.setFont('times', 'bold');
  doc.setTextColor(...COLOR.gold);
  doc.setFontSize(19);
  doc.text(characterName, PAGE.margin, 12);

  doc.setFont('times', 'italic');
  doc.setTextColor(...COLOR.white);
  doc.setFontSize(9);
  const classLine = `${sheet.race} | ${sheet.classType}${sheet.subclass ? ` (${sheet.subclass})` : ''} | ${language === 'it' ? 'Livello' : 'Level'} ${sheet.level}`;
  doc.text(classLine, PAGE.margin, 20);

  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.text(pageTitle.toUpperCase(), PAGE.width - PAGE.margin, 11, { align: 'right' });
  doc.setFont('times', 'normal');
  doc.setTextColor(210, 207, 215);
  doc.setFontSize(7);
  doc.text('FANTASY RPG | CAMPAIGN COMPANION', PAGE.width - PAGE.margin, 19, { align: 'right' });
}

function drawIdentity(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): number {
  const labels =
    language === 'it'
      ? ['Classe e livello', 'Background', 'Razza', 'Allineamento', 'Punti esperienza']
      : ['Class & level', 'Background', 'Race', 'Alignment', 'Experience points'];
  const values = [
    `${sheet.classType}${sheet.subclass ? ` - ${sheet.subclass}` : ''} ${sheet.level}`,
    sheet.background,
    sheet.race,
    sheet.alignment,
    String(sheet.experiencePoints),
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [labels],
    body: [values],
    styles: {
      font: 'times',
      fontSize: 7.5,
      cellPadding: 2,
      halign: 'center',
      lineColor: COLOR.line,
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: COLOR.panel,
      textColor: COLOR.muted,
      fontStyle: 'bold',
      fontSize: 6.5,
    },
    bodyStyles: { fillColor: COLOR.paper, textColor: COLOR.ink, fontStyle: 'bold' },
    theme: 'grid',
  });
  return tableEnd(doc);
}

function drawCombatSummary(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): number {
  sectionTitle(doc, language === 'it' ? 'Combattimento' : 'Combat', y);
  const dexterity = modifier(sheet.abilityScores.dexterity);
  const passivePerception =
    10 +
    modifier(sheet.abilityScores.wisdom) +
    (hasProficiency(sheet.skills, 'Perception', 'Percezione') ? sheet.proficiencyBonus : 0);

  const headers =
    language === 'it'
      ? [
          'Classe Armatura',
          'Iniziativa',
          'Velocità',
          'Punti Ferita',
          'Bonus Competenza',
          'Percezione Passiva',
        ]
      : [
          'Armor Class',
          'Initiative',
          'Speed',
          'Hit Points',
          'Proficiency Bonus',
          'Passive Perception',
        ];
  const values = [
    String(sheet.armorClass),
    signed(dexterity),
    `${sheet.speed} ft`,
    `${sheet.hitPoints} / ${sheet.maxHitPoints}`,
    signed(sheet.proficiencyBonus),
    String(passivePerception),
  ];

  autoTable(doc, {
    startY: y + 4,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [headers],
    body: [values],
    styles: {
      font: 'times',
      halign: 'center',
      cellPadding: 2.5,
      lineColor: COLOR.line,
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: COLOR.header,
      textColor: COLOR.gold,
      fontSize: 6.3,
      fontStyle: 'bold',
    },
    bodyStyles: { fillColor: COLOR.paper, textColor: COLOR.ink, fontSize: 13, fontStyle: 'bold' },
    theme: 'grid',
  });
  return tableEnd(doc);
}

function drawAbilityScores(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): number {
  sectionTitle(doc, language === 'it' ? 'Caratteristiche' : 'Ability Scores', y);
  const headers = ABILITIES.map((ability) =>
    language === 'it' ? ability.abbreviationIt : ability.abbreviationEn,
  );
  const values = ABILITIES.map((ability) => String(sheet.abilityScores[ability.key]));
  const modifiers = ABILITIES.map((ability) => signed(modifier(sheet.abilityScores[ability.key])));

  autoTable(doc, {
    startY: y + 4,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [headers],
    body: [values, modifiers],
    styles: {
      font: 'times',
      halign: 'center',
      cellPadding: 2,
      lineColor: COLOR.line,
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: COLOR.burgundy,
      textColor: COLOR.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: { fillColor: COLOR.paper, textColor: COLOR.ink, fontSize: 12, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLOR.panel, textColor: COLOR.burgundy, fontSize: 9 },
    theme: 'grid',
  });
  return tableEnd(doc);
}

function drawProficiencyColumns(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): void {
  const gap = 5;
  const leftWidth = 62;
  const rightX = PAGE.margin + leftWidth + gap;
  const rightWidth = PAGE.contentWidth - leftWidth - gap;

  sectionTitle(
    doc,
    language === 'it' ? 'Tiri salvezza' : 'Saving Throws',
    y,
    PAGE.margin,
    leftWidth,
  );
  const savingRows = ABILITIES.map((ability) => {
    const proficient = hasProficiency(sheet.savingThrows, ability.en, ability.it);
    const value =
      modifier(sheet.abilityScores[ability.key]) + (proficient ? sheet.proficiencyBonus : 0);
    return [proficient ? 'X' : '', language === 'it' ? ability.it : ability.en, signed(value)];
  });
  autoTable(doc, {
    startY: y + 4,
    margin: { left: PAGE.margin },
    tableWidth: leftWidth,
    body: savingRows,
    styles: {
      font: 'times',
      fontSize: 7.5,
      cellPadding: 1.6,
      lineColor: COLOR.line,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', textColor: COLOR.burgundy },
      1: { cellWidth: 38, textColor: COLOR.ink },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: COLOR.ink },
    },
    alternateRowStyles: { fillColor: COLOR.panel },
    theme: 'grid',
  });

  const savingEnd = tableEnd(doc);
  sectionTitle(
    doc,
    language === 'it' ? 'Lingue' : 'Languages',
    savingEnd + 6,
    PAGE.margin,
    leftWidth,
  );
  doc.setFont('times', 'normal');
  doc.setTextColor(...COLOR.ink);
  doc.setFontSize(8);
  const languageLines = doc.splitTextToSize(sheet.languages.join(' | '), leftWidth - 4) as string[];
  doc.text(languageLines, PAGE.margin + 2, savingEnd + 15);

  sectionTitle(doc, language === 'it' ? 'Abilità' : 'Skills', y, rightX, rightWidth);
  const skillRows = SKILLS.map((skill) => {
    const proficient = hasProficiency(sheet.skills, skill.en, skill.it);
    const value =
      modifier(sheet.abilityScores[skill.ability]) + (proficient ? sheet.proficiencyBonus : 0);
    return [
      proficient ? 'X' : '',
      language === 'it' ? skill.it : skill.en,
      language === 'it' ? abilityAbbreviation(skill.ability, 'it') : skill.abbreviation,
      signed(value),
    ];
  });
  autoTable(doc, {
    startY: y + 4,
    margin: { left: rightX },
    tableWidth: rightWidth,
    body: skillRows,
    styles: {
      font: 'times',
      fontSize: 7,
      cellPadding: 1.15,
      lineColor: COLOR.line,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', textColor: COLOR.burgundy },
      1: { cellWidth: 'auto', textColor: COLOR.ink },
      2: { cellWidth: 15, halign: 'center', textColor: COLOR.muted, fontSize: 6.2 },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: COLOR.ink },
    },
    alternateRowStyles: { fillColor: COLOR.panel },
    theme: 'grid',
  });
}

function drawFeatureAndInventoryColumns(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): number {
  const gap = 6;
  const columnWidth = (PAGE.contentWidth - gap) / 2;
  const rightX = PAGE.margin + columnWidth + gap;

  sectionTitle(
    doc,
    language === 'it' ? 'Privilegi e tratti' : 'Features & Traits',
    y,
    PAGE.margin,
    columnWidth,
  );
  autoTable(doc, {
    startY: y + 4,
    margin: { left: PAGE.margin },
    tableWidth: columnWidth,
    body: sheet.features.map((feature) => [feature]),
    styles: {
      font: 'times',
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: COLOR.line,
      lineWidth: 0.2,
      textColor: COLOR.ink,
    },
    alternateRowStyles: { fillColor: COLOR.panel },
    theme: 'grid',
  });
  const featureEnd = tableEnd(doc);

  sectionTitle(doc, language === 'it' ? 'Inventario' : 'Inventory', y, rightX, columnWidth);
  const inventoryRows: string[][] = [];
  for (let index = 0; index < sheet.equipment.length; index += 2) {
    inventoryRows.push([sheet.equipment[index] ?? '', sheet.equipment[index + 1] ?? '']);
  }
  autoTable(doc, {
    startY: y + 4,
    margin: { left: rightX },
    tableWidth: columnWidth,
    body: inventoryRows,
    styles: {
      font: 'times',
      fontSize: 7,
      cellPadding: 1.8,
      lineColor: COLOR.line,
      lineWidth: 0.15,
      textColor: COLOR.ink,
    },
    alternateRowStyles: { fillColor: COLOR.panel },
    theme: 'grid',
  });
  const inventoryEnd = tableEnd(doc);

  const currencyY = Math.max(featureEnd, inventoryEnd) + 5;
  drawCurrency(doc, sheet, language, currencyY);
  return currencyY + 20;
}

function drawCurrency(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): void {
  const currency = sheet.currency;
  sectionTitle(doc, language === 'it' ? 'Monete' : 'Currency', y);
  const headers = ['PP', 'GP', 'EP', 'SP', 'CP'];
  const values = [
    currency?.pp ?? 0,
    currency?.gp ?? 0,
    currency?.ep ?? 0,
    currency?.sp ?? 0,
    currency?.cp ?? 0,
  ];
  autoTable(doc, {
    startY: y + 4,
    margin: { left: PAGE.margin },
    tableWidth: 76,
    head: [headers],
    body: [values],
    styles: {
      font: 'times',
      halign: 'center',
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: COLOR.line,
      lineWidth: 0.2,
    },
    headStyles: { fillColor: COLOR.header, textColor: COLOR.gold, fontStyle: 'bold' },
    bodyStyles: { fillColor: COLOR.paper, textColor: COLOR.ink, fontStyle: 'bold', fontSize: 9 },
    theme: 'grid',
  });
}

function drawSpellcasting(
  doc: jsPDF,
  sheet: CharacterSheet,
  language: CampaignPdfLanguage,
  y: number,
): number {
  const resolvedSpells = (sheet.spells ?? []).map(resolveSpell);
  if (resolvedSpells.length === 0) return y;

  sectionTitle(doc, language === 'it' ? 'Magia' : 'Spellcasting', y);
  const spellcasting = sheet.spellcasting;
  let tableY = y + 4;

  if (spellcasting !== undefined) {
    const spellModifier = modifier(sheet.abilityScores[spellcasting.ability]);
    const saveDC = spellcasting.spellSaveDC ?? 8 + sheet.proficiencyBonus + spellModifier;
    const attackBonus = spellcasting.spellAttackBonus ?? sheet.proficiencyBonus + spellModifier;
    const metaHeaders =
      language === 'it'
        ? ['Caratteristica', 'CD Incantesimi', 'Bonus Attacco', 'Slot disponibili']
        : ['Ability', 'Spell Save DC', 'Attack Bonus', 'Available Slots'];
    const slotLabel =
      (spellcasting.slots ?? [])
        .map(
          (slot) =>
            `${language === 'it' ? 'Liv.' : 'Lv.'} ${slot.level}: ${slot.total - (slot.used ?? 0)}/${slot.total}`,
        )
        .join(' | ') || '-';
    const metaValues = [
      abilityAbbreviation(spellcasting.ability, language),
      String(saveDC),
      signed(attackBonus),
      slotLabel,
    ];
    autoTable(doc, {
      startY: tableY,
      margin: { left: PAGE.margin, right: PAGE.margin },
      head: [metaHeaders],
      body: [metaValues],
      styles: {
        font: 'times',
        halign: 'center',
        fontSize: 7,
        cellPadding: 1.8,
        lineColor: COLOR.line,
        lineWidth: 0.2,
      },
      headStyles: { fillColor: COLOR.burgundy, textColor: COLOR.white, fontStyle: 'bold' },
      bodyStyles: { fillColor: COLOR.paper, textColor: COLOR.ink, fontStyle: 'bold', fontSize: 9 },
      theme: 'grid',
    });
    tableY = tableEnd(doc) + 4;
  }

  const spellRows = resolvedSpells.map((resolved) => {
    const spell = resolved.entry;
    if (spell === undefined) return ['-', resolved.originalName, '-', '-', '-', '-'];
    const school = SPELL_SCHOOLS[spell.school] ?? { en: spell.school, it: spell.school };
    return [
      spell.level === 0 ? (language === 'it' ? 'Trucc.' : 'Cantrip') : String(spell.level),
      language === 'it' ? spell.it : spell.en,
      language === 'it' ? school.it : school.en,
      language === 'it' ? spell.castingTimeIt : spell.castingTimeEn,
      language === 'it' ? spell.rangeIt : spell.rangeEn,
      language === 'it' ? spell.durationIt : spell.durationEn,
    ];
  });
  // The public template deliberately ships without a proprietary rules
  // compendium. Keep PDF spell rows readable without emitting dead links.
  const links = resolvedSpells.map(() => undefined);

  autoTable(doc, {
    startY: tableY,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [
      [
        language === 'it' ? 'Liv.' : 'Lvl',
        language === 'it' ? 'Incantesimo' : 'Spell',
        language === 'it' ? 'Scuola' : 'School',
        language === 'it' ? 'Lancio' : 'Cast',
        language === 'it' ? 'Gittata' : 'Range',
        language === 'it' ? 'Durata' : 'Duration',
      ],
    ],
    body: spellRows,
    styles: {
      font: 'times',
      fontSize: 6.5,
      cellPadding: 1.6,
      lineColor: COLOR.line,
      lineWidth: 0.15,
      textColor: COLOR.ink,
    },
    headStyles: { fillColor: COLOR.header, textColor: COLOR.gold, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold', textColor: COLOR.burgundy },
      2: { cellWidth: 28 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 52 },
    },
    alternateRowStyles: { fillColor: COLOR.panel },
    theme: 'grid',
    didDrawCell: (data: CellHookData): void => {
      if (data.section !== 'body' || data.column.index !== 1) return;
      const url = links[data.row.index];
      if (url === undefined) return;
      doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
    },
  });

  doc.setFont('times', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR.muted);
  doc.text(
    language === 'it'
      ? 'I nomi degli incantesimi sono cliccabili e aprono la descrizione completa nel Compendio.'
      : 'Spell names are clickable and open their full descriptions in the Compendium.',
    PAGE.margin,
    tableEnd(doc) + 4,
  );
  return tableEnd(doc) + 8;
}

function drawNotes(doc: jsPDF, language: CampaignPdfLanguage, y: number): void {
  if (y > 260) return;
  sectionTitle(doc, language === 'it' ? 'Note' : 'Notes', y);
  doc.setDrawColor(...COLOR.line);
  doc.setLineWidth(0.2);
  const bottom = PAGE.height - 14;
  for (let lineY = y + 8; lineY <= bottom; lineY += 7) {
    doc.line(PAGE.margin, lineY, PAGE.width - PAGE.margin, lineY);
  }
}

function drawPageNumbers(doc: jsPDF, language: CampaignPdfLanguage): void {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('times', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.muted);
    doc.text(
      `${language === 'it' ? 'Pagina' : 'Page'} ${page} / ${pages}`,
      PAGE.width - PAGE.margin,
      PAGE.height - 6,
      { align: 'right' },
    );
  }
}

function drawPageBackground(doc: jsPDF): void {
  doc.setFillColor(...COLOR.paper);
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F');

  doc.setDrawColor(...COLOR.gold);
  doc.setLineWidth(0.55);
  doc.rect(6, 6, PAGE.width - 12, PAGE.height - 12);
  doc.setLineWidth(0.15);
  doc.rect(8, 8, PAGE.width - 16, PAGE.height - 16);

  const corner = 9;
  const inset = 10;
  for (const [x, y, xDirection, yDirection] of [
    [inset, inset, 1, 1],
    [PAGE.width - inset, inset, -1, 1],
    [inset, PAGE.height - inset, 1, -1],
    [PAGE.width - inset, PAGE.height - inset, -1, -1],
  ] as const) {
    doc.setLineWidth(0.35);
    doc.line(x, y, x + corner * xDirection, y);
    doc.line(x, y, x, y + corner * yDirection);
    doc.line(x, y, x + 4 * xDirection, y + 4 * yDirection);
  }
}

function drawProfileText(
  doc: jsPDF,
  title: string,
  content: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
): number {
  sectionTitle(doc, title, y, x, width);
  doc.setFont('times', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...COLOR.ink);
  const lineHeight = fontSize * 0.45;
  const lines = doc.splitTextToSize(content, width - 2) as string[];
  doc.text(lines, x + 1, y + 7, { lineHeightFactor: 1.16 });
  return y + 7 + lines.length * lineHeight;
}

function drawFramedImage(
  doc: jsPDF,
  imageData: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc.setFillColor(...COLOR.header);
  doc.roundedRect(x - 1.5, y - 1.5, width + 3, height + 3, 1.2, 1.2, 'F');
  doc.setDrawColor(...COLOR.gold);
  doc.setLineWidth(0.7);
  doc.roundedRect(x - 1, y - 1, width + 2, height + 2, 1, 1, 'S');
  doc.addImage(imageData, imageFormat(imageData), x, y, width, height);
  doc.setLineWidth(0.2);
  doc.rect(x + 1.2, y + 1.2, width - 2.4, height - 2.4);
}

function drawImagePlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc.setFillColor(...COLOR.panel);
  doc.setDrawColor(...COLOR.gold);
  doc.rect(x, y, width, height, 'FD');
  doc.setFont('times', 'bold');
  doc.setTextColor(...COLOR.gold);
  doc.setFontSize(Math.min(width, height) * 0.22);
  doc.text('RPG', x + width / 2, y + height / 2 + 2, { align: 'center' });
}

function drawDividerOrnament(doc: jsPDF, y: number): void {
  if (y > PAGE.height - 16) return;
  const center = PAGE.width / 2;
  doc.setDrawColor(...COLOR.gold);
  doc.setLineWidth(0.25);
  doc.line(PAGE.margin, y, center - 5, y);
  doc.line(center + 5, y, PAGE.width - PAGE.margin, y);
  doc.setFillColor(...COLOR.burgundy);
  doc.triangle(center, y - 2.5, center + 2.5, y, center, y + 2.5, 'F');
  doc.triangle(center, y - 2.5, center - 2.5, y, center, y + 2.5, 'F');
}

async function loadArtwork(options: CampaignCharacterPdfOptions): Promise<PdfArtwork> {
  const [token, portrait] = await Promise.all([
    loadImageDataUrl(options.profileImageUrl),
    loadImageDataUrl(options.portraitImageUrl),
  ]);
  return { token, portrait };
}

async function loadImageDataUrl(url: string | undefined): Promise<string | undefined> {
  if (url === undefined || url.length === 0) return undefined;
  try {
    const absoluteUrl = new URL(url, document.baseURI).href;
    const response = await fetch(absoluteUrl);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result)), { once: true });
      reader.addEventListener('error', () => reject(reader.error), { once: true });
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

function localized(text: BilingualText, language: CampaignPdfLanguage): string {
  return language === 'it' ? text.it : text.en;
}

function sectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  x: number = PAGE.margin,
  width: number = PAGE.contentWidth,
): void {
  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.burgundy);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...COLOR.gold);
  doc.setLineWidth(0.45);
  doc.line(x, y + 1.5, x + width, y + 1.5);
}

function tableEnd(doc: jsPDF): number {
  const withTable = doc as jsPDF & { readonly lastAutoTable: { readonly finalY: number } };
  return withTable.lastAutoTable.finalY;
}

function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasProficiency(
  values: ReadonlyArray<string>,
  englishName: string,
  italianName: string,
): boolean {
  const english = normalize(englishName);
  const italian = normalize(italianName);
  return values.some((value) => {
    const candidate = normalize(value);
    return candidate === english || candidate === italian;
  });
}

function abilityAbbreviation(ability: AbilityKey, language: CampaignPdfLanguage): string {
  const definition = ABILITIES.find((entry) => entry.key === ability);
  if (definition === undefined) return ability.slice(0, 3).toUpperCase();
  return language === 'it' ? definition.abbreviationIt : definition.abbreviationEn;
}

function resolveSpell(originalName: string): ResolvedSpell {
  const normalizedName = normalize(originalName);
  for (const category of SPELL_CATEGORIES) {
    const entry = category.entries.find((candidate) => {
      if (!isSpellEntry(candidate)) return false;
      const englishName = normalize(candidate.en);
      const italianName = normalize(candidate.it);
      return (
        englishName === normalizedName ||
        italianName === normalizedName ||
        englishName.endsWith(normalizedName)
      );
    });
    if (entry !== undefined && isSpellEntry(entry)) {
      return { originalName, categoryId: category.id, entry };
    }
  }
  return { originalName };
}
