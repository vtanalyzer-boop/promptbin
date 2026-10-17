import { $, $$, say, copy } from './pf.js';
(function () {

  /* ---------- tabs ---------- */
  var tabs = $$('.tab'), panels = $$('.panel');
  function openTab(id) {
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-t') === id); });
    panels.forEach(function (p) { p.hidden = p.id !== 'p-' + id; });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { openTab(t.getAttribute('data-t')); }); });
  var h = location.hash.slice(1);
  openTab(['gen', 'mod', 'edit', 'fix'].indexOf(h) > -1 ? h : 'gen');

  /* generic copy-from-element + send-to-input buttons */
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-cp]');
    if (c) {
      var el = $('#' + c.getAttribute('data-cp'));
      var v = (el.value !== undefined ? el.value : el.textContent).trim();
      if (!v) return say('Nothing to copy yet');
      copy(v).then(function () { say('Prompt copied'); });
    }
    var s = e.target.closest('[data-send]');
    if (s) {
      var from = $('#' + s.getAttribute('data-from')), to = s.getAttribute('data-send');
      var val = (from.value !== undefined ? from.value : from.textContent).trim();
      if (!val) return say('Nothing to send yet');
      $('#' + to).value = val;
      openTab(to.charAt(0) === 'm' ? 'mod' : to.charAt(0) === 'c' ? 'fix' : 'edit');
      say('Sent');
    }
  });

  /* ---------- generator ---------- */
  var OPT = {
    type: [
      ['Portrait glow-up', 'Edit my uploaded photo as a polished portrait: natural skin retouching, brighter eyes, clean flyaway hair and crisp details'],
      ['Couple photo', 'Edit my uploaded photo of a couple into a romantic, cinematic image while keeping both people clearly recognizable'],
      ['Background change', 'Edit my uploaded photo by replacing only the background, keeping the subject, edges and pose untouched'],
      ['Style transfer', 'Redraw my uploaded photo in a new artistic style while keeping the pose, outfit and composition'],
      ['Text overlay', 'Edit my uploaded photo into a designed graphic with clean typography that never covers the face'],
      ['Object removal', 'Edit my uploaded photo by removing distracting people and objects, filling the gaps with natural, matching detail']
    ],
    style: ['photorealistic', 'cinematic 35mm film', 'hand-painted anime', 'vintage 90s disposable camera', 'editorial magazine', 'soft watercolor', 'moody black and white', 'glossy 3D collectible figure'],
    light: ['soft golden hour', 'neon night', 'bright studio softbox', 'overcast diffused', 'warm candlelight', 'dramatic side'],
    mood: ['romantic', 'confident', 'dreamy', 'playful', 'calm and minimal', 'bold and energetic'],
    color: ['warm orange and teal', 'muted pastel', 'rich saturated', 'cool blue', 'earthy neutral', 'high-contrast monochrome'],
    ratio: ['vertical 4:5 for Instagram', 'vertical 9:16 for Stories and Reels', 'square 1:1', 'horizontal 16:9']
  };
  function fill(id, list, pair) {
    var s = $('#' + id);
    list.forEach(function (o, i) {
      var op = document.createElement('option');
      op.value = pair ? i : o; op.textContent = pair ? o[0] : o;
      s.appendChild(op);
    });
  }
  fill('g-type', OPT.type, 1);
  ['style', 'light', 'mood', 'color', 'ratio'].forEach(function (k) { fill('g-' + k, OPT[k]); });

  function endDot(s) { s = s.trim(); return s && !/[.!?]$/.test(s) ? s + '.' : s; }

  function generate() {
    var t = OPT.type[$('#g-type').value][1];
    var scene = $('#g-scene').value.trim(), text = $('#g-text').value.trim();
    var parts = [endDot(t)];
    if (scene) parts.push('Setting: ' + endDot(scene));
    parts.push('Use a ' + $('#g-style').value + ' look with ' + $('#g-light').value + ' lighting and a ' + $('#g-mood').value + ' mood, in ' + $('#g-color').value + ' colors.');
    if (text) parts.push('Add the text "' + text + '" in clean, readable lettering that matches the style, placed so it does not cover any face.');
    parts.push('Keep the original faces, identity, skin tone and body proportions unchanged.');
    parts.push('Output as ' + $('#g-ratio').value + '.');
    $('#g-out').textContent = parts.join(' ');
  }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  $('#g-make').addEventListener('click', generate);
  $('#g-rand').addEventListener('click', function () {
    $('#g-type').value = Math.floor(Math.random() * OPT.type.length);
    ['style', 'light', 'mood', 'color', 'ratio'].forEach(function (k) { $('#g-' + k).value = rnd(OPT[k]); });
    generate();
  });

  /* ---------- modifier ---------- */
  var FILLER = /\b(very|really|extremely|super|totally|absolutely|literally|just|quite|so|amazing|awesome|beautiful|stunning|perfect|best)\b\s*/gi;
  function tidy(s) {
    return s.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])(?=[^\s\d"')\]])/g, '$1 ').trim();
  }
  $('#m-apply').addEventListener('click', function () {
    var base = $('#m-in').value.trim();
    if (!base) return say('Paste a prompt first');
    var add = $$('#m-checks input:checked').map(function (c) { return endDot(c.value); });
    $('#m-out').textContent = tidy([endDot(base)].concat(add).join(' '));
  });
  $('#m-short').addEventListener('click', function () {
    var base = $('#m-in').value.trim();
    if (!base) return say('Paste a prompt first');
    $('#m-out').textContent = tidy(base.replace(FILLER, '').replace(/\b(\w+)(\s+\1\b)+/gi, '$1'));
  });

  /* ---------- editor ---------- */
  var ed = $('#e-in'), KEY = 'pf_saved', list = [];
  function load() { try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { list = []; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function count() {
    var v = ed.value.trim();
    $('#e-cnt').textContent = (v ? v.split(/\s+/).length : 0) + ' words, ' + ed.value.length + ' characters';
  }
  function render() {
    var ul = $('#e-list');
    ul.textContent = '';
    list.forEach(function (t, i) {
      var li = document.createElement('li'), sp = document.createElement('span');
      sp.textContent = t; sp.title = t;
      var a = document.createElement('button'), d = document.createElement('button');
      a.className = 'btn alt sm'; a.textContent = 'Load';
      d.className = 'btn alt sm'; d.textContent = 'Delete';
      a.onclick = function () { ed.value = t; count(); };
      d.onclick = function () { list.splice(i, 1); store(); render(); };
      li.appendChild(sp); li.appendChild(a); li.appendChild(d); ul.appendChild(li);
    });
    $('#e-none').hidden = list.length > 0;
  }
  ed.addEventListener('input', count);
  $('#e-save').addEventListener('click', function () {
    var v = ed.value.trim();
    if (!v) return say('Write a prompt first');
    list.unshift(v); list = list.slice(0, 30); store(); render(); say('Saved on this device');
  });
  $('#e-clear').addEventListener('click', function () { ed.value = ''; count(); ed.focus(); });
  $('#e-dl').addEventListener('click', function () {
    var v = ed.value.trim();
    if (!v) return say('Nothing to download');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([v], { type: 'text/plain' }));
    a.download = 'chatgpt-photo-prompt.txt';
    a.click(); URL.revokeObjectURL(a.href);
  });
  load(); render(); count();

  /* ---------- corrector ---------- */
  var TYPOS = {
    teh: 'the', adn: 'and', wiht: 'with', taht: 'that', recieve: 'receive', photoo: 'photo', fotos: 'photos', foto: 'photo',
    backgroud: 'background', bakground: 'background', backround: 'background', realastic: 'realistic', relistic: 'realistic', realisitc: 'realistic',
    ligting: 'lighting', lightning: 'lighting', cinamatic: 'cinematic', cinematc: 'cinematic', potrait: 'portrait', portriat: 'portrait',
    quailty: 'quality', qualtiy: 'quality', resoluton: 'resolution', skintone: 'skin tone', hairstyel: 'hairstyle', expresion: 'expression',
    dont: "don't", doesnt: "doesn't", cant: "can't", wont: "won't", im: "I'm", ive: "I've", ur: 'your', plz: 'please', pls: 'please',
    chatgpt: 'ChatGPT', openai: 'OpenAI', instagram: 'Instagram', couple: 'couple', ghibli: 'anime', insta: 'Instagram'
  };
  $('#c-run').addEventListener('click', function () {
    var s = $('#c-in').value;
    if (!s.trim()) return say('Paste a prompt first');
    var fixes = [], orig = s;
    s = s.replace(/\s+/g, ' ').trim();
    if (s !== orig.trim()) fixes.push('extra spaces');
    var n = 0;
    s = s.replace(/\b[A-Za-z']+\b/g, function (w) {
      var k = w.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(TYPOS, k) && TYPOS[k] !== w && k !== 'couple') { n++; return TYPOS[k]; }
      return w;
    });
    if (n) fixes.push(n + ' spelling/word fix' + (n > 1 ? 'es' : ''));
    var before = s;
    s = s.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
    if (s !== before) fixes.push('repeated words');
    before = s;
    s = s.replace(/\bi\b/g, 'I').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])(?=[A-Za-z])/g, '$1 ').replace(/([!?.,])\1+/g, '$1');
    if (s !== before) fixes.push('punctuation');
    var seen = {}, sents = s.match(/[^.!?]+[.!?]*/g) || [s], out = [], dup = 0;
    sents.forEach(function (t) {
      t = t.trim(); if (!t) return;
      var key = t.toLowerCase().replace(/[.!?]+$/, '');
      if (seen[key]) { dup++; return; }
      seen[key] = 1;
      t = t.charAt(0).toUpperCase() + t.slice(1);
      out.push(/[.!?]$/.test(t) ? t : t + '.');
    });
    if (dup) fixes.push(dup + ' duplicate sentence' + (dup > 1 ? 's' : ''));
    s = out.join(' ');
    if (s !== before && !dup) fixes.push('capital letters and full stops');
    if ($('#c-safe').checked && !/(unchanged|same face|keep (my|the|both|their|original))/i.test(s)) {
      s += ' Keep the original faces, identity and proportions unchanged.';
      fixes.push('added face-safety line');
    }
    $('#c-out').textContent = s;
    $('#c-fix').textContent = fixes.length ? 'Fixed: ' + fixes.join(', ') + '.' : 'No problems found. Your prompt already looks clean.';
  });
})();
