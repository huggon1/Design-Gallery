import {exhibitById} from './catalog.mjs';

export const legacyGroups = {'product-launch':['gsap-framecheck-cards','seek-t-morph-reel']};

export function catalogUrl(query = '', tag = '') {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q',query.trim());
  if (tag.trim()) params.set('tag',tag.trim());
  return '#/' + (params.size ? '?' + params : '');
}
function listContext(from = '/') {
  try {
    const url = new URL(from,'https://gallery.local/');
    if (url.origin === 'https://gallery.local' && /^\/(?:all|web|video|game|mobile)?\/?$/.test(url.pathname)) {
      return catalogUrl(url.searchParams.get('q') ?? '',url.searchParams.get('tag') ?? '');
    }
  } catch {}
  return '#/';
}
export function exhibitUrl(id, from = '#/') {
  const params = new URLSearchParams();
  const back = listContext(from.replace(/^#/,''));
  if (back !== '#/') params.set('from',back.slice(1));
  return '#/exhibit/' + encodeURIComponent(id) + (params.size ? '?' + params : '');
}
export function resolveRoute(hash = '#/') {
  const raw = hash.replace(/^#/,'') || '/';
  let path,params;
  try {
    const url = new URL(raw.startsWith('/') ? raw : '/' + raw,'https://gallery.local/');
    path = decodeURIComponent(url.pathname);
    params = url.searchParams;
  } catch { return {kind:'missing',url:hash}; }
  if (/^\/(?:all|web|video|game|mobile)?\/?$/.test(path) || /^\/room\/(?:visual|feedback)$/.test(path)) {
    const query = (params.get('q') ?? '').trim(), tag = (params.get('tag') ?? '').trim();
    return {kind:'catalog',query,tag,url:catalogUrl(query,tag)};
  }
  const oldTheme = path.match(/^\/(?:web|video|game|mobile)\/topic\/([^/]+)$/);
  let id = path.match(/^\/(?:exhibit|work)\/([^/]+)$/)?.[1];
  if (oldTheme) {
    const themeId = oldTheme[1], caseId = params.get('case');
    id = legacyGroups[themeId]
      ? (legacyGroups[themeId].includes(caseId) ? caseId : legacyGroups[themeId][0])
      : themeId;
  }
  if (!id && /^\/[^/]+$/.test(path)) id = path.slice(1);
  if (!exhibitById(id)) return {kind:'missing',url:hash};
  const back = listContext(params.get('from') ?? '/');
  return {kind:'exhibit',id,back,url:exhibitUrl(id,back)};
}
