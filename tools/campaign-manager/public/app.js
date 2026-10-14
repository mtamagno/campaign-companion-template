const token = document.querySelector('meta[name="manager-token"]').content;
const content = document.querySelector('#content');
const campaignList = document.querySelector('#campaign-list');
const dialog = document.querySelector('#editor-dialog');
const editorForm = document.querySelector('#editor-form');
const fields = document.querySelector('#dialog-fields');
const mobileMenu = document.querySelector('#mobile-menu');

const state = {
  campaigns: [],
  campaign: null,
  selectedId: null,
  tab: 'overview',
  projectMode: false,
  project: { dependenciesReady: false, jobs: {} },
  editor: null,
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function localized(value, language = 'en') {
  if (typeof value === 'string') return value;
  return value?.[language] || value?.en || Object.values(value ?? {}).find(Boolean) || '';
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.method && options.method !== 'GET' ? { 'X-Manager-Token': token } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
  return result;
}

function toast(message, error = false) {
  const element = document.createElement('div');
  element.className = `toast${error ? ' error' : ''}`;
  element.textContent = message;
  document.querySelector('#toast-region').append(element);
  setTimeout(() => element.remove(), 4200);
}

function setMenuOpen(open) {
  document.body.classList.toggle('menu-open', open);
  mobileMenu.setAttribute('aria-expanded', String(open));
}

async function loadState({ selectFirst = false } = {}) {
  const result = await api('/api/state');
  state.campaigns = result.campaigns;
  state.project = { dependenciesReady: result.dependenciesReady, jobs: result.jobs };
  if (selectFirst && !state.selectedId && result.campaigns.length) {
    await selectCampaign(result.campaigns[0].id);
    return;
  }
  renderSidebar();
  render();
}

async function selectCampaign(id) {
  state.selectedId = id;
  state.projectMode = false;
  state.campaign = await api(`/api/campaigns/${encodeURIComponent(id)}`);
  state.tab = 'overview';
  setMenuOpen(false);
  renderSidebar();
  render();
}

function renderSidebar() {
  const query = document.querySelector('#campaign-search').value.toLowerCase();
  const campaigns = state.campaigns.filter((item) =>
    `${localized(item.name)} ${localized(item.description)}`.toLowerCase().includes(query),
  );
  campaignList.innerHTML = campaigns.length
    ? campaigns
        .map(
          (item) => `
          <button class="campaign-link ${item.id === state.selectedId && !state.projectMode ? 'active' : ''}" data-campaign="${escapeHtml(item.id)}">
            <span class="campaign-link__sigil">${escapeHtml(localized(item.name).charAt(0).toUpperCase() || '✦')}</span>
            <span><strong>${escapeHtml(localized(item.name, item.defaultLanguage ?? 'en'))}</strong><small>${escapeHtml(localized(item.status, item.defaultLanguage ?? 'en') || 'Campaign')}</small></span>
            <span class="campaign-link__count">${item.counts.characters}</span>
          </button>`,
        )
        .join('')
    : '<div class="empty">No campaigns found.</div>';
}

function render() {
  if (state.projectMode) {
    renderProject();
    return;
  }
  if (!state.campaign) {
    document.querySelector('#page-title').textContent = 'Your adventure archive';
    content.innerHTML = `
      <div class="welcome"><div class="welcome__inner">
        <div class="welcome__icon">✦</div>
        <span class="eyebrow">No JSON. No folders to copy.</span>
        <h2>Your next campaign starts here</h2>
        <p>Create a world, gather the party and chronicle each session through friendly forms. Campaign Companion prepares the files for you.</p>
        <div class="welcome__actions"><button class="primary-button" data-action="new-campaign">Create your first campaign</button><button class="secondary-button" data-action="import">Import a backup</button></div>
      </div></div>`;
    return;
  }
  renderCampaign();
}

function campaignAsset(path) {
  if (!path || !state.selectedId) return '';
  const prefix = `campaigns/${state.selectedId}/`;
  const relativePath = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return `/campaign-assets/${encodeURIComponent(state.selectedId)}/${relativePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

function renderCampaign() {
  const data = state.campaign;
  const displayLanguage =
    data.manifestEntry.defaultLanguage ?? data.manifestEntry.languages?.[0] ?? 'en';
  const title = localized(data.manifestEntry.name, displayLanguage);
  document.querySelector('#page-title').textContent = title;
  const heroPath = data.manifestEntry.thumbnail || data.campaign.heroImages?.[0];
  const tabs = [
    ['overview', 'Overview'],
    ['characters', `Characters · ${data.characters.length}`],
    ['npcs', `NPCs · ${data.npcs.length}`],
    ['sessions', `Sessions · ${data.sessions.length}`],
    ['maps', `Locations · ${data.maps.length}`],
  ];
  content.innerHTML = `
    <section class="campaign-hero">
      ${heroPath ? `<img class="campaign-hero__art" src="${escapeHtml(campaignAsset(heroPath))}" alt="" />` : ''}
      <div class="campaign-hero__scrim"></div>
      <div class="campaign-hero__actions"><button class="secondary-button" data-action="edit-campaign">Edit</button><button class="secondary-button" data-action="export">Backup</button><button class="secondary-button danger-button" data-action="delete-campaign">Delete</button></div>
      <div class="campaign-hero__copy"><span class="status-pill">${escapeHtml(localized(data.manifestEntry.status, displayLanguage) || 'Campaign')}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(localized(data.manifestEntry.description, displayLanguage))}</p></div>
    </section>
    <nav class="tabs" aria-label="Campaign sections">${tabs.map(([id, label]) => `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${escapeHtml(label)}</button>`).join('')}</nav>
    <div id="tab-content">${renderTab()}</div>`;
}

function renderTab() {
  switch (state.tab) {
    case 'characters':
      return renderEntities('characters', 'Characters', 'Add character');
    case 'npcs':
      return renderEntities('npcs', 'Non-player characters', 'Add NPC');
    case 'sessions':
      return renderEntities('sessions', 'Session chronicles', 'Add session');
    case 'maps':
      return renderEntities('maps', 'Locations and maps', 'Add location');
    default:
      return renderOverview();
  }
}

function renderOverview() {
  const { campaign, characters, npcs, sessions, maps } = state.campaign;
  return `
    <div class="metrics">
      ${[
        ['Characters', characters.length],
        ['NPCs', npcs.length],
        ['Sessions', sessions.length],
        ['Locations', maps.length],
      ]
        .map(
          ([label, value]) =>
            `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`,
        )
        .join('')}
    </div>
    <div class="overview-grid">
      <section class="project-panel"><span class="eyebrow">The story so far</span><h2>${escapeHtml(localized(campaign.name))}</h2><p>${escapeHtml(localized(campaign.storySoFar) || 'Your running campaign recap will appear here.')}</p></section>
      <section class="project-panel"><h3>Table details</h3><dl class="detail-list"><div><dt>Game Master</dt><dd>${escapeHtml(campaign.dungeonMaster)}</dd></div><div><dt>Party</dt><dd>${escapeHtml(campaign.partyName)}</dd></div><div><dt>System</dt><dd>${escapeHtml(campaign.edition)}</dd></div><div><dt>Started</dt><dd>${escapeHtml(campaign.startDate)}</dd></div></dl></section>
    </div>`;
}

function entityName(type, item) {
  if (type === 'sessions') return localized(item.title);
  return localized(item.name);
}

function entityDescription(type, item) {
  if (type === 'characters') return localized(item.publicProfile?.backstory);
  if (type === 'npcs') return localized(item.profile?.description);
  if (type === 'sessions') return localized(item.summary);
  return localized(item.description);
}

function entityTags(type, item) {
  if (type === 'characters') return [item.sheet?.classType, `Level ${item.sheet?.level ?? 1}`];
  if (type === 'npcs') return [localized(item.profile?.role), item.allegiance];
  if (type === 'sessions') return [`Session ${item.sessionNumber}`, item.date];
  return [localized(item.region), item.explorationStatus];
}

function renderEntities(type, title, addLabel) {
  const items = state.campaign[type];
  return `
    <div class="section-heading"><div><span class="eyebrow">Archive</span><h2>${title}</h2><p>Add, revise or remove every entry without opening a single data file.</p></div><button class="primary-button" data-action="add-entity" data-type="${type}">${addLabel}</button></div>
    ${
      items.length
        ? `<div class="card-grid">${items
            .map(
              (item) => `
      <article class="card"><div class="card__top"><span class="card__avatar">${escapeHtml(entityName(type, item).charAt(0).toUpperCase() || '✦')}</span><div class="card__menu"><button data-action="edit-entity" data-type="${type}" data-id="${escapeHtml(item.id)}">Edit</button><button data-action="delete-entity" data-type="${type}" data-id="${escapeHtml(item.id)}">Remove</button></div></div><h3>${escapeHtml(entityName(type, item))}</h3><p>${escapeHtml(entityDescription(type, item)).slice(0, 180)}</p><div class="card__meta">${entityTags(
        type,
        item,
      )
        .filter(Boolean)
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join('')}</div></article>`,
            )
            .join('')}</div>`
        : `<div class="empty">Nothing here yet. Choose “${addLabel}” to begin.</div>`
    }`;
}

function field(name, label, value = '', options = {}) {
  const wide = options.wide ? ' field--wide' : '';
  const required = options.required ? ' required' : '';
  const hint = options.hint ? `<small>${escapeHtml(options.hint)}</small>` : '';
  if (options.type === 'textarea') {
    return `<label class="field${wide}"><span>${escapeHtml(label)}</span><textarea name="${name}"${required}>${escapeHtml(value)}</textarea>${hint}</label>`;
  }
  if (options.type === 'select') {
    return `<label class="field${wide}"><span>${escapeHtml(label)}</span><select name="${name}">${options.values.map(([id, text]) => `<option value="${escapeHtml(id)}" ${id === value ? 'selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select>${hint}</label>`;
  }
  if (options.type === 'file') {
    return `<label class="field${wide}"><span>${escapeHtml(label)}</span><input name="${name}" type="file" accept="image/png,image/jpeg,image/webp" />${hint}</label>`;
  }
  return `<label class="field${wide}"><span>${escapeHtml(label)}</span><input name="${name}" type="${options.type || 'text'}" value="${escapeHtml(value)}"${required}${options.min !== undefined ? ` min="${options.min}"` : ''} />${hint}</label>`;
}

function section(label) {
  return `<div class="form-section">${escapeHtml(label)}</div>`;
}

function normalizeLanguageCodes(value) {
  return [
    ...new Set(
      String(value ?? '')
        .split(/[\s,]+/)
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];
}

function campaignLanguages() {
  const entry = state.campaign?.manifestEntry;
  const inferred = Object.keys(entry?.name ?? {});
  return entry?.languages?.length ? entry.languages : inferred.length ? inferred : ['en'];
}

function languageName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function localizedFields(prefix, label, value, languages, options = {}) {
  return languages.map((language) =>
    field(
      `loc__${prefix}__${language}`,
      `${label} · ${languageName(language)} (${language})`,
      value?.[language] ?? '',
      options,
    ),
  );
}

function openDialog({ title, eyebrow, html, editor }) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-eyebrow').textContent = eyebrow;
  fields.innerHTML = `<div class="form-grid">${html}</div>`;
  state.editor = editor;
  dialog.showModal();
  fields.querySelector('input, textarea, select')?.focus();
}

function campaignForm(campaign) {
  const entry = campaign?.manifestEntry ?? {};
  const details = campaign?.campaign ?? {};
  const editing = Boolean(campaign);
  const languages = editing ? campaignLanguages() : ['en'];
  if (!editing) {
    return [
      field('id', 'Campaign ID', '', {
        required: true,
        hint: 'Lowercase letters, numbers and hyphens only.',
      }),
      field('startDate', 'Start date', new Date().toISOString().slice(0, 10), { type: 'date' }),
      section('Languages'),
      field('primaryLanguage', 'Primary language code', 'en', {
        required: true,
        hint: 'Any language code, such as en, es, de, pt-BR or fr-CA.',
      }),
      field('additionalLanguages', 'Additional language codes', '', {
        hint: 'Optional · comma-separated. You can add translations after creation.',
      }),
      section('Campaign introduction'),
      field('name', 'Campaign name', '', { required: true }),
      field('description', 'Short description', '', { type: 'textarea' }),
      field('status', 'Status', 'In progress'),
      section('Your table'),
      field('dungeonMaster', 'Game Master', ''),
      field('partyName', 'Party name', ''),
      field('edition', 'System / edition', ''),
      field('cover', 'Cover image', '', { type: 'file', hint: 'PNG, JPEG or WebP · up to 8 MB' }),
    ].join('');
  }
  return [
    field('id', 'Campaign ID', entry.id ?? '', {
      required: true,
      hint: 'Lowercase letters, numbers and hyphens only.',
    }),
    field('startDate', 'Start date', details.startDate ?? new Date().toISOString().slice(0, 10), {
      type: 'date',
    }),
    section('Languages'),
    field('languages', 'Language codes', languages.join(', '), {
      required: true,
      hint: 'Add any BCP-47 language code. Save and reopen to reveal new translation fields.',
    }),
    field('defaultLanguage', 'Default language', entry.defaultLanguage ?? languages[0]),
    section('Name and introduction'),
    ...localizedFields('name', 'Campaign name', entry.name, languages, { required: true }),
    ...localizedFields('description', 'Description', entry.description, languages, {
      type: 'textarea',
    }),
    ...localizedFields('status', 'Status', entry.status, languages),
    section('Your table'),
    field('dungeonMaster', 'Game Master', details.dungeonMaster ?? ''),
    field('partyName', 'Party name', details.partyName ?? ''),
    field('edition', 'System / edition', details.edition ?? ''),
    field('cover', 'Cover image', '', { type: 'file', hint: 'PNG, JPEG or WebP · up to 8 MB' }),
    section('Running recap'),
    ...localizedFields('story', 'Story so far', details.storySoFar, languages, {
      type: 'textarea',
    }),
  ].join('');
}

function openCampaignEditor(editing = false) {
  openDialog({
    title: editing ? 'Edit campaign' : 'New campaign',
    eyebrow: editing ? 'Overview' : 'A new adventure',
    html: campaignForm(editing ? state.campaign : null),
    editor: { kind: 'campaign', editing },
  });
  if (editing) fields.querySelector('[name="id"]').disabled = true;
}

function entityForm(type, item = {}) {
  const languages = campaignLanguages();
  const common = [
    field('id', 'Entry ID', item.id ?? '', {
      required: true,
      hint: 'Suggested automatically from the name.',
    }),
  ];
  if (type === 'characters') {
    return [
      ...common,
      field('name', 'Name', item.name, { required: true }),
      field('playerName', 'Player', item.playerName),
      ...localizedFields('sex', 'Gender', item.sex, languages),
      field('level', 'Level', item.sheet?.level ?? 1, { type: 'number', min: 1 }),
      field('classType', 'Class / archetype', item.sheet?.classType),
      field('race', 'Species / ancestry', item.sheet?.race),
      field('background', 'Background', item.sheet?.background),
      field('alignment', 'Alignment / outlook', item.sheet?.alignment),
      field('password', 'Spoiler password', item.password ?? 'cambiami', {
        hint: 'Discourages casual spoilers; this is not encryption.',
      }),
      field('image', 'Profile image', '', { type: 'file', wide: true }),
      section('Public profile'),
      ...localizedFields('backstory', 'Backstory', item.publicProfile?.backstory, languages, {
        type: 'textarea',
      }),
      ...localizedFields('traits', 'Personality traits', item.publicProfile?.traits, languages, {
        type: 'textarea',
      }),
      ...localizedFields('ideals', 'Ideals', item.publicProfile?.ideals, languages, {
        type: 'textarea',
      }),
      ...localizedFields('bonds', 'Bonds', item.publicProfile?.bonds, languages, {
        type: 'textarea',
      }),
      ...localizedFields('flaws', 'Flaws', item.publicProfile?.flaws, languages, {
        type: 'textarea',
      }),
      ...localizedFields('known', 'Known history', item.publicProfile?.knownHistory, languages, {
        type: 'textarea',
      }),
      section('Private notes'),
      ...localizedFields(
        'secret',
        'Secrets and notes',
        item.privateProfile?.secretBackstory,
        languages,
        { type: 'textarea', wide: true },
      ),
    ].join('');
  }
  if (type === 'npcs') {
    return [
      ...common,
      field('name', 'Name', item.name, { required: true }),
      field('title', 'Title', item.title),
      field('category', 'Group / location', item.category),
      field('allegiance', 'Allegiance', item.allegiance ?? 'neutral', {
        type: 'select',
        values: [
          ['ally', 'Ally'],
          ['neutral', 'Neutral'],
          ['enemy', 'Enemy'],
        ],
      }),
      field('image', 'Profile image', '', { type: 'file', wide: true }),
      section('Profile'),
      ...localizedFields('description', 'Description', item.profile?.description, languages, {
        type: 'textarea',
      }),
      ...localizedFields('role', 'Role', item.profile?.role, languages),
      ...localizedFields('personality', 'Personality', item.profile?.personality, languages, {
        type: 'textarea',
      }),
      ...localizedFields('location', 'Location', item.profile?.location, languages),
      ...localizedFields('history', 'Known history', item.profile?.knownHistory, languages, {
        type: 'textarea',
        wide: true,
      }),
    ].join('');
  }
  if (type === 'sessions') {
    return [
      ...common,
      field(
        'sessionNumber',
        'Session number',
        item.sessionNumber ?? state.campaign.sessions.length + 1,
        { type: 'number', min: 1 },
      ),
      field('date', 'Date', item.date ?? new Date().toISOString().slice(0, 10), { type: 'date' }),
      ...localizedFields('title', 'Title', item.title, languages, { required: true }),
      ...localizedFields('location', 'Location', item.location, languages),
      ...localizedFields('summary', 'Summary', item.summary, languages, { type: 'textarea' }),
      ...localizedFields('prose', 'Chronicle', item.prose, languages, { type: 'textarea' }),
      ...languages.map((language) =>
        field(
          `events__${language}`,
          `Key events · ${languageName(language)} (${language})`,
          (item.keyEvents ?? [])
            .map((event) => event.description?.[language])
            .filter(Boolean)
            .join('\n'),
          { type: 'textarea', hint: 'One event per line.' },
        ),
      ),
    ].join('');
  }
  return [
    ...common,
    ...localizedFields('name', 'Name', item.name, languages, { required: true }),
    ...localizedFields('region', 'Region', item.region, languages),
    field('status', 'Exploration', item.explorationStatus ?? 'unexplored', {
      type: 'select',
      values: [
        ['unexplored', 'Unexplored'],
        ['in-progress', 'In progress'],
        ['completed', 'Completed'],
      ],
    }),
    field('image', 'Image', '', { type: 'file' }),
    ...localizedFields('description', 'Description', item.description, languages, {
      type: 'textarea',
    }),
  ].join('');
}

function openEntityEditor(type, item) {
  const labels = { characters: 'Character', npcs: 'NPC', sessions: 'Session', maps: 'Location' };
  openDialog({
    title: `${item ? 'Edit' : 'New'} ${labels[type].toLowerCase()}`,
    eyebrow: labels[type],
    html: entityForm(type, item),
    editor: { kind: 'entity', type, previousId: item?.id, original: item },
  });
  const nameInput = fields.querySelector(
    '[name="name"], [name^="loc__title__"], [name^="loc__name__"]',
  );
  const idInput = fields.querySelector('[name="id"]');
  if (!item && nameInput && idInput) {
    nameInput.addEventListener('input', () => {
      if (!idInput.dataset.touched) idInput.value = slugify(nameInput.value);
    });
    idInput.addEventListener('input', () => (idInput.dataset.touched = 'true'));
  }
  if (item) idInput.readOnly = true;
}

function localizedFormValue(form, prefix, fallback = '', languages = campaignLanguages()) {
  const value = Object.fromEntries(
    languages.map((language) => [
      language,
      form.get(`loc__${prefix}__${language}`)?.toString().trim() || fallback,
    ]),
  );
  const first = Object.values(value).find(Boolean) || fallback;
  if (!value.en) value.en = first;
  return value;
}

async function uploadSelectedImage(inputName, category) {
  const file = fields.querySelector(`[name="${inputName}"]`)?.files?.[0];
  if (!file) return undefined;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return api(`/api/campaigns/${encodeURIComponent(state.selectedId)}/images`, {
    method: 'POST',
    body: JSON.stringify({ category, fileName: file.name, dataUrl }),
  });
}

async function saveCampaign(form) {
  const creating = !state.editor.editing;
  const primaryLanguage = form.get('primaryLanguage')?.toString().trim() || 'en';
  const languages = creating
    ? normalizeLanguageCodes(`${primaryLanguage},${form.get('additionalLanguages') ?? ''}`)
    : normalizeLanguageCodes(form.get('languages'));
  const defaultLanguage = creating
    ? primaryLanguage
    : form.get('defaultLanguage')?.toString().trim() || languages[0];
  const primary = (fieldName, fallback = '') => {
    const text = form.get(fieldName)?.toString().trim() || fallback;
    return Object.fromEntries(
      [...new Set([...languages, 'en'])].map((language) => [
        language,
        language === defaultLanguage || language === 'en' ? text : '',
      ]),
    );
  };
  const data = {
    id: form.get('id')?.toString() || state.selectedId,
    languages,
    defaultLanguage,
    name: creating ? primary('name') : localizedFormValue(form, 'name', '', languages),
    description: creating
      ? primary('description')
      : localizedFormValue(form, 'description', '', languages),
    status: creating
      ? primary('status', 'In progress')
      : localizedFormValue(form, 'status', '', languages),
    edition: form.get('edition')?.toString(),
    startDate: form.get('startDate')?.toString(),
    dungeonMaster: form.get('dungeonMaster')?.toString(),
    partyName: form.get('partyName')?.toString(),
  };
  if (creating) {
    const created = await api('/api/campaigns', { method: 'POST', body: JSON.stringify(data) });
    state.selectedId = created.manifestEntry.id;
    state.campaign = created;
    const image = await uploadSelectedImage('cover', 'group');
    if (image) {
      data.thumbnail = `campaigns/${state.selectedId}/${image.path}`;
      data.campaign = {
        ...created.campaign,
        languages,
        defaultLanguage,
        heroImages: [image.path],
      };
      state.campaign = await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  } else {
    const image = await uploadSelectedImage('cover', 'group');
    data.thumbnail = image
      ? `campaigns/${state.selectedId}/${image.path}`
      : state.campaign.manifestEntry.thumbnail;
    data.campaign = {
      ...state.campaign.campaign,
      edition: data.edition,
      startDate: data.startDate,
      dungeonMaster: data.dungeonMaster,
      partyName: data.partyName,
      languages,
      defaultLanguage,
      storySoFar: localizedFormValue(form, 'story', '', languages),
      heroImages: image
        ? [
            image.path,
            ...(state.campaign.campaign.heroImages ?? []).filter((path) => path !== image.path),
          ]
        : state.campaign.campaign.heroImages,
    };
    state.campaign = await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

function baseCharacter(original = {}) {
  return JSON.parse(
    JSON.stringify(
      original.id
        ? original
        : {
            id: '',
            name: '',
            sex: { en: '', it: '' },
            avatar: { url: '', alt: '' },
            gallery: [],
            profileImageUrl: '',
            portraitImageUrl: '',
            publicProfile: {
              backstory: { en: '', it: '' },
              traits: { en: '', it: '' },
              ideals: { en: '', it: '' },
              bonds: { en: '', it: '' },
              flaws: { en: '', it: '' },
              knownHistory: { en: '', it: '' },
            },
            privateProfile: {
              secretBackstory: { en: '', it: '' },
              hiddenMotivations: { en: '', it: '' },
              secrets: [],
              dmNotes: { en: '', it: '' },
            },
            sheet: {
              level: 1,
              classType: '',
              race: '',
              background: '',
              alignment: '',
              experiencePoints: 0,
              hitPoints: 10,
              maxHitPoints: 10,
              armorClass: 10,
              speed: 30,
              proficiencyBonus: 2,
              abilityScores: {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10,
              },
              savingThrows: [],
              skills: [],
              languages: [],
              equipment: [],
              features: [],
              currency: {},
            },
            diary: [],
            sessionKnowledge: [],
            quotes: [],
            password: 'cambiami',
          },
    ),
  );
}

async function buildEntity(type, form, original = {}) {
  const id = form.get('id').toString();
  const languages = campaignLanguages();
  if (type === 'characters') {
    const item = baseCharacter(original);
    const image = await uploadSelectedImage('image', 'characters');
    item.id = id;
    item.name = form.get('name').toString();
    item.playerName = form.get('playerName').toString();
    item.sex = localizedFormValue(form, 'sex', '', languages);
    item.password = form.get('password').toString() || 'cambiami';
    if (image) {
      item.avatar = { url: image.path, alt: item.name };
      item.profileImageUrl = image.path;
      item.portraitImageUrl = image.path;
    }
    item.publicProfile = {
      ...item.publicProfile,
      backstory: localizedFormValue(form, 'backstory', '', languages),
      traits: localizedFormValue(form, 'traits', '', languages),
      ideals: localizedFormValue(form, 'ideals', '', languages),
      bonds: localizedFormValue(form, 'bonds', '', languages),
      flaws: localizedFormValue(form, 'flaws', '', languages),
      knownHistory: localizedFormValue(form, 'known', '', languages),
    };
    item.privateProfile = {
      ...item.privateProfile,
      secretBackstory: localizedFormValue(form, 'secret', '', languages),
    };
    item.sheet = {
      ...item.sheet,
      level: Number(form.get('level')) || 1,
      classType: form.get('classType').toString(),
      race: form.get('race').toString(),
      background: form.get('background').toString(),
      alignment: form.get('alignment').toString(),
    };
    return item;
  }
  if (type === 'npcs') {
    const item = JSON.parse(
      JSON.stringify(
        original.id
          ? original
          : {
              id: '',
              name: '',
              sex: { en: '', it: '' },
              avatar: { url: '', alt: '' },
              gallery: [],
              profile: {
                description: { en: '', it: '' },
                role: { en: '', it: '' },
                personality: { en: '', it: '' },
                location: { en: '', it: '' },
                knownHistory: { en: '', it: '' },
              },
              allegiance: 'neutral',
              isAlive: true,
            },
      ),
    );
    const image = await uploadSelectedImage('image', 'npcs');
    item.id = id;
    item.name = form.get('name').toString();
    item.title = form.get('title').toString();
    item.category = form.get('category').toString();
    item.allegiance = form.get('allegiance').toString();
    if (image) {
      item.avatar = { url: image.path, alt: item.name };
      item.profileImageUrl = image.path;
      item.portraitImageUrl = image.path;
    }
    item.profile = {
      ...item.profile,
      description: localizedFormValue(form, 'description', '', languages),
      role: localizedFormValue(form, 'role', '', languages),
      personality: localizedFormValue(form, 'personality', '', languages),
      location: localizedFormValue(form, 'location', '', languages),
      knownHistory: localizedFormValue(form, 'history', '', languages),
    };
    return item;
  }
  if (type === 'sessions') {
    const events = Object.fromEntries(
      languages.map((language) => [
        language,
        form
          .get(`events__${language}`)
          ?.toString()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean) ?? [],
      ]),
    );
    const eventCount = Math.max(0, ...Object.values(events).map((entries) => entries.length));
    return {
      ...original,
      id,
      sessionNumber: Number(form.get('sessionNumber')) || 1,
      date: form.get('date').toString(),
      title: localizedFormValue(form, 'title', '', languages),
      summary: localizedFormValue(form, 'summary', '', languages),
      location: localizedFormValue(form, 'location', '', languages),
      prose: localizedFormValue(form, 'prose', '', languages),
      storySoFar: localizedFormValue(form, 'summary', '', languages),
      keyEvents: Array.from({ length: eventCount }, (_, index) => ({
        description: Object.fromEntries(
          languages.map((language) => [language, events[language][index] ?? '']),
        ),
      })),
    };
  }
  const image = await uploadSelectedImage('image', 'maps');
  return {
    ...original,
    id,
    name: localizedFormValue(form, 'name', '', languages),
    description: localizedFormValue(form, 'description', '', languages),
    region: localizedFormValue(form, 'region', '', languages),
    explorationStatus: form.get('status').toString(),
    images: image
      ? [
          {
            url: image.path,
            alt: localized(localizedFormValue(form, 'name', '', languages), languages[0]),
          },
        ]
      : (original.images ?? []),
    discoveries: original.discoveries ?? [],
  };
}

async function saveEditor() {
  const form = new FormData(editorForm);
  if (state.editor.kind === 'campaign') await saveCampaign(form);
  else {
    const entity = await buildEntity(state.editor.type, form, state.editor.original);
    const base = `/api/campaigns/${encodeURIComponent(state.selectedId)}/${state.editor.type}`;
    const path = state.editor.previousId
      ? `${base}/${encodeURIComponent(state.editor.previousId)}`
      : base;
    await api(path, {
      method: state.editor.previousId ? 'PUT' : 'POST',
      body: JSON.stringify(entity),
    });
    state.campaign = await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`);
  }
  await loadState();
  dialog.close();
  toast('Saved. Your Companion is up to date.');
}

function renderProject() {
  document.querySelector('#page-title').textContent = 'Setup and publishing';
  const install = state.project.jobs.install;
  const build = state.project.jobs.build;
  const preview = state.project.jobs.preview;
  const activeLog =
    [preview, build, install].find((job) => job?.status === 'running') ||
    preview ||
    build ||
    install;
  content.innerHTML = `
    <div class="project-stack">
      <section class="project-panel"><span class="eyebrow">1 · Preparation</span><h2>Prepare the project</h2><p>${state.project.dependenciesReady ? 'Dependencies are installed. You can preview or validate your Companion.' : 'On first use, install everything the project needs. An internet connection is required.'}</p><div class="action-row"><button class="primary-button" data-project-action="install" ${install?.status === 'running' ? 'disabled' : ''}>${state.project.dependenciesReady ? 'Reinstall dependencies' : 'Prepare automatically'}</button><span class="job-status ${install?.status || ''}">${install ? escapeHtml(install.status) : state.project.dependenciesReady ? 'Ready' : 'Not prepared'}</span></div></section>
      <section class="project-panel"><span class="eyebrow">2 · Preview</span><h2>Open your Companion</h2><p>Launch the local site with the campaign data you just entered.</p><div class="action-row"><button class="primary-button" data-project-action="preview" ${!state.project.dependenciesReady || preview?.status === 'running' ? 'disabled' : ''}>Launch site</button>${preview?.status === 'running' ? '<a class="secondary-button" href="http://127.0.0.1:4200" target="_blank" rel="noreferrer">Open now</a>' : ''}<span class="job-status ${preview?.status || ''}">${preview ? escapeHtml(preview.status) : 'Not started'}</span></div></section>
      <section class="project-panel"><span class="eyebrow">3 · Validation</span><h2>Check before publishing</h2><p>The production build catches invalid data or components before you push to GitHub.</p><div class="action-row"><button class="secondary-button" data-project-action="build" ${!state.project.dependenciesReady || build?.status === 'running' ? 'disabled' : ''}>Check and build site</button><span class="job-status ${build?.status || ''}">${build ? escapeHtml(build.status) : 'Not run'}</span></div></section>
      <section class="project-panel"><span class="eyebrow">4 · Publishing</span><h2>Send it to the realm</h2><p>After a successful check, commit and push. The included workflow deploys the site to GitHub Pages automatically.</p><a class="secondary-button" href="https://github.com/mtamagno/campaign-companion-template#publish" target="_blank" rel="noreferrer">Open the guide</a></section>
      ${activeLog ? `<pre class="job-log">${escapeHtml(activeLog.logs)}</pre>` : ''}
    </div>`;
}

async function refreshJobs() {
  const result = await api('/api/jobs');
  state.project = result;
  if (state.projectMode) renderProject();
  if (Object.values(result.jobs).some((job) => job.status === 'running')) {
    setTimeout(() => refreshJobs().catch((error) => toast(error.message, true)), 1200);
  } else await loadState();
}

async function runProjectAction(kind) {
  await api(`/api/actions/${kind}`, { method: 'POST', body: '{}' });
  state.projectMode = true;
  renderSidebar();
  void refreshJobs();
}

async function exportCurrent() {
  const bundle = await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}/export`);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
  );
  link.download = `${state.selectedId}-backup.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importFile(file) {
  const bundle = JSON.parse(await file.text());
  const campaign = await api('/api/import', { method: 'POST', body: JSON.stringify(bundle) });
  await loadState();
  await selectCampaign(campaign.manifestEntry.id);
  toast('Backup imported successfully.');
}

campaignList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-campaign]');
  if (button) selectCampaign(button.dataset.campaign).catch((error) => toast(error.message, true));
});
document.querySelector('#campaign-search').addEventListener('input', renderSidebar);
document.querySelector('#new-campaign').addEventListener('click', () => openCampaignEditor(false));
mobileMenu.addEventListener('click', () =>
  setMenuOpen(!document.body.classList.contains('menu-open')),
);
document.querySelector('#menu-backdrop').addEventListener('click', () => setMenuOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) setMenuOpen(false);
});
document.querySelector('#show-project').addEventListener('click', () => {
  state.projectMode = true;
  setMenuOpen(false);
  renderSidebar();
  render();
});
document
  .querySelector('#import-campaign')
  .addEventListener('click', () => document.querySelector('#import-file').click());
document.querySelector('#import-file').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) importFile(file).catch((error) => toast(error.message, true));
  event.target.value = '';
});
document.querySelector('#open-companion').addEventListener('click', () => {
  if (!state.project.dependenciesReady) {
    state.projectMode = true;
    render();
    toast('Prepare the project first.');
    return;
  }
  if (state.project.jobs.preview?.status === 'running')
    window.open('http://127.0.0.1:4200', '_blank', 'noopener');
  else runProjectAction('preview').catch((error) => toast(error.message, true));
});

content.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    state.tab = tab.dataset.tab;
    renderCampaign();
    return;
  }
  const action = event.target.closest('[data-action]');
  if (action) {
    try {
      if (action.dataset.action === 'new-campaign') openCampaignEditor(false);
      if (action.dataset.action === 'import') document.querySelector('#import-file').click();
      if (action.dataset.action === 'edit-campaign') openCampaignEditor(true);
      if (action.dataset.action === 'export') await exportCurrent();
      if (action.dataset.action === 'delete-campaign') {
        const confirmation = prompt(`To delete this campaign, type exactly: ${state.selectedId}`);
        if (confirmation === null) return;
        await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`, {
          method: 'DELETE',
          body: JSON.stringify({ confirmation }),
        });
        state.selectedId = null;
        state.campaign = null;
        await loadState({ selectFirst: true });
        toast('Campaign moved to the local recycle bin.');
      }
      if (action.dataset.action === 'add-entity') openEntityEditor(action.dataset.type);
      if (action.dataset.action === 'edit-entity')
        openEntityEditor(
          action.dataset.type,
          state.campaign[action.dataset.type].find((item) => item.id === action.dataset.id),
        );
      if (
        action.dataset.action === 'delete-entity' &&
        confirm('Remove this entry? It will be moved to the local recycle bin when possible.')
      ) {
        await api(
          `/api/campaigns/${encodeURIComponent(state.selectedId)}/${action.dataset.type}/${encodeURIComponent(action.dataset.id)}`,
          { method: 'DELETE', body: '{}' },
        );
        state.campaign = await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`);
        render();
        toast('Entry removed.');
      }
    } catch (error) {
      toast(error.message, true);
    }
  }
  const projectAction = event.target.closest('[data-project-action]');
  if (projectAction)
    runProjectAction(projectAction.dataset.projectAction).catch((error) =>
      toast(error.message, true),
    );
});

editorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const save = document.querySelector('#dialog-save');
  save.disabled = true;
  save.textContent = 'Saving…';
  saveEditor()
    .catch((error) => toast(error.message, true))
    .finally(() => {
      save.disabled = false;
      save.textContent = 'Save';
    });
});
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#dialog-cancel').addEventListener('click', () => dialog.close());

loadState({ selectFirst: true }).catch((error) => {
  content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  toast(error.message, true);
});
