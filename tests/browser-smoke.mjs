import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const candidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = candidates.find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run browser QA.');

const qaDirectory = join(tmpdir(), 'im-sorry-letter-template-qa');
mkdirSync(qaDirectory, { recursive: true });

const server = await preview({
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  logLevel: 'error',
});

const browser = await chromium.launch({ executablePath, headless: true });
const baseUrl = 'http://127.0.0.1:4174/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function activeScene(page) {
  return page.locator('.scene.is-active').getAttribute('data-scene');
}

async function clickAction(page, event) {
  await page.locator(`.scene.is-active [data-event="${event}"]`).click();
  await page.waitForTimeout(540);
}

try {
  const browserViewports = [
    { width: 320, height: 700, name: 'mobile-320' },
    { width: 390, height: 844, name: 'mobile-390' },
    { width: 428, height: 926, name: 'mobile-428' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 576, name: 'desktop-reference' },
    { width: 1440, height: 900, name: 'desktop-wide' },
  ];

  for (const viewport of browserViewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      appHeight: document.querySelector('#app')?.getBoundingClientRect().height ?? 0,
    }));
    assert(metrics.documentWidth <= metrics.viewport, `${viewport.name} has horizontal overflow.`);
    assert(metrics.appHeight >= viewport.height - 1, `${viewport.name} does not fill the viewport.`);
    await page.screenshot({ path: join(qaDirectory, `${viewport.name}-intro.png`) });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1024, height: 576 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  assert((await activeScene(page)) === 'intro', 'Gift must start at intro.');

  await clickAction(page, 'START');
  assert((await activeScene(page)) === 'envelope', 'Start must open the envelope scene.');
  await page.screenshot({ path: join(qaDirectory, 'desktop-envelope.png') });

  await clickAction(page, 'READ');
  assert((await activeScene(page)) === 'letter', 'Read must open the letter.');
  assert(await page.locator('audio').evaluate((audio) => Boolean(audio.currentSrc)), 'Configured audio should have a source.');
  assert(await page.locator('.scene--letter .character').count() === 0, 'Letter scene should not render a mascot.');
  await page.waitForTimeout(650);
  const firstParagraph = page.locator('.letter-card .js-letter-type').first();
  const partialLetter = await firstParagraph.textContent();
  const completeLetter = await firstParagraph.getAttribute('data-full-text');
  assert(Boolean(partialLetter && completeLetter && partialLetter.length < completeLetter.length), 'Letter should reveal progressively.');
  assert(!(await page.locator('.letter-continue').isVisible()), 'Continue must wait until the letter is revealed.');
  assert(await page.getByRole('button', { name: 'Skip' }).isVisible(), 'Letter must expose an explicit Skip control while typing.');
  await page.screenshot({ path: join(qaDirectory, 'desktop-letter.png') });
  await page.getByRole('button', { name: 'Skip' }).click();
  assert((await firstParagraph.textContent()) === completeLetter, 'Skip must reveal the complete message.');
  assert(await page.locator('.letter-continue').isVisible(), 'Continue must appear after the full letter is revealed.');
  const letterText = await page.locator('.letter-card').textContent();
  assert(!letterText.includes('Enggar Abi Z.'), 'Recipient identity must not be injected into the letter body.');
  assert(!letterText.includes('Risa Nazmeliani'), 'Sender identity must not be injected into the letter body.');

  await clickAction(page, 'CONTINUE');
  assert((await activeScene(page)) === 'question', 'Letter continue must open the decision.');
  assert(await page.locator('.scene--question .character__frame').count() === 2, 'Question should use two mascot frames.');
  await page.screenshot({ path: join(qaDirectory, 'desktop-question.png') });

  await clickAction(page, 'NEED_TIME');
  assert((await activeScene(page)) === 'needs-time', 'Need-more-time branch must open.');
  await page.screenshot({ path: join(qaDirectory, 'desktop-needs-time.png') });
  await clickAction(page, 'BACK');
  assert((await activeScene(page)) === 'question', 'Back must return to the originating decision.');

  await clickAction(page, 'ACCEPT');
  assert((await activeScene(page)) === 'accepted', 'Yes must open the accepted scene.');
  await page.screenshot({ path: join(qaDirectory, 'desktop-accepted.png') });
  await clickAction(page, 'CONTINUE');
  assert((await activeScene(page)) === 'promise', 'Accepted continue must open the promise.');
  await page.screenshot({ path: join(qaDirectory, 'desktop-promise.png') });
  await clickAction(page, 'BACK');
  assert((await activeScene(page)) === 'accepted', 'Promise back must follow navigation history.');
  await clickAction(page, 'CONTINUE');
  await clickAction(page, 'REPLAY');
  assert((await activeScene(page)) === 'intro', 'Replay must reset to intro.');
  await context.close();

  const earlyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const earlyPage = await earlyContext.newPage();
  await earlyPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await clickAction(earlyPage, 'START');
  await clickAction(earlyPage, 'NEED_TIME');
  await clickAction(earlyPage, 'BACK');
  assert((await activeScene(earlyPage)) === 'envelope', 'Early need-time Back must return to envelope.');
  await earlyContext.close();

  const mobileCharacterContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobileCharacterPage = await mobileCharacterContext.newPage();
  await mobileCharacterPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await clickAction(mobileCharacterPage, 'START');
  await clickAction(mobileCharacterPage, 'READ');
  const mobilePlayerBox = await mobileCharacterPage.locator('.music-player').boundingBox();
  assert(Boolean(mobilePlayerBox && mobilePlayerBox.width <= 350), 'Mobile player must fit the viewport.');
  await mobileCharacterPage.screenshot({ path: join(qaDirectory, 'mobile-390-letter.png') });
  await mobileCharacterPage.locator('.letter-card').click();
  await clickAction(mobileCharacterPage, 'CONTINUE');
  const mobileCharacterBox = await mobileCharacterPage.locator('.scene--question .character').boundingBox();
  assert(Boolean(mobileCharacterBox && mobileCharacterBox.width >= 165), 'Mobile mascot should remain visually prominent.');
  await mobileCharacterPage.screenshot({ path: join(qaDirectory, 'mobile-390-question.png') });
  await mobileCharacterContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await reducedPage.locator('[data-event="START"]').click();
  await reducedPage.waitForTimeout(50);
  assert((await activeScene(reducedPage)) === 'envelope', 'Reduced motion must navigate without delay.');
  await reducedContext.close();

  const dynamicId = 'sorry-0123456789abcdef';
  const dynamicProject = {
    schemaVersion: 1,
    projectId: dynamicId,
    status: 'draft',
    locale: 'id',
    mascotId: 'bunny',
    paletteId: 'burgundy',
    identity: { recipient: 'QA Recipient', sender: 'QA Sender' },
    intro: { title: "I'm Sorry, Love...", subtitle: 'A private test letter.' },
    letter: { heading: "I'm Sorry, Love...", paragraphs: ['First paragraph.', 'Second paragraph.'], signoff: 'With all my love' },
    music: { audioUrl: 'https://cdn.example.test/song.mp3', coverUrl: 'https://cdn.example.test/cover.webp', title: 'Our Song', artist: 'Our Artist' },
    question: { heading: 'Will you forgive me?' },
    endings: {
      accepted: { heading: 'Thank you!', body: 'Thank you for another chance.' },
      needTime: { heading: 'Take your time.', body: 'I will be here.', loveLine: 'I love you.' },
      promise: { heading: 'My promise', body: 'I will do better.' },
    },
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z',
    publishedAt: null,
  };
  let studioProject = structuredClone(dynamicProject);
  let autosaveCount = 0;
  let uploadAttempts = 0;
  const studioContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mockApi = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const cors = {
      'Access-Control-Allow-Origin': baseUrl.replace(/\/$/, ''),
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Secret, Idempotency-Key',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
    if (url.pathname === `/api/studio/${dynamicId}` && request.method() === 'GET') {
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ project: studioProject }) });
    }
    if (url.pathname === `/api/studio/${dynamicId}` && request.method() === 'PUT') {
      autosaveCount += 1;
      const body = request.postDataJSON();
      studioProject = { ...body.project, updatedAt: new Date().toISOString() };
      if (body.publish) studioProject = { ...studioProject, status: 'published', publishedAt: new Date().toISOString() };
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ project: studioProject, giftUrl: studioProject.publishedAt ? `${baseUrl}gift/${dynamicId}` : null }) });
    }
    if (url.pathname === '/api/upload' && request.method() === 'POST') {
      uploadAttempts += 1;
      if (uploadAttempts === 1) return route.fulfill({ status: 503, headers: cors, body: JSON.stringify({ error: 'Temporary upload failure' }) });
      return route.fulfill({ status: 201, headers: cors, body: JSON.stringify({ url: 'https://cdn.example.test/replaced.mp3', key: `sorry-letter/${dynamicId}/audio/test.mp3`, size: 16, contentType: 'audio/mpeg' }) });
    }
    if (url.pathname === '/api/admin/projects' && request.method() === 'GET') {
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ projects: [] }) });
    }
    if (url.pathname === '/api/admin/projects' && request.method() === 'POST') {
      return route.fulfill({ status: 201, headers: cors, body: JSON.stringify({ project: dynamicProject, editToken: 'test-token', studioUrl: `${baseUrl}studio/${dynamicId}#token=test-token`, giftUrl: null }) });
    }
    return route.fulfill({ status: 404, headers: cors, body: JSON.stringify({ error: 'Not mocked' }) });
  };
  await studioContext.route('**/api/**', mockApi);
  const missingTokenPage = await studioContext.newPage();
  await missingTokenPage.goto(`${baseUrl}studio/${dynamicId}`, { waitUntil: 'domcontentloaded' });
  assert(await missingTokenPage.getByText('Magic link belum tersimpan').isVisible(), 'Studio without a token must show a clear recovery state.');
  await missingTokenPage.close();
  const studioPage = await studioContext.newPage();
  await studioPage.goto(`${baseUrl}studio/${dynamicId}#token=test-token`, { waitUntil: 'domcontentloaded' });
  await studioPage.locator('.studio-panel').waitFor();
  assert((await studioPage.evaluate(() => location.hash)) === '', 'Studio must remove the token fragment from the address bar.');
  assert(await studioPage.evaluate((id) => localStorage.getItem(`sorry-letter:studio-token:${id}`), dynamicId) === 'test-token', 'Studio must persist the project-scoped token.');
  const languageSelect = studioPage.getByLabel('Bahasa gift');
  assert(await languageSelect.inputValue() === 'id', 'Studio language must default to Bahasa Indonesia.');
  await languageSelect.selectOption('en');
  assert(!(await studioPage.locator('.form-field__hint').allTextContents()).join(' ').includes('Dear'), 'Recipient helper text must not promise an injected greeting.');
  const recipientInput = studioPage.getByLabel(/Nama penerima/);
  await recipientInput.fill('Updated Recipient');
  await studioPage.waitForTimeout(900);
  assert(autosaveCount > 0, 'Studio must autosave after 700 ms.');
  await studioPage.getByRole('button', { name: 'Lihat live preview' }).click();
  assert((await activeScene(studioPage)) === 'intro', 'Identity preview must open directly at intro.');
  assert(await studioPage.locator('.studio-live-preview__tab').count() === 2, 'Identity preview must expose Intro and Letter tabs.');
  await studioPage.getByRole('button', { name: 'Tutup live preview' }).click();
  await studioPage.getByRole('button', { name: /Gaya/ }).click();
  await studioPage.getByRole('button', { name: /Brown Bear/ }).click();
  await studioPage.getByRole('button', { name: /Midnight/ }).click();
  assert(await studioPage.locator('.visual-choice.is-selected').innerText().then((value) => value.includes('Brown Bear')), 'Studio must switch mascot.');
  await studioPage.getByRole('button', { name: 'Lihat live preview' }).click();
  assert((await activeScene(studioPage)) === 'question', 'Style preview must open directly at the mascot question scene.');
  await studioPage.getByRole('button', { name: 'Tutup live preview' }).click();
  const studioMetrics = await studioPage.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert(studioMetrics.scrollWidth <= studioMetrics.width, 'Studio must not overflow horizontally on mobile.');
  await studioPage.screenshot({ path: join(qaDirectory, 'studio-mobile-style.png'), fullPage: true });
  await studioPage.getByRole('button', { name: /Surat & Jawaban/ }).click();
  await studioPage.getByRole('button', { name: 'Lihat live preview' }).click();
  const previewScenes = [
    ['Surat', 'letter'],
    ['Pertanyaan', 'question'],
    ['Diterima', 'accepted'],
    ['Butuh waktu', 'needs-time'],
    ['Janji', 'promise'],
  ];
  for (const [label, scene] of previewScenes) {
    await studioPage.locator('.studio-live-preview__tab', { hasText: label }).click();
    assert((await activeScene(studioPage)) === scene, `Letter preview tab ${label} must target ${scene}.`);
  }
  await studioPage.getByRole('button', { name: 'Tutup live preview' }).click();
  await studioPage.getByRole('button', { name: /Musik/ }).click();
  const catalogToggle = studioPage.getByRole('button', { name: /Katalog lagu/ });
  assert(await catalogToggle.getAttribute('aria-expanded') === 'false', 'Music catalog must start collapsed.');
  await catalogToggle.click();
  assert(await catalogToggle.getAttribute('aria-expanded') === 'true', 'Music catalog must expand on demand.');
  await studioPage.getByText('37 lagu tersedia. Dengarkan dulu sebelum memilih.').waitFor();
  await studioPage.getByLabel('Cari katalog').fill('Hindia');
  assert(await studioPage.locator('.catalog-track').count() > 0, 'Catalog search must find songs by artist.');
  await studioPage.locator('.catalog-track').first().getByRole('button', { name: 'Pilih lagu' }).click();
  assert(await studioPage.locator('.catalog-track.is-selected').count() === 1, 'Catalog selection must mark exactly one song as selected.');
  await studioPage.getByRole('button', { name: 'Lihat live preview' }).click();
  assert((await activeScene(studioPage)) === 'letter', 'Music preview must open directly at the letter player.');
  await studioPage.getByRole('button', { name: 'Tutup live preview' }).click();
  await studioPage.getByRole('tab', { name: 'Upload lagu sendiri' }).click();
  await studioPage.locator('input[accept*=".mp3"]').setInputFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('test-audio') });
  await studioPage.getByRole('button', { name: 'Coba lagi' }).waitFor();
  await studioPage.getByRole('button', { name: 'Coba lagi' }).click();
  await studioPage.waitForTimeout(450);
  assert(uploadAttempts === 2, 'Failed uploads must expose a working retry action.');
  await studioPage.getByRole('button', { name: /Preview & Publish/ }).click();
  await studioPage.getByRole('button', { name: 'Buka preview penuh' }).click();
  const previewMetrics = await studioPage.evaluate(() => {
    const modal = document.querySelector('.studio-live-preview');
    const device = document.querySelector('.studio-live-preview__device');
    const gift = document.querySelector('.studio-live-preview .gift-shell');
    const box = (node) => node ? { width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height } : null;
    return { modal: box(modal), device: box(device), gift: box(gift) };
  });
  assert(Boolean(previewMetrics.gift), 'Studio preview must use the shared gift renderer.');
  assert(previewMetrics.gift.width > 0 && previewMetrics.gift.height > 0, `Studio preview must be visible: ${JSON.stringify(previewMetrics)}`);
  assert((await activeScene(studioPage)) === 'intro', 'Full Studio preview must start at intro.');
  await studioPage.screenshot({ path: join(qaDirectory, 'studio-mobile-preview.png') });
  await studioPage.getByRole('button', { name: 'Tutup live preview' }).click();
  await studioPage.getByRole('button', { name: /Publish Gift/ }).click();
  await studioPage.waitForTimeout(120);
  assert(studioProject.status === 'published', 'Studio publish must send a publish request.');
  await studioPage.reload({ waitUntil: 'domcontentloaded' });
  await studioPage.locator('.studio-panel').waitFor();
  assert((await studioPage.evaluate(() => location.hash)) === '', 'Stored Studio token must work after reopening without a fragment.');
  await studioContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await adminContext.route('**/api/**', mockApi);
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${baseUrl}admin`, { waitUntil: 'domcontentloaded' });
  await adminPage.getByLabel('Admin secret').fill('test-admin');
  await adminPage.getByRole('button', { name: 'Masuk ke Admin' }).click();
  await adminPage.getByRole('button', { name: 'Generate Studio Link' }).waitFor();
  await adminPage.screenshot({ path: join(qaDirectory, 'admin-desktop.png'), fullPage: true });
  await adminPage.getByRole('button', { name: 'Generate Studio Link' }).click();
  await adminPage.getByRole('dialog').waitFor();
  assert(await adminPage.getByRole('dialog').isVisible(), 'Admin generator must show its result modal.');
  assert(await adminPage.getByRole('button', { name: 'Copy Gift Link' }).isDisabled(), 'Gift link must stay disabled before publish.');
  await adminContext.close();

} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
