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

function localized(value, language = 'it') {
  if (typeof value === 'string') return value;
  return value?.[language] || value?.en || value?.it || '';
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
  if (!response.ok) throw new Error(result.error || `Errore ${response.status}`);
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
            <span><strong>${escapeHtml(localized(item.name))}</strong><small>${escapeHtml(localized(item.status) || 'Campagna')}</small></span>
            <span class="campaign-link__count">${item.counts.characters}</span>
          </button>`,
        )
        .join('')
    : '<div class="empty">Nessuna campagna trovata.</div>';
}

function render() {
  if (state.projectMode) {
    renderProject();
    return;
  }
  if (!state.campaign) {
    document.querySelector('#page-title').textContent = 'Il tuo archivio d’avventura';
    content.innerHTML = `
      <div class="welcome"><div class="welcome__inner">
        <div class="welcome__icon">✦</div>
        <span class="eyebrow">Niente JSON, niente cartelle da copiare</span>
        <h2>Da qui comincia la tua campagna</h2>
        <p>Crea un mondo, aggiungi il gruppo e aggiorna le cronache attraverso moduli semplici. I file del Companion vengono preparati automaticamente.</p>
        <div class="welcome__actions"><button class="primary-button" data-action="new-campaign">Crea la prima campagna</button><button class="secondary-button" data-action="import">Importa un backup</button></div>
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
  const title = localized(data.manifestEntry.name);
  document.querySelector('#page-title').textContent = title;
  const heroPath = data.manifestEntry.thumbnail || data.campaign.heroImages?.[0];
  const tabs = [
    ['overview', 'Panoramica'],
    ['characters', `Personaggi · ${data.characters.length}`],
    ['npcs', `PNG · ${data.npcs.length}`],
    ['sessions', `Sessioni · ${data.sessions.length}`],
    ['maps', `Luoghi · ${data.maps.length}`],
  ];
  content.innerHTML = `
    <section class="campaign-hero">
      ${heroPath ? `<img class="campaign-hero__art" src="${escapeHtml(campaignAsset(heroPath))}" alt="" />` : ''}
      <div class="campaign-hero__scrim"></div>
      <div class="campaign-hero__actions"><button class="secondary-button" data-action="edit-campaign">Modifica</button><button class="secondary-button" data-action="export">Backup</button><button class="secondary-button danger-button" data-action="delete-campaign">Elimina</button></div>
      <div class="campaign-hero__copy"><span class="status-pill">${escapeHtml(localized(data.manifestEntry.status) || 'Campagna')}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(localized(data.manifestEntry.description))}</p></div>
    </section>
    <nav class="tabs" aria-label="Sezioni campagna">${tabs.map(([id, label]) => `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${escapeHtml(label)}</button>`).join('')}</nav>
    <div id="tab-content">${renderTab()}</div>`;
}

function renderTab() {
  switch (state.tab) {
    case 'characters':
      return renderEntities('characters', 'Personaggi', 'Aggiungi personaggio');
    case 'npcs':
      return renderEntities('npcs', 'Personaggi non giocanti', 'Aggiungi PNG');
    case 'sessions':
      return renderEntities('sessions', 'Cronache di sessione', 'Aggiungi sessione');
    case 'maps':
      return renderEntities('maps', 'Luoghi e mappe', 'Aggiungi luogo');
    default:
      return renderOverview();
  }
}

