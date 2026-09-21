/* ZINA: progressively enhanced static content. No libraries or build step. */
(function () {
 'use strict';
 const root = document.documentElement;
 root.classList.add('js');
 const main = document.getElementById('main');
 const menu = document.getElementById('site-menu');
 const box = document.getElementById('lightbox');
 const metadata = JSON.parse(document.getElementById('page-meta').textContent);
 const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
 const reduce = () => root.dataset.motion === 'off' || motionMedia.matches;
 const imageEl = box.querySelector('.lightbox-image');
 const imageWrap = box.querySelector('.lightbox-image-wrap');
 const zoomButton = box.querySelector('.lightbox-zoom');
 let currentRoute = '';
 let linkNavigation = false;
 let activeButton = null;
 let slides = [];
 let slideIndex = 0;
 let revealObserver;
 let videoObserver;
 let toastTimer;
 let scrollPositions = new Map();
 let motion = 'on';
 try { motion = localStorage.getItem('zina-motion') || 'on'; } catch (_) {}
 root.dataset.motion = motion;
 function decode(text) { const t = document.createElement('textarea'); t.innerHTML = text; return t.value; }
 function hydrate(scope) {
  const inline = window.ZINA_INLINE;
  if (!inline) return;
  scope.querySelectorAll('img, video, source').forEach(el => {
   ['src', 'poster'].forEach(attr => { const v = el.getAttribute('data-' + attr) || el.getAttribute(attr); if (inline[v]) el.setAttribute(attr, inline[v]); });
   const set = el.getAttribute('srcset');
   if (set) { el.removeAttribute('srcset'); el.removeAttribute('sizes'); }
  });
  scope.querySelectorAll('video').forEach(video => video.load());

 }
 function refreshMotion() {
  const button = document.querySelector('.motion-toggle');
  const on = !reduce();
  button.setAttribute('aria-pressed', String(on));
  button.querySelector('span').textContent = on ? 'on' : 'off';
 }
 refreshMotion();
 document.querySelector('.motion-toggle').addEventListener('click', () => {
  root.dataset.motion = root.dataset.motion === 'off' ? 'on' : 'off';
  try { localStorage.setItem('zina-motion', root.dataset.motion); } catch (_) {}
  refreshMotion();
  if (motionMedia.matches && root.dataset.motion !== 'off') notify('Reduced motion is enabled on your device.');
 });
 if (motionMedia.addEventListener) motionMedia.addEventListener('change', refreshMotion);
 function notify(message) {
  const toast = document.querySelector('.toast');
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
 }
 function lock(on) { document.body.classList.toggle('locked', on); }
 function closeMenu() { if (menu.open) menu.close(); lock(false); document.querySelector('.menu-trigger').setAttribute('aria-expanded', 'false'); }
 document.querySelector('.menu-trigger').addEventListener('click', () => {
  hydrate(menu); menu.showModal(); lock(true); document.querySelector('.menu-trigger').setAttribute('aria-expanded', 'true');
 });
 menu.querySelector('.menu-close').addEventListener('click', closeMenu);
 menu.addEventListener('close', () => { lock(false); document.querySelector('.menu-trigger').setAttribute('aria-expanded', 'false'); });
 menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
 function pauseAll() { document.querySelectorAll('video').forEach(v => { if (!v.paused) v.pause(); }); }
 function initPage() {
  hydrate(main);
  if (revealObserver) revealObserver.disconnect();
  if (videoObserver) videoObserver.disconnect();
  const items = main.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
   revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
   }, {rootMargin:'0px 0px 20px 0px', threshold:0.025});
   items.forEach(el => revealObserver.observe(el));
   videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (!entry.isIntersecting && !entry.target.paused) entry.target.pause(); });
   }, {threshold:0});
  } else items.forEach(el => el.classList.add('is-visible'));
  main.querySelectorAll('video').forEach(video => {
   if (videoObserver) videoObserver.observe(video);
   const fig = video.closest('.film');
   const play = fig.querySelector('.film-play');
   // Keep native controls available after the first tap, including iOS fullscreen controls.
   video.controls = false;
   play.addEventListener('click', async () => {
    pauseAll(); video.controls = true;
    try { await video.play(); fig.dataset.started = 'true'; }
    catch (_) { video.controls = true; fig.dataset.started = 'true'; notify('Tap the video play control to start.'); }
   });
   video.addEventListener('play', () => { fig.dataset.started = 'true'; document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); }); });
  });
  main.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => openArtwork(button)));
  main.querySelectorAll('[data-copy-email]').forEach(button => button.addEventListener('click', copyEmail));
 }
 function routeName() { return (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0]; }
 function route(goTop = true) {
  let id = routeName();
  if (id === 'main') { main.focus({preventScroll:true}); window.scrollTo({top:0, behavior:reduce()?'instant':'smooth'}); return; }
  if (!document.getElementById('page-' + id)) id = 'home';
  if (id === currentRoute) { closeMenu(); if (goTop) window.scrollTo({top:0,behavior:reduce()?'instant':'smooth'}); return; }
  if (currentRoute) scrollPositions.set(currentRoute, window.scrollY);
  pauseAll(); closeMenu(); if (box.open) box.close();
  const template = document.getElementById('page-' + id);
  main.replaceChildren(template.content.cloneNode(true));
  currentRoute = id;
  document.body.className = 'page-' + id;
  document.title = metadata[id].title;
  document.querySelector('meta[name="description"]').content = metadata[id].description;
  document.querySelector('meta[property="og:title"]').content = metadata[id].title;
  document.querySelector('meta[property="og:description"]').content = metadata[id].description;
  const selected = ['her-own-voice','he-asked-me','urban-icons','saint'].includes(id) ? 'work' : ['gallery','playboy'].includes(id) ? 'journal' : id;
  document.querySelectorAll('[data-nav]').forEach(el => { if (el.dataset.nav === selected) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current'); });
  initPage();
  main.classList.remove('page-enter');
  void main.offsetWidth;
  main.classList.add('page-enter');
  window.scrollTo({top:goTop?0:(scrollPositions.get(id)||0),behavior:'instant'});
  requestAnimationFrame(() => { const h = main.querySelector('h1'); if (h) h.focus({preventScroll:true}); });
 }
 window.addEventListener('hashchange', () => { const top = linkNavigation; linkNavigation = false; route(top); });
 document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href === '#main') { e.preventDefault(); main.focus({preventScroll:true}); window.scrollTo({top:0,behavior:reduce()?'instant':'smooth'}); }
  else if (href.startsWith('#/')) {
   linkNavigation = true;
   if ((href.slice(2)||'home') === currentRoute) { e.preventDefault(); closeMenu(); window.scrollTo({top:0,behavior:reduce()?'instant':'smooth'}); }
  }
 });
 async function copyEmail() {
  const email = 'zinakazantseva@gmail.com';
  try {
   if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(email);
   else {
    const field = document.createElement('textarea'); field.value = email; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select();
    const ok = document.execCommand('copy'); field.remove(); if (!ok) throw new Error('Copy unavailable');
   }
   notify('Email copied.');
  } catch (_) { notify('Email: ' + email); }
 }
 function openArtwork(button) {
  slides = Array.from(main.querySelectorAll('[data-image]'));
  slideIndex = slides.indexOf(button); activeButton = button;
  updateArtwork(); box.showModal(); lock(true); pauseAll();
 }
 function updateArtwork() {
  const button = slides[slideIndex]; if (!button) return;
  imageEl.src = (window.ZINA_INLINE && window.ZINA_INLINE[button.dataset.image]) || button.dataset.image;
  imageEl.alt = decode(button.dataset.title);
  box.querySelector('#lightbox-title').textContent = decode(button.dataset.title);
  const edition = box.querySelector('.lightbox-edition');
  edition.textContent = button.dataset.edition || '';
  edition.hidden = !button.dataset.edition;
  const enquiry = box.querySelector('.lightbox-enquire');
  enquiry.hidden = !button.dataset.enquiry;
  if (button.dataset.enquiry) {
   const title = decode(button.dataset.enquiry);
   const details = button.dataset.format ? ' (' + button.dataset.format + ', limited edition)' : '';
   const request = button.dataset.format ? ' Please confirm availability, edition details and price.' : ' Please send me the available sizes, edition details and price.';
   enquiry.href = 'mailto:zinakazantseva@gmail.com?subject=' + encodeURIComponent('Artwork enquiry - ' + title) + '&body=' + encodeURIComponent('Hello Zina,\n\nI would like to enquire about ' + title + details + '.' + request + '\n\nThank you.');
  }
  box.querySelector('.lightbox-count').textContent = (slideIndex+1).toString().padStart(2,'0') + ' / ' + slides.length.toString().padStart(2,'0');
  box.querySelector('.lightbox-prev').disabled = slideIndex === 0;
  box.querySelector('.lightbox-next').disabled = slideIndex === slides.length-1;
  box.classList.remove('zoomed'); zoomButton.setAttribute('aria-pressed','false'); zoomButton.textContent = 'Zoom +';
  imageWrap.scrollTop = 0; imageWrap.scrollLeft = 0;
 }
 function changeSlide(delta) { const next = slideIndex + delta; if (next >= 0 && next < slides.length) { slideIndex = next; updateArtwork(); } }
 function closeArtwork() { box.close(); lock(false); if (activeButton && document.contains(activeButton)) activeButton.focus({preventScroll:true}); }
 box.querySelector('.lightbox-close').addEventListener('click', closeArtwork);
 box.addEventListener('close', () => { lock(false); });
 box.querySelector('.lightbox-prev').addEventListener('click', () => changeSlide(-1));
 box.querySelector('.lightbox-next').addEventListener('click', () => changeSlide(1));
 box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); changeSlide(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); changeSlide(1); } });
 zoomButton.addEventListener('click', () => { const yes = box.classList.toggle('zoomed'); zoomButton.setAttribute('aria-pressed',String(yes)); zoomButton.textContent = yes ? 'Fit image' : 'Zoom +'; });
 let touchX=0, touchY=0;
 imageWrap.addEventListener('touchstart', e => { if (e.touches.length === 1) { touchX=e.touches[0].clientX; touchY=e.touches[0].clientY; } }, {passive:true});
 imageWrap.addEventListener('touchend', e => { if (box.classList.contains('zoomed') || !e.changedTouches.length) return; const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY; if (Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.5) changeSlide(dx<0?1:-1); }, {passive:true});
 document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });
 hydrate(menu); route(true);
})();
