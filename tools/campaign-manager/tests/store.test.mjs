import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import {
  createCampaign,
  deleteCampaign,
  deleteEntity,
  exportCampaign,
  getCampaign,
  getState,
  importCampaign,
  saveEntity,
  updateCampaign,
} from '../store.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'campaign-companion-manager-'));
  const campaigns = join(root, 'src', 'campaigns');
  await mkdir(campaigns, { recursive: true });
  await writeFile(join(campaigns, 'campaigns.json'), '[]\n', 'utf8');
  t.after(async () => {
    const rel = relative(tmpdir(), root);
    assert.match(rel, /^campaign-companion-manager-/);
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

const campaignInput = {
  id: 'sentiero-delle-lanterne',
  name: { it: 'Il Sentiero delle Lanterne', en: 'The Lantern Road' },
  description: { it: 'Una prova.', en: 'A test.' },
  dungeonMaster: 'Mara',
  partyName: 'Le Lucciole',
  edition: 'Open fantasy rules',
  startDate: '2026-10-14',
};

test('creates a complete campaign and reports its counts', async (t) => {
  const root = await fixture(t);
  const campaign = await createCampaign(root, campaignInput);
  assert.equal(campaign.manifestEntry.id, campaignInput.id);
  assert.deepEqual((await getState(root)).campaigns[0].counts, {
    characters: 0,
    npcs: 0,
    sessions: 0,
    maps: 0,
  });
});

test('manages characters, sessions and maps without editing manifests', async (t) => {
  const root = await fixture(t);
  await createCampaign(root, campaignInput);
  await saveEntity(root, campaignInput.id, 'characters', {
    id: 'aria',
    name: 'Aria',
    heightCm: 168,
    profileImageUrl: 'images/characters/aria-profile.webp',
    portraitImageUrl: 'images/characters/aria-portrait.webp',
    publicProfile: { hobbies: { en: 'Restoring lanterns.' } },
  });
  await saveEntity(root, campaignInput.id, 'sessions', {
    id: 'sessione-uno',
    title: { it: 'Il ponte', en: 'The bridge' },
  });
  await saveEntity(root, campaignInput.id, 'maps', {
    id: 'valle',
    name: { it: 'La Valle', en: 'The Valley' },
  });

  let campaign = await getCampaign(root, campaignInput.id);
  assert.equal(campaign.characters[0].name, 'Aria');
  assert.equal(campaign.characters[0].heightCm, 168);
  assert.equal(campaign.characters[0].profileImageUrl, 'images/characters/aria-profile.webp');
  assert.equal(campaign.characters[0].portraitImageUrl, 'images/characters/aria-portrait.webp');
  assert.equal(campaign.characters[0].publicProfile.hobbies.en, 'Restoring lanterns.');
  assert.equal(campaign.sessions[0].title.it, 'Il ponte');
  assert.equal(campaign.maps[0].name.en, 'The Valley');

  await deleteEntity(root, campaignInput.id, 'characters', 'aria');
  campaign = await getCampaign(root, campaignInput.id);
  assert.equal(campaign.characters.length, 0);
  const trash = await readFile(
    join(root, 'src', 'campaigns', campaignInput.id, 'data', 'characters', 'manifest.json'),
    'utf8',
  );
  assert.deepEqual(JSON.parse(trash), []);
});

test('exports, imports and recoverably deletes a campaign', async (t) => {
  const source = await fixture(t);
  const target = await fixture(t);
  await createCampaign(source, campaignInput);
  await saveEntity(source, campaignInput.id, 'npcs', { id: 'olmo', name: 'Olmo' });
  const bundle = await exportCampaign(source, campaignInput.id);
  const imported = await importCampaign(target, bundle);
  assert.equal(imported.npcs[0].name, 'Olmo');

  await assert.rejects(deleteCampaign(target, campaignInput.id, 'sbagliato'));
  await deleteCampaign(target, campaignInput.id, campaignInput.id);
  assert.equal((await getState(target)).campaigns.length, 0);
});

test('supports arbitrary campaign languages and regional codes', async (t) => {
  const root = await fixture(t);
  const campaign = await createCampaign(root, {
    ...campaignInput,
    id: 'cronicas-del-mar',
    languages: ['es', 'ja', 'pt-BR'],
    defaultLanguage: 'es',
    name: { en: 'Chronicles of the Sea', es: 'Crónicas del Mar', ja: '海の年代記' },
  });

  assert.deepEqual(campaign.manifestEntry.languages, ['es', 'ja', 'pt-BR']);
  assert.equal(campaign.manifestEntry.defaultLanguage, 'es');
  assert.equal(campaign.manifestEntry.name.ja, '海の年代記');

  const updated = await updateCampaign(root, campaign.manifestEntry.id, {
    languages: ['de', 'fr-CA'],
    defaultLanguage: 'fr-CA',
  });
  assert.deepEqual(updated.campaign.languages, ['de', 'fr-CA']);
  assert.equal(updated.campaign.defaultLanguage, 'fr-CA');

  await assert.rejects(
    updateCampaign(root, campaign.manifestEntry.id, { languages: ['not a language'] }),
    /language codes/,
  );
});
