// Adventure Library v2 — catalog-driven, no API or shared login yet.
// Add an adventure in adventures.json; no HTML changes required.
const grid = document.getElementById('adventure-grid');
const count = document.getElementById('library-count');
const allowedThemes = new Set(['loki', 'sorcery', 'tech']);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function card(adventure) {
  const active = adventure.status === 'available';
  const theme = allowedThemes.has(adventure.theme) ? adventure.theme : 'sorcery';
  const article = el('article', `adventure-card ${theme}`);
  const art = el('div', `card-art ${theme}-art`);
  art.append(el('div', 'sigil', adventure.sigil || '✧'), el('div', 'art-glow'));
  art.append(el('span', `card-tag ${active ? 'available' : 'soon'}`, active ? '✦ READY TO PLAY' : 'COMING SOON'));
  const body = el('div', 'card-body');
  body.append(el('div', 'card-kicker', adventure.kicker), el('h3', '', adventure.title), el('p', '', adventure.description));
  const footer = el('div', 'card-footer');
  if (active && typeof adventure.url === 'string') {
    let safeUrl;
    try { safeUrl = new URL(adventure.url, window.location.href); } catch { safeUrl = null; }
    if (safeUrl && safeUrl.protocol === 'https:') {
      const link = el('a', 'button card-button', adventure.buttonText || 'Start adventure');
      link.href = safeUrl.href;
      link.append(el('span', '', '↗'));
      footer.append(link);
    } else {
      footer.append(el('span', 'coming-label', 'Adventure link unavailable'));
    }
  } else {
    footer.append(el('span', 'coming-label', adventure.comingText || 'A new world is taking shape'));
  }
  footer.append(el('span', 'card-symbol', adventure.symbol || '✧'));
  body.append(footer);
  article.append(art, body);
  return article;
}

async function loadAdventures() {
  try {
    const response = await fetch('./adventures.json', {cache:'no-cache'});
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.adventures)) throw new Error('Invalid catalog');
    const entries = data.adventures.filter(a => a && typeof a.title === 'string' && typeof a.description === 'string' && typeof a.kicker === 'string');
    if (!entries.length) throw new Error('Empty catalog');
    grid.replaceChildren(...entries.map(card));
    const available = entries.filter(a => a.status === 'available').length;
    count.textContent = `${String(available).padStart(2,'0')} ${available === 1 ? 'WORLD' : 'WORLDS'} OPEN · MORE TO COME`;
  } catch (error) {
    console.error('Adventure catalog:', error);
    grid.replaceChildren();
    const fallback = el('p', 'catalog-loading', 'The catalog could not be loaded. ');
    const link = el('a', '', 'Enter The Loki Paradox directly.');
    link.href = 'https://loki.pamsprogramming.com/';
    fallback.append(link);
    grid.append(fallback);
  }
}
loadAdventures();
