import {
  ApiError,
  createAdminProject,
  deleteAdminProject,
  listAdminProjects,
  updateAdminProject,
  type AdminProjectSummary,
  type GeneratedProject,
} from '../api/client';
import { MASCOTS } from '../project/mascots';
import { PALETTES } from '../project/palettes';
import { button, copyText, el, field, formatDate, setBusy, trapFocus } from '../ui/dom';

const SESSION_KEY = 'sorry-letter:admin-secret';

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.';
}

function modal(title: string): { root: HTMLElement; content: HTMLElement; close: () => void } {
  const root = el('div', 'admin-modal');
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', title);
  const card = el('div', 'admin-modal__card');
  const head = el('header'); head.append(el('h2', '', title));
  const closeButton = button('Tutup', 'text-button'); head.append(closeButton);
  const content = el('div', 'admin-modal__content');
  card.append(head, content); root.append(card); document.body.append(root); document.body.classList.add('has-modal');
  const close = () => { root.remove(); document.body.classList.remove('has-modal'); };
  closeButton.addEventListener('click', close);
  root.addEventListener('click', (event) => { if (event.target === root) close(); });
  root.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); else trapFocus(card, event); });
  closeButton.focus();
  return { root, content, close };
}

export function mountAdmin(target: HTMLElement): () => void {
  let secret = sessionStorage.getItem(SESSION_KEY) || '';
  let projects: AdminProjectSummary[] = [];
  let query = '';
  let statusFilter = 'all';
  const shell = el('main', 'admin-shell');
  target.replaceChildren(shell);

  function showLogin(error = ''): void {
    shell.replaceChildren();
    const card = el('section', 'admin-login');
    card.append(el('span', 'eyebrow', 'Private access'), el('h1', '', 'Sorry Letter Admin'), el('p', '', 'Masukkan password admin untuk membuat dan mengelola Studio link. Password hanya disimpan selama tab ini terbuka.'));
    const input = el('input', 'text-input'); input.type = 'password'; input.autocomplete = 'current-password'; input.placeholder = 'Admin secret';
    const submit = button('Masuk ke Admin', 'ui-button');
    const feedback = el('p', 'form-error', error); feedback.hidden = !error;
    const login = async () => {
      const value = input.value.trim();
      if (!value) return;
      setBusy(submit, true, 'Memeriksa…'); feedback.hidden = true;
      try {
        projects = (await listAdminProjects(value)).projects;
        secret = value; sessionStorage.setItem(SESSION_KEY, secret); renderDashboard();
      } catch (reason) {
        feedback.textContent = message(reason); feedback.hidden = false; setBusy(submit, false);
      }
    };
    submit.addEventListener('click', () => void login());
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') void login(); });
    card.append(field('Admin secret', input), feedback, submit); shell.append(card); input.focus();
  }

  async function refresh(): Promise<void> {
    projects = (await listAdminProjects(secret)).projects;
    renderDashboard();
  }

  function resultModal(result: GeneratedProject): void {
    const dialog = modal('Studio link berhasil dibuat');
    const projectId = el('code', 'project-code', result.project.projectId);
    dialog.content.append(el('p', '', 'Kirim Studio link kepada customer. Gift link akan aktif setelah customer memublikasikan project.'), projectId);
    const links: Array<[string, string | null, boolean]> = [
      ['Copy Studio Link', result.studioUrl, false],
      ['Open Studio', result.studioUrl, true],
      ['Copy Gift Link', result.giftUrl, false],
    ];
    const actions = el('div', 'modal-actions');
    links.forEach(([label, url, open]) => {
      const action = button(label, open ? 'ui-button ui-button--secondary' : 'ui-button'); action.disabled = !url;
      action.addEventListener('click', async () => {
        if (!url) return;
        if (open) window.open(url, '_blank', 'noopener,noreferrer');
        else { await copyText(url); action.textContent = 'Tersalin'; }
      });
      actions.append(action);
    });
    dialog.content.append(actions);
  }

  async function generate(trigger: HTMLButtonElement): Promise<void> {
    setBusy(trigger, true, 'Membuat…');
    try {
      const result = await createAdminProject(secret, crypto.randomUUID());
      projects.unshift({
        projectId: result.project.projectId, status: result.project.status,
        mascotId: result.project.mascotId, paletteId: result.project.paletteId,
        recipient: result.project.identity.recipient, sender: result.project.identity.sender,
        updatedAt: result.project.updatedAt, publishedAt: result.project.publishedAt,
        studioUrl: result.studioUrl, giftUrl: result.giftUrl,
      });
      renderDashboard(); resultModal(result);
    } catch (error) { window.alert(message(error)); }
    finally { setBusy(trigger, false); }
  }

  function deleteModal(project: AdminProjectSummary): void {
    const dialog = modal('Hapus project permanen');
    dialog.content.append(el('p', '', 'Tindakan ini menghapus draft, gift publik, token mapping, dan seluruh upload pada prefix project. Ketik Project ID untuk melanjutkan.'));
    const input = el('input', 'text-input'); input.placeholder = project.projectId;
    const confirm = button('Hapus project', 'ui-button ui-button--danger'); confirm.disabled = true;
    input.addEventListener('input', () => { confirm.disabled = input.value.trim() !== project.projectId; });
    confirm.addEventListener('click', async () => {
      setBusy(confirm, true, 'Menghapus…');
      try { await deleteAdminProject(secret, project.projectId); dialog.close(); await refresh(); }
      catch (error) { window.alert(message(error)); setBusy(confirm, false); }
    });
    dialog.content.append(field('Project ID', input), confirm); input.focus();
  }

  function projectCard(project: AdminProjectSummary): HTMLElement {
    const card = el('article', 'project-card');
    const head = el('header');
    const title = el('div'); title.append(el('span', `status-badge status-badge--${project.status}`, project.status), el('h3', '', project.recipient || 'Belum ada penerima'), el('code', '', project.projectId));
    const mascot = el('img'); mascot.src = MASCOTS[project.mascotId].preview; mascot.alt = '';
    head.append(title, mascot);
    const meta = el('dl', 'project-meta');
    [['Pengirim', project.sender || 'Belum diisi'], ['Maskot', MASCOTS[project.mascotId].name], ['Warna', PALETTES[project.paletteId].name], ['Update', formatDate(project.updatedAt)]].forEach(([term, value]) => {
      meta.append(el('dt', '', term), el('dd', '', value));
    });
    const actions = el('div', 'project-actions');
    const copyStudio = button('Copy Studio', 'text-button');
    copyStudio.addEventListener('click', async () => { await copyText(project.studioUrl); copyStudio.textContent = 'Tersalin'; });
    const openStudio = button('Open Studio', 'text-button'); openStudio.addEventListener('click', () => window.open(project.studioUrl, '_blank', 'noopener,noreferrer'));
    const openGift = button('Open Gift', 'text-button'); openGift.disabled = !project.giftUrl; openGift.addEventListener('click', () => project.giftUrl && window.open(project.giftUrl, '_blank', 'noopener,noreferrer'));
    const archive = button(project.status === 'archived' ? 'Restore' : 'Archive', 'text-button');
    archive.addEventListener('click', async () => {
      archive.disabled = true;
      try { await updateAdminProject(secret, project.projectId, project.status === 'archived' ? (project.publishedAt ? 'published' : 'draft') : 'archived'); await refresh(); }
      catch (error) { window.alert(message(error)); archive.disabled = false; }
    });
    const remove = button('Delete', 'text-button text-button--danger'); remove.addEventListener('click', () => deleteModal(project));
    actions.append(copyStudio, openStudio, openGift, archive, remove);
    card.append(head, meta, actions);
    return card;
  }

  function renderDashboard(): void {
    shell.replaceChildren();
    const header = el('header', 'admin-header');
    const title = el('div'); title.append(el('span', 'eyebrow', 'Generator & project manager'), el('h1', '', 'Sorry Letter Admin'), el('p', '', 'Buat Studio link, pantau status, dan kelola project tanpa menyentuh data gift secara manual.'));
    const controls = el('div', 'admin-header__actions');
    const logout = button('Keluar', 'ui-button ui-button--secondary');
    logout.addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); secret = ''; showLogin(); });
    const create = button('Generate Studio Link', 'ui-button'); create.addEventListener('click', () => void generate(create));
    controls.append(logout, create); header.append(title, controls); shell.append(header);

    const stats = el('section', 'admin-stats');
    const counts = { total: projects.length, draft: 0, published: 0, archived: 0 };
    projects.forEach((item) => { counts[item.status] += 1; });
    [['Total', counts.total], ['Draft', counts.draft], ['Published', counts.published], ['Archived', counts.archived]].forEach(([label, value]) => {
      const item = el('div'); item.append(el('span', '', String(value)), el('small', '', String(label))); stats.append(item);
    });
    shell.append(stats);

    const toolbar = el('section', 'admin-toolbar');
    const search = el('input', 'text-input'); search.type = 'search'; search.placeholder = 'Cari project ID, penerima, atau pengirim'; search.value = query;
    const filter = el('select', 'text-input');
    [['all', 'Semua status'], ['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']].forEach(([value, label]) => {
      const option = el('option', '', label); option.value = value; option.selected = value === statusFilter; filter.append(option);
    });
    search.addEventListener('input', () => { query = search.value; renderProjects(); });
    filter.addEventListener('change', () => { statusFilter = filter.value; renderProjects(); });
    toolbar.append(search, filter); shell.append(toolbar);
    const list = el('section', 'project-grid'); list.id = 'project-list'; shell.append(list); renderProjects();
  }

  function renderProjects(): void {
    const list = shell.querySelector<HTMLElement>('#project-list'); if (!list) return;
    list.replaceChildren();
    const needle = query.trim().toLowerCase();
    const visible = projects.filter((project) => (statusFilter === 'all' || project.status === statusFilter)
      && (!needle || [project.projectId, project.recipient, project.sender].some((value) => value.toLowerCase().includes(needle))));
    if (!visible.length) { const empty = el('div', 'empty-state'); empty.append(el('h2', '', 'Tidak ada project'), el('p', '', 'Ubah pencarian atau buat Studio link baru.')); list.append(empty); return; }
    visible.forEach((project) => list.append(projectCard(project)));
  }

  if (!secret) showLogin();
  else void listAdminProjects(secret).then((result) => { projects = result.projects; renderDashboard(); }).catch((error) => {
    if (error instanceof ApiError && error.status === 401) { sessionStorage.removeItem(SESSION_KEY); secret = ''; }
    showLogin(message(error));
  });
  return () => target.replaceChildren();
}
