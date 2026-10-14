import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTITY_TYPES = new Set(['characters', 'npcs', 'sessions', 'maps']);
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function validateId(value, label = 'ID') {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new Error(`${label} must contain only lowercase letters, numbers and hyphens.`);
  }
  return value;
}

function normalizeLanguages(values) {
  const languages = [
    ...new Set((values ?? ['en']).map((value) => String(value).trim()).filter(Boolean)),
  ];
  if (languages.length === 0 || languages.some((code) => !LANGUAGE_PATTERN.test(code))) {
    throw new Error('Use language codes such as en, es, de or fr-CA.');
  }
  return languages;
}

function assertInside(base, target) {
  const rel = relative(resolve(base), resolve(target));
  if (rel.startsWith('..') || rel === '..') throw new Error('Unsafe path rejected.');
  return target;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export function campaignsRoot(projectRoot) {
  return join(projectRoot, 'src', 'campaigns');
}

function campaignRoot(projectRoot, campaignId) {
  validateId(campaignId, 'Campaign ID');
  return assertInside(campaignsRoot(projectRoot), join(campaignsRoot(projectRoot), campaignId));
}

function dataRoot(projectRoot, campaignId) {
  return join(campaignRoot(projectRoot, campaignId), 'data');
}

async function loadManifested(folder) {
  const manifest = await readJson(join(folder, 'manifest.json'), []);
  const entries = [];
  for (const fileName of manifest) {
    if (typeof fileName !== 'string' || !/^[a-z0-9-]+\.json$/.test(fileName)) continue;
    entries.push(await readJson(join(folder, fileName)));
  }
  return entries;
}

export async function getState(projectRoot) {
  const manifestPath = join(campaignsRoot(projectRoot), 'campaigns.json');
  const manifest = await readJson(manifestPath, []);
  const campaigns = [];
  for (const entry of manifest) {
    const base = dataRoot(projectRoot, entry.id);
    const [campaign, characters, npcs, sessions, maps] = await Promise.all([
      readJson(join(base, 'campaign.json'), {}),
      readJson(join(base, 'characters', 'manifest.json'), []),
      readJson(join(base, 'npcs', 'manifest.json'), []),
      readJson(join(base, 'sessions', 'manifest.json'), []),
      readJson(join(base, 'maps.json'), []),
    ]);
    campaigns.push({
      ...entry,
      details: campaign,
      counts: {
        characters: characters.length,
        npcs: npcs.length,
        sessions: sessions.length,
        maps: maps.length,
      },
    });
  }
  return { campaigns };
}

export async function getCampaign(projectRoot, campaignId) {
  const root = dataRoot(projectRoot, campaignId);
  const manifest = await readJson(join(campaignsRoot(projectRoot), 'campaigns.json'), []);
  const manifestEntry = manifest.find((entry) => entry.id === campaignId);
  if (!manifestEntry) throw new Error(`Campaign "${campaignId}" does not exist.`);

  const [campaign, characters, npcs, sessions, maps, partyRelationships, npcRelationships] =
    await Promise.all([
      readJson(join(root, 'campaign.json'), {}),
      loadManifested(join(root, 'characters')),
      loadManifested(join(root, 'npcs')),
      loadManifested(join(root, 'sessions')),
      readJson(join(root, 'maps.json'), []),
      readJson(join(root, 'party-relationships.json'), []),
      readJson(join(root, 'npc-relationships.json'), []),
    ]);

  return {
    manifestEntry,
    campaign,
    characters,
    npcs,
    sessions,
    maps,
    partyRelationships,
    npcRelationships,
  };
}

export async function createCampaign(projectRoot, input) {
  const id = validateId(input.id, 'Campaign ID');
  const root = campaignRoot(projectRoot, id);
  if (await exists(root)) throw new Error(`Campaign "${id}" already exists.`);
  const languages = normalizeLanguages(input.languages);
  const defaultLanguage = languages.includes(input.defaultLanguage)
    ? input.defaultLanguage
    : languages[0];
  if (!Object.values(input.name ?? {}).some((value) => String(value).trim()))
    throw new Error('A campaign name is required.');

  const manifestPath = join(campaignsRoot(projectRoot), 'campaigns.json');
  const manifest = await readJson(manifestPath, []);
  if (manifest.some((entry) => entry.id === id))
    throw new Error(`Campaign "${id}" already exists.`);

  const base = join(root, 'data');
  await Promise.all([
    mkdir(join(base, 'characters'), { recursive: true }),
    mkdir(join(base, 'npcs'), { recursive: true }),
    mkdir(join(base, 'sessions'), { recursive: true }),
    mkdir(join(root, 'images', 'group'), { recursive: true }),
    mkdir(join(root, 'images', 'characters'), { recursive: true }),
    mkdir(join(root, 'images', 'npcs'), { recursive: true }),
    mkdir(join(root, 'images', 'maps'), { recursive: true }),
    mkdir(join(root, 'images', 'sessions'), { recursive: true }),
  ]);

  const entry = {
    id,
    languages,
    defaultLanguage,
    name: input.name,
    description: input.description ?? { [defaultLanguage]: '' },
    thumbnail: '',
    status: input.status ?? { [defaultLanguage]: 'In progress' },
  };
  const campaign = {
    name: input.name,
    description: input.description ?? { [defaultLanguage]: '' },
    languages,
    defaultLanguage,
    edition: input.edition?.trim() || 'Your ruleset',
    startDate: input.startDate || new Date().toISOString().slice(0, 10),
    dungeonMaster: input.dungeonMaster?.trim() || 'Game Master',
    partyName: input.partyName?.trim() || 'The Party',
    heroImages: [],
    storySoFar: Object.fromEntries(languages.map((language) => [language, ''])),
  };

  await Promise.all([
    writeJson(join(base, 'campaign.json'), campaign),
    writeJson(join(base, 'characters', 'manifest.json'), []),
    writeJson(join(base, 'npcs', 'manifest.json'), []),
    writeJson(join(base, 'sessions', 'manifest.json'), []),
    writeJson(join(base, 'maps.json'), []),
    writeJson(join(base, 'party-relationships.json'), []),
    writeJson(join(base, 'npc-relationships.json'), []),
  ]);
  await writeJson(manifestPath, [...manifest, entry]);
  return getCampaign(projectRoot, id);
}

export async function updateCampaign(projectRoot, campaignId, input) {
  const current = await getCampaign(projectRoot, campaignId);
  const manifestPath = join(campaignsRoot(projectRoot), 'campaigns.json');
  const manifest = await readJson(manifestPath, []);
  const languages = normalizeLanguages(
    input.languages ?? current.manifestEntry.languages ?? current.campaign.languages ?? ['en'],
  );
  const requestedDefault =
    input.defaultLanguage ??
    current.manifestEntry.defaultLanguage ??
    current.campaign.defaultLanguage ??
    languages[0];
  const defaultLanguage = languages.includes(requestedDefault) ? requestedDefault : languages[0];
  const nextEntry = {
    ...current.manifestEntry,
    languages,
    defaultLanguage,
    name: input.name ?? current.manifestEntry.name,
    description: input.description ?? current.manifestEntry.description,
    status: input.status ?? current.manifestEntry.status,
    thumbnail: input.thumbnail ?? current.manifestEntry.thumbnail,
  };
  const nextCampaign = {
    ...current.campaign,
    ...(input.campaign ?? {}),
    languages,
    defaultLanguage,
    name: nextEntry.name,
    description: nextEntry.description,
  };
  await Promise.all([
    writeJson(
      manifestPath,
      manifest.map((entry) => (entry.id === campaignId ? nextEntry : entry)),
    ),
    writeJson(join(dataRoot(projectRoot, campaignId), 'campaign.json'), nextCampaign),
  ]);
  return getCampaign(projectRoot, campaignId);
}

async function moveToTrash(projectRoot, source, label) {
  if (!(await exists(source))) return;
  const trash = join(projectRoot, '.campaign-manager', 'trash', `${nowStamp()}-${label}`);
  await mkdir(dirname(trash), { recursive: true });
  await rename(source, trash);
}

export async function deleteCampaign(projectRoot, campaignId, confirmation) {
  validateId(campaignId, 'Campaign ID');
  if (confirmation !== campaignId) throw new Error('Campaign confirmation does not match.');
  const manifestPath = join(campaignsRoot(projectRoot), 'campaigns.json');
  const manifest = await readJson(manifestPath, []);
  if (!manifest.some((entry) => entry.id === campaignId)) throw new Error('Campaign not found.');
  await moveToTrash(projectRoot, campaignRoot(projectRoot, campaignId), campaignId);
  await writeJson(
    manifestPath,
    manifest.filter((entry) => entry.id !== campaignId),
  );
}

function validateEntity(type, entity) {
  if (!ENTITY_TYPES.has(type)) throw new Error('Unsupported entity type.');
  validateId(entity?.id, 'Entity ID');
  const label = type === 'sessions' ? entity?.title : entity?.name;
  if (typeof label !== 'string' && typeof label !== 'object') {
    throw new Error(
      type === 'sessions' ? 'Session title is required.' : 'Entity name is required.',
    );
  }
}

export async function saveEntity(projectRoot, campaignId, type, entity, previousId) {
  validateEntity(type, entity);
  const base = dataRoot(projectRoot, campaignId);
  await getCampaign(projectRoot, campaignId);

  if (type === 'maps') {
    const path = join(base, 'maps.json');
    const maps = await readJson(path, []);
    const matchId = previousId ?? entity.id;
    const existsAlready = maps.some((item) => item.id === matchId);
    const next = existsAlready
      ? maps.map((item) => (item.id === matchId ? entity : item))
      : [...maps, entity];
    await writeJson(path, next);
    return entity;
  }

  const folder = join(base, type);
  const manifestPath = join(folder, 'manifest.json');
  const manifest = await readJson(manifestPath, []);
  const oldFile = previousId ? `${validateId(previousId)}.json` : undefined;
  const fileName = `${entity.id}.json`;
  if (!oldFile && manifest.includes(fileName))
    throw new Error(`Entity "${entity.id}" already exists.`);
  if (oldFile && oldFile !== fileName && manifest.includes(fileName)) {
    throw new Error(`Entity "${entity.id}" already exists.`);
  }
  if (oldFile && oldFile !== fileName) {
    await moveToTrash(projectRoot, join(folder, oldFile), `${campaignId}-${type}-${previousId}`);
  }
  await writeJson(join(folder, fileName), entity);
  const nextManifest = oldFile
    ? manifest.includes(oldFile)
      ? manifest.map((item) => (item === oldFile ? fileName : item))
      : [...manifest, fileName]
    : [...manifest, fileName];
  await writeJson(manifestPath, [...new Set(nextManifest)]);
  return entity;
}

export async function deleteEntity(projectRoot, campaignId, type, entityId) {
  validateId(entityId, 'Entity ID');
  if (!ENTITY_TYPES.has(type)) throw new Error('Unsupported entity type.');
  const base = dataRoot(projectRoot, campaignId);
  if (type === 'maps') {
    const path = join(base, 'maps.json');
    const maps = await readJson(path, []);
    await writeJson(
      path,
      maps.filter((item) => item.id !== entityId),
    );
    return;
  }
  const folder = join(base, type);
  const fileName = `${entityId}.json`;
  const manifestPath = join(folder, 'manifest.json');
  const manifest = await readJson(manifestPath, []);
  await moveToTrash(projectRoot, join(folder, fileName), `${campaignId}-${type}-${entityId}`);
  await writeJson(
    manifestPath,
    manifest.filter((item) => item !== fileName),
  );
}

export async function saveImage(projectRoot, campaignId, input) {
  const category = ['group', 'characters', 'npcs', 'maps', 'sessions'].includes(input.category)
    ? input.category
    : 'group';
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    input.dataUrl ?? '',
  );
  if (!match) throw new Error('Only PNG, JPEG and WebP images are supported.');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Image exceeds the 8 MB limit.');
  const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
  const stem =
    String(input.fileName ?? 'image')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'image';
  const fileName = `${stem}-${Date.now()}.${extension}`;
  const imageDir = join(campaignRoot(projectRoot, campaignId), 'images', category);
  const path = assertInside(imageDir, join(imageDir, fileName));
  await mkdir(imageDir, { recursive: true });
  await writeFile(path, buffer);
  return { path: `images/${category}/${fileName}`, bytes: buffer.length };
}