function renderOverview() {
  const { campaign, characters, npcs, sessions, maps } = state.campaign;
  return `
    <div class="metrics">
      ${[
        ['Personaggi', characters.length],
        ['PNG', npcs.length],
        ['Sessioni', sessions.length],
        ['Luoghi', maps.length],
      ]
        .map(
          ([label, value]) =>
            `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`,
        )
        .join('')}
    </div>
    <div class="overview-grid">
      <section class="project-panel"><span class="eyebrow">La storia fin qui</span><h2>${escapeHtml(localized(campaign.name))}</h2><p>${escapeHtml(localized(campaign.storySoFar) || 'Il riassunto della campagna apparirà qui quando lo aggiungerai.')}</p></section>
      <section class="project-panel"><h3>Dettagli del tavolo</h3><dl class="detail-list"><div><dt>Game Master</dt><dd>${escapeHtml(campaign.dungeonMaster)}</dd></div><div><dt>Gruppo</dt><dd>${escapeHtml(campaign.partyName)}</dd></div><div><dt>Sistema</dt><dd>${escapeHtml(campaign.edition)}</dd></div><div><dt>Inizio</dt><dd>${escapeHtml(campaign.startDate)}</dd></div></dl></section>
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
  if (type === 'characters') return [item.sheet?.classType, `Livello ${item.sheet?.level ?? 1}`];
  if (type === 'npcs') return [item.profile?.role?.it, item.allegiance];
  if (type === 'sessions') return [`Sessione ${item.sessionNumber}`, item.date];
  return [localized(item.region), item.explorationStatus];
}

function renderEntities(type, title, addLabel) {
  const items = state.campaign[type];
  return `
    <div class="section-heading"><div><span class="eyebrow">Archivio</span><h2>${title}</h2><p>Puoi aggiungere, correggere o rimuovere ogni voce senza aprire i file.</p></div><button class="primary-button" data-action="add-entity" data-type="${type}">${addLabel}</button></div>
    ${
      items.length
        ? `<div class="card-grid">${items
            .map(
              (item) => `
      <article class="card"><div class="card__top"><span class="card__avatar">${escapeHtml(entityName(type, item).charAt(0).toUpperCase() || '✦')}</span><div class="card__menu"><button data-action="edit-entity" data-type="${type}" data-id="${escapeHtml(item.id)}">Modifica</button><button data-action="delete-entity" data-type="${type}" data-id="${escapeHtml(item.id)}">Rimuovi</button></div></div><h3>${escapeHtml(entityName(type, item))}</h3><p>${escapeHtml(entityDescription(type, item)).slice(0, 180)}</p><div class="card__meta">${entityTags(
        type,
        item,
      )
        .filter(Boolean)
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join('')}</div></article>`,
            )
            .join('')}</div>`
        : `<div class="empty">Non c’è ancora niente qui. Usa “${addLabel}” per iniziare.</div>`
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
  return [
    field('id', 'Identificativo', entry.id ?? '', {
      required: true,
      hint: 'Solo lettere minuscole, numeri e trattini.',
    }),
    field(
      'startDate',
      'Data di inizio',
      details.startDate ?? new Date().toISOString().slice(0, 10),
      { type: 'date' },
    ),
    section('Nome e presentazione'),
    field('nameIt', 'Nome · Italiano', entry.name?.it, { required: true }),
    field('nameEn', 'Nome · English', entry.name?.en, { required: true }),
    field('descriptionIt', 'Descrizione · Italiano', entry.description?.it, { type: 'textarea' }),
    field('descriptionEn', 'Description · English', entry.description?.en, { type: 'textarea' }),
    field('statusIt', 'Stato · Italiano', entry.status?.it ?? 'In corso'),
    field('statusEn', 'Status · English', entry.status?.en ?? 'In progress'),
    section('Il tavolo'),
    field('dungeonMaster', 'Game Master', details.dungeonMaster ?? ''),
    field('partyName', 'Nome del gruppo', details.partyName ?? ''),
    field('edition', 'Sistema / edizione', details.edition ?? ''),
    field('cover', 'Copertina', '', { type: 'file', hint: 'PNG, JPEG o WebP · massimo 8 MB' }),
    ...(editing
      ? [
          section('Riassunto cumulativo'),
          field('storyIt', 'La storia fin qui · Italiano', details.storySoFar?.it, {
            type: 'textarea',
          }),
          field('storyEn', 'Story so far · English', details.storySoFar?.en, { type: 'textarea' }),
        ]
      : []),
  ].join('');
}

function openCampaignEditor(editing = false) {
  openDialog({
    title: editing ? 'Modifica campagna' : 'Nuova campagna',
    eyebrow: editing ? 'Panoramica' : 'Nuova avventura',
    html: campaignForm(editing ? state.campaign : null),
    editor: { kind: 'campaign', editing },
  });
  if (editing) fields.querySelector('[name="id"]').disabled = true;
}

function entityForm(type, item = {}) {
  const isEdit = Boolean(item.id);
  const common = [
    field('id', 'Identificativo', item.id ?? '', {
      required: true,
      hint: 'Viene proposto automaticamente dal nome.',
    }),
  ];
  if (type === 'characters') {
    return [
      ...common,
      field('name', 'Nome', item.name, { required: true }),
      field('playerName', 'Giocatore / giocatrice', item.playerName),
      field('sexIt', 'Genere · Italiano', item.sex?.it),
      field('sexEn', 'Gender · English', item.sex?.en),
      field('level', 'Livello', item.sheet?.level ?? 1, { type: 'number', min: 1 }),
      field('classType', 'Classe / archetipo', item.sheet?.classType),
      field('race', 'Specie / stirpe', item.sheet?.race),
      field('background', 'Background', item.sheet?.background),
      field('alignment', 'Indole / allineamento', item.sheet?.alignment),
      field('password', 'Password spoiler', item.password ?? 'cambiami', {
        hint: 'Protegge solo da spoiler casuali, non è cifratura.',
      }),
      field('image', 'Immagine profilo', '', { type: 'file', wide: true }),
      section('Profilo pubblico'),
      field('backstoryIt', 'Storia · Italiano', item.publicProfile?.backstory?.it, {
        type: 'textarea',
      }),
      field('backstoryEn', 'Backstory · English', item.publicProfile?.backstory?.en, {
        type: 'textarea',
      }),
      field('traitsIt', 'Tratti · Italiano', item.publicProfile?.traits?.it, { type: 'textarea' }),
      field('traitsEn', 'Traits · English', item.publicProfile?.traits?.en, { type: 'textarea' }),
      field('idealsIt', 'Ideali · Italiano', item.publicProfile?.ideals?.it, { type: 'textarea' }),
      field('bondsIt', 'Legami · Italiano', item.publicProfile?.bonds?.it, { type: 'textarea' }),
      field('flawsIt', 'Debolezze · Italiano', item.publicProfile?.flaws?.it, { type: 'textarea' }),
      field('knownIt', 'Storia conosciuta · Italiano', item.publicProfile?.knownHistory?.it, {
        type: 'textarea',
      }),
      section('Parte privata'),
      field('secretIt', 'Segreti e note · Italiano', item.privateProfile?.secretBackstory?.it, {
        type: 'textarea',
        wide: true,
      }),
    ].join('');
  }
  if (type === 'npcs') {
    return [
      ...common,
      field('name', 'Nome', item.name, { required: true }),
      field('title', 'Titolo', item.title),
      field('category', 'Gruppo / luogo', item.category),
      field('allegiance', 'Atteggiamento', item.allegiance ?? 'neutral', {
        type: 'select',
        values: [
          ['ally', 'Alleato'],
          ['neutral', 'Neutrale'],
          ['enemy', 'Nemico'],
        ],
      }),
      field('image', 'Immagine profilo', '', { type: 'file', wide: true }),
      section('Profilo'),
      field('descriptionIt', 'Descrizione · Italiano', item.profile?.description?.it, {
        type: 'textarea',
      }),
      field('descriptionEn', 'Description · English', item.profile?.description?.en, {
        type: 'textarea',
      }),
      field('roleIt', 'Ruolo · Italiano', item.profile?.role?.it),
      field('roleEn', 'Role · English', item.profile?.role?.en),
      field('personalityIt', 'Personalità · Italiano', item.profile?.personality?.it, {
        type: 'textarea',
      }),
      field('locationIt', 'Posizione · Italiano', item.profile?.location?.it),
      field('historyIt', 'Storia conosciuta · Italiano', item.profile?.knownHistory?.it, {
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
        'Numero sessione',
        item.sessionNumber ?? state.campaign.sessions.length + 1,
        { type: 'number', min: 1 },
      ),
      field('date', 'Data', item.date ?? new Date().toISOString().slice(0, 10), { type: 'date' }),
      field('titleIt', 'Titolo · Italiano', item.title?.it, { required: true }),
      field('titleEn', 'Title · English', item.title?.en, { required: true }),
      field('locationIt', 'Luogo · Italiano', item.location?.it),
      field('locationEn', 'Location · English', item.location?.en),
      field('summaryIt', 'Riassunto · Italiano', item.summary?.it, { type: 'textarea' }),
      field('summaryEn', 'Summary · English', item.summary?.en, { type: 'textarea' }),
      field('proseIt', 'Cronaca · Italiano', item.prose?.it, { type: 'textarea' }),
      field('proseEn', 'Chronicle · English', item.prose?.en, { type: 'textarea' }),
      field(
        'eventsIt',
        'Eventi principali · Italiano',
        (item.keyEvents ?? [])
          .map((event) => event.description?.it)
          .filter(Boolean)
          .join('\n'),
        { type: 'textarea', hint: 'Un evento per riga.' },
      ),
      field(
        'eventsEn',
        'Key events · English',
        (item.keyEvents ?? [])
          .map((event) => event.description?.en)
          .filter(Boolean)
          .join('\n'),
        { type: 'textarea', hint: 'One event per line.' },
      ),
    ].join('');
  }
  return [
    ...common,
    field('nameIt', 'Nome · Italiano', item.name?.it, { required: true }),
    field('nameEn', 'Name · English', item.name?.en, { required: true }),
    field('regionIt', 'Regione · Italiano', item.region?.it),
    field('regionEn', 'Region · English', item.region?.en),
    field('status', 'Esplorazione', item.explorationStatus ?? 'unexplored', {
      type: 'select',
      values: [
        ['unexplored', 'Non esplorato'],
        ['in-progress', 'In esplorazione'],
        ['completed', 'Completato'],
      ],
    }),
    field('image', 'Immagine', '', { type: 'file' }),
    field('descriptionIt', 'Descrizione · Italiano', item.description?.it, { type: 'textarea' }),
    field('descriptionEn', 'Description · English', item.description?.en, { type: 'textarea' }),
  ].join('');
}

function openEntityEditor(type, item) {
  const labels = { characters: 'Personaggio', npcs: 'PNG', sessions: 'Sessione', maps: 'Luogo' };
  openDialog({
    title: `${item ? 'Modifica' : 'Nuovo'} ${labels[type].toLowerCase()}`,
    eyebrow: labels[type],
    html: entityForm(type, item),
    editor: { kind: 'entity', type, previousId: item?.id, original: item },
  });
  const nameInput = fields.querySelector('[name="name"], [name="titleIt"], [name="nameIt"]');
  const idInput = fields.querySelector('[name="id"]');
  if (!item && nameInput && idInput) {
    nameInput.addEventListener('input', () => {
      if (!idInput.dataset.touched) idInput.value = slugify(nameInput.value);
    });
    idInput.addEventListener('input', () => (idInput.dataset.touched = 'true'));
  }
  if (item) idInput.readOnly = true;
}

function bilingual(form, prefix, fallback = '') {
  return {
    it: form.get(`${prefix}It`)?.toString().trim() || fallback,
    en:
      form.get(`${prefix}En`)?.toString().trim() ||
      form.get(`${prefix}It`)?.toString().trim() ||
      fallback,
  };
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
  const data = {
    id: form.get('id')?.toString() || state.selectedId,
    name: bilingual(form, 'name'),
    description: bilingual(form, 'description'),
    status: bilingual(form, 'status'),
    edition: form.get('edition')?.toString(),
    startDate: form.get('startDate')?.toString(),
    dungeonMaster: form.get('dungeonMaster')?.toString(),
    partyName: form.get('partyName')?.toString(),
  };
  if (!state.editor.editing) {
    const created = await api('/api/campaigns', { method: 'POST', body: JSON.stringify(data) });
    state.selectedId = created.manifestEntry.id;
    state.campaign = created;
    const image = await uploadSelectedImage('cover', 'group');
    if (image) {
      data.thumbnail = `campaigns/${state.selectedId}/${image.path}`;
      data.campaign = {
        ...created.campaign,
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
      storySoFar: bilingual(form, 'story'),
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
  if (type === 'characters') {
    const item = baseCharacter(original);
    const image = await uploadSelectedImage('image', 'characters');
    item.id = id;
    item.name = form.get('name').toString();
    item.playerName = form.get('playerName').toString();
    item.sex = bilingual(form, 'sex');
    item.password = form.get('password').toString() || 'cambiami';
    if (image) {
      item.avatar = { url: image.path, alt: item.name };
      item.profileImageUrl = image.path;
      item.portraitImageUrl = image.path;
    }
    item.publicProfile = {
      ...item.publicProfile,
      backstory: bilingual(form, 'backstory'),
      traits: bilingual(form, 'traits'),
      ideals: { en: form.get('idealsIt').toString(), it: form.get('idealsIt').toString() },
      bonds: { en: form.get('bondsIt').toString(), it: form.get('bondsIt').toString() },
      flaws: { en: form.get('flawsIt').toString(), it: form.get('flawsIt').toString() },
      knownHistory: { en: form.get('knownIt').toString(), it: form.get('knownIt').toString() },
    };
    item.privateProfile = {
      ...item.privateProfile,
      secretBackstory: { en: form.get('secretIt').toString(), it: form.get('secretIt').toString() },
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
      description: bilingual(form, 'description'),
      role: bilingual(form, 'role'),
      personality: {
        en: form.get('personalityIt').toString(),
        it: form.get('personalityIt').toString(),
      },
      location: { en: form.get('locationIt').toString(), it: form.get('locationIt').toString() },
      knownHistory: { en: form.get('historyIt').toString(), it: form.get('historyIt').toString() },
    };
    return item;
  }
  if (type === 'sessions') {
    const itEvents = form
      .get('eventsIt')
      .toString()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const enEvents = form
      .get('eventsEn')
      .toString()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      ...original,
      id,
      sessionNumber: Number(form.get('sessionNumber')) || 1,
      date: form.get('date').toString(),
      title: bilingual(form, 'title'),
      summary: bilingual(form, 'summary'),
      location: bilingual(form, 'location'),
      prose: bilingual(form, 'prose'),
      storySoFar: bilingual(form, 'summary'),
      keyEvents: Array.from({ length: Math.max(itEvents.length, enEvents.length) }, (_, index) => ({
        description: {
          it: itEvents[index] || enEvents[index] || '',
          en: enEvents[index] || itEvents[index] || '',
        },
      })),
    };
  }
  const image = await uploadSelectedImage('image', 'maps');
  return {
    ...original,
    id,
    name: bilingual(form, 'name'),
    description: bilingual(form, 'description'),
    region: bilingual(form, 'region'),
    explorationStatus: form.get('status').toString(),
    images: image
      ? [{ url: image.path, alt: localized(bilingual(form, 'name')) }]
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
  toast('Salvato. Il Companion è stato aggiornato.');
}

function renderProject() {
  document.querySelector('#page-title').textContent = 'Avvio e pubblicazione';
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
      <section class="project-panel"><span class="eyebrow">1 · Preparazione</span><h2>Prepara il progetto</h2><p>${state.project.dependenciesReady ? 'Le dipendenze sono installate: puoi aprire o validare il Companion.' : 'Al primo utilizzo installa automaticamente ciò che serve. È necessario Internet.'}</p><div class="action-row"><button class="primary-button" data-project-action="install" ${install?.status === 'running' ? 'disabled' : ''}>${state.project.dependenciesReady ? 'Reinstalla dipendenze' : 'Prepara automaticamente'}</button><span class="job-status ${install?.status || ''}">${install ? escapeHtml(install.status) : state.project.dependenciesReady ? 'Pronto' : 'Da preparare'}</span></div></section>
      <section class="project-panel"><span class="eyebrow">2 · Anteprima</span><h2>Apri il tuo Companion</h2><p>Avvia il sito locale con i dati che hai appena inserito.</p><div class="action-row"><button class="primary-button" data-project-action="preview" ${!state.project.dependenciesReady || preview?.status === 'running' ? 'disabled' : ''}>Avvia il sito</button>${preview?.status === 'running' ? '<a class="secondary-button" href="http://127.0.0.1:4200" target="_blank" rel="noreferrer">Apri ora</a>' : ''}<span class="job-status ${preview?.status || ''}">${preview ? escapeHtml(preview.status) : 'Non avviato'}</span></div></section>
      <section class="project-panel"><span class="eyebrow">3 · Controllo</span><h2>Valida prima di pubblicare</h2><p>Il build individua dati o componenti non validi prima del push su GitHub.</p><div class="action-row"><button class="secondary-button" data-project-action="build" ${!state.project.dependenciesReady || build?.status === 'running' ? 'disabled' : ''}>Controlla e crea il sito</button><span class="job-status ${build?.status || ''}">${build ? escapeHtml(build.status) : 'Non eseguito'}</span></div></section>
      <section class="project-panel"><span class="eyebrow">4 · Pubblicazione</span><h2>Mettilo online</h2><p>Dopo un controllo riuscito, fai commit e push. Il workflow incluso pubblicherà automaticamente su GitHub Pages.</p><a class="secondary-button" href="https://github.com/mtamagno/campaign-companion-template#publish" target="_blank" rel="noreferrer">Apri la guida</a></section>
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
  toast('Backup importato correttamente.');
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
    toast('Prima prepara automaticamente il progetto.');
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
        const confirmation = prompt(
          `Per eliminare la campagna, scrivi esattamente: ${state.selectedId}`,
        );
        if (confirmation === null) return;
        await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`, {
          method: 'DELETE',
          body: JSON.stringify({ confirmation }),
        });
        state.selectedId = null;
        state.campaign = null;
        await loadState({ selectFirst: true });
        toast('Campagna spostata nel cestino locale.');
      }
      if (action.dataset.action === 'add-entity') openEntityEditor(action.dataset.type);
      if (action.dataset.action === 'edit-entity')
        openEntityEditor(
          action.dataset.type,
          state.campaign[action.dataset.type].find((item) => item.id === action.dataset.id),
        );
      if (
        action.dataset.action === 'delete-entity' &&
        confirm('Rimuovere questa voce? Verrà spostata nel cestino locale quando possibile.')
      ) {
        await api(
          `/api/campaigns/${encodeURIComponent(state.selectedId)}/${action.dataset.type}/${encodeURIComponent(action.dataset.id)}`,
          { method: 'DELETE', body: '{}' },
        );
        state.campaign = await api(`/api/campaigns/${encodeURIComponent(state.selectedId)}`);
        render();
        toast('Voce rimossa.');
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
  save.textContent = 'Salvataggio…';
  saveEditor()
    .catch((error) => toast(error.message, true))
    .finally(() => {
      save.disabled = false;
      save.textContent = 'Salva';
    });
});
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#dialog-cancel').addEventListener('click', () => dialog.close());

loadState({ selectFirst: true }).catch((error) => {
  content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  toast(error.message, true);
});