export async function exportCampaign(projectRoot, campaignId) {
  const data = await getCampaign(projectRoot, campaignId);
  return {
    format: 'campaign-companion-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
    note: 'Images are not embedded. Copy the campaign images folder separately.',
  };
}

export async function importCampaign(projectRoot, bundle) {
  if (bundle?.format !== 'campaign-companion-bundle' || bundle?.version !== 1) {
    throw new Error('This is not a supported Campaign Companion bundle.');
  }
  const id = validateId(bundle.manifestEntry?.id, 'Campaign ID');
  await createCampaign(projectRoot, {
    id,
    languages: bundle.manifestEntry.languages,
    defaultLanguage: bundle.manifestEntry.defaultLanguage,
    name: bundle.manifestEntry.name,
    description: bundle.manifestEntry.description,
    status: bundle.manifestEntry.status,
    edition: bundle.campaign?.edition,
    startDate: bundle.campaign?.startDate,
    dungeonMaster: bundle.campaign?.dungeonMaster,
    partyName: bundle.campaign?.partyName,
  });
  await updateCampaign(projectRoot, id, {
    ...bundle.manifestEntry,
    campaign: bundle.campaign,
  });
  for (const character of bundle.characters ?? [])
    await saveEntity(projectRoot, id, 'characters', character);
  for (const npc of bundle.npcs ?? []) await saveEntity(projectRoot, id, 'npcs', npc);
  for (const session of bundle.sessions ?? [])
    await saveEntity(projectRoot, id, 'sessions', session);
  for (const map of bundle.maps ?? []) await saveEntity(projectRoot, id, 'maps', map);
  const base = dataRoot(projectRoot, id);
  await Promise.all([
    writeJson(join(base, 'party-relationships.json'), bundle.partyRelationships ?? []),
    writeJson(join(base, 'npc-relationships.json'), bundle.npcRelationships ?? []),
  ]);
  return getCampaign(projectRoot, id);
}
