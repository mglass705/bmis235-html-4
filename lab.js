/*
  lab.js: the Fix-It Lab on lab.html
  Author: Matthew Glass (mglass2), BMIS 235 HTML-4
  Written by Claude Code (AI) at Matthew's direction. See README.md.

  How it works, in plain words:
  - Each repair has 4 steps: Spot it, Fix it, Why it works, Practice.
  - Answers are checked by acting out what a browser would do:
      * Paths: walk the project's folders one piece at a time, matching
        names EXACTLY (capital letters count, like on a real web server).
      * Jump links: compare the name after # with the id, exactly.
      * Stylesheet: the same path walk for the href, plus a check of the
        whole <link> line for the practice round.
  - Wrong answers get a specific reason, not just "incorrect."
  - Nothing is saved. Reload the page or press Reset to start over.
*/
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function code(s) { return '<code>' + esc(s) + '</code>'; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function isImage(name) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(name); }

  // How many single-letter edits turn a into b (used to spot typos).
  function lev(a, b) {
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /* ---------- Pretend project folders (match the real repo's names) ---------- */
  var FILES = {
    paths: ['index.html', 'ginseng.html', 'misogi.html', 'styles.css', 'img/home.png', 'img/ginseng.png', 'img/misogi.png'],
    practice: ['index.html', 'cxo.html', 'styles.css', 'img/home.png', 'img/cxo.png', 'img/CXO-Live.JPG'],
    css: ['index.html', 'ginseng.html', 'misogi.html', 'skai.html', 'cxo.html', 'styles.css', 'img/ginseng.png', 'img/skai.png']
  };
  var ROOT_NAME = 'bmis235-html-4';

  function buildTree(paths) {
    var root = { name: ROOT_NAME, type: 'dir', path: '', children: [], parent: null };
    paths.forEach(function (p) {
      var parts = p.split('/'), node = root;
      parts.forEach(function (part, i) {
        var child = node.children.filter(function (c) { return c.name === part; })[0];
        if (!child) {
          child = { name: part, type: i === parts.length - 1 ? 'file' : 'dir', path: parts.slice(0, i + 1).join('/'), children: [], parent: node };
          node.children.push(child);
        }
        node = child;
      });
    });
    return root;
  }
  var TREES = {};
  Object.keys(FILES).forEach(function (k) { TREES[k] = buildTree(FILES[k]); });

  function renderTree(container) {
    var key = container.getAttribute('data-tree');
    var here = container.getAttribute('data-here');
    var tree = TREES[key];
    container.innerHTML = '';
    var top = document.createElement('div');
    top.className = 'tree-item tree-dir';
    top.setAttribute('data-path', '');
    top.textContent = ROOT_NAME + '/';
    container.appendChild(top);
    container.appendChild(renderList(tree, here));
  }
  function renderList(node, here) {
    var ul = document.createElement('ul');
    var kids = node.children.slice().sort(function (a, b) {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1; // folders first, like GitHub
      return 0;
    });
    kids.forEach(function (c) {
      var li = document.createElement('li');
      var item = document.createElement('span');
      item.className = 'tree-item ' + (c.type === 'dir' ? 'tree-dir' : 'tree-file');
      item.setAttribute('data-path', c.path);
      item.textContent = c.name + (c.type === 'dir' ? '/' : '');
      li.appendChild(item);
      if (c.path === here) {
        var tag = document.createElement('span');
        tag.className = 'tree-here';
        tag.textContent = '← this page';
        li.appendChild(tag);
      }
      if (c.type === 'dir') li.appendChild(renderList(c, here));
      ul.appendChild(li);
    });
    return ul;
  }

  /* ---------- The path walker: does what the browser does ---------- */
  function folderLabel(node) { return node.path === '' ? code(ROOT_NAME + '/') + ' (the top folder)' : code(node.path + '/'); }

  function walkPath(treeKey, here, input) {
    var tree = TREES[treeKey];
    var v = String(input).trim(); // browsers ignore spaces at the very start and end
    var steps = [];
    function fail(reason, extra) {
      var r = { found: false, reason: reason, steps: steps };
      for (var k in extra) r[k] = extra[k];
      return r;
    }
    if (v === '') return fail('empty');
    if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.indexOf('//') === 0) return fail('full-url');
    if (v.indexOf('\\') !== -1) return fail('backslash');
    if (v.charAt(0) === '/') return fail('root-slash');

    var node = tree; // every page in these lessons lives in the top folder
    steps.push({ ok: true, path: '', text: 'Start in the folder ' + code(here) + ' is in: ' + code(ROOT_NAME + '/') });
    var parts = v.split('/');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i], last = i === parts.length - 1;
      if (part === '') {
        steps.push({ ok: false, path: node.path, text: last ? 'The path ends with a slash, so it points at a folder, not a file' : 'Two slashes in a row: an empty folder name' });
        return fail(last ? 'is-folder' : 'double-slash', { at: node });
      }
      if (part === '.') {
        steps.push({ ok: true, path: node.path, text: code('./') + ' means "this same folder," so stay put' });
        continue;
      }
      if (part === '..') {
        if (!node.parent) {
          steps.push({ ok: false, path: node.path, text: code('../') + ' says "go up one folder," but ' + code(here) + ' is already in the top folder' });
          return fail('above-root', { at: node });
        }
        node = node.parent;
        steps.push({ ok: true, path: node.path, text: code('../') + ' means "go up one folder"' });
        continue;
      }
      var exact = node.children.filter(function (c) { return c.name === part; })[0];
      if (exact) {
        if (!last && exact.type === 'file') {
          steps.push({ ok: false, path: exact.path, text: code(part) + ' is a file, so the browser can\'t open it like a folder' });
          return fail('file-as-folder', { at: node, part: part });
        }
        node = exact;
        steps.push({ ok: true, path: exact.path, text: exact.type === 'dir' ? 'Open the folder ' + code(part + '/') : 'Find the file ' + code(part) + '. Found it!' });
        continue;
      }
      // Not found. Work out the most useful reason.
      var lower = part.toLowerCase();
      var near = null, reason = last ? 'no-file' : 'no-folder';
      var sameCase = node.children.filter(function (c) { return c.name.toLowerCase() === lower; })[0];
      var trimmed = node.children.filter(function (c) { return c.name === part.replace(/\s+/g, ''); })[0];
      var stem = lower.replace(/\.[^.]*$/, '');
      var sameStem = last && node.children.filter(function (c) {
        return c.type === 'file' && c.name.toLowerCase().replace(/\.[^.]*$/, '') === stem;
      })[0];
      var close = node.children
        .map(function (c) { return { c: c, d: lev(c.name.toLowerCase(), lower) }; })
        .filter(function (x) { return x.d <= 2; })
        .sort(function (a, b) { return a.d - b.d; })[0];
      var deeper = null;
      if (last) {
        node.children.forEach(function (d) {
          if (d.type !== 'dir' || deeper) return;
          var f = d.children.filter(function (c) { return c.name.toLowerCase() === lower; })[0];
          if (f) deeper = f;
        });
      }
      if (sameCase) { reason = 'case'; near = sameCase; }
      else if (deeper) { reason = 'missing-folder'; near = deeper; }
      else if (trimmed && /\s/.test(part)) { reason = 'space'; near = trimmed; }
      else if (sameStem) { reason = 'extension'; near = sameStem; }
      else if (close) { reason = 'spelling'; near = close.c; }
      steps.push({
        ok: false, path: null, near: near ? near.path : null, // the folder itself was fine; the name inside it wasn't
        text: 'Look for ' + code(part) + ' in ' + folderLabel(node) + '. Not there' + (near && reason !== 'missing-folder' ? ' (but there is ' + code(near.name) + ')' : '')
      });
      return fail(reason, { at: node, part: part, near: near });
    }
    if (node.type === 'dir') {
      steps.push({ ok: false, path: node.path, text: code(node.name + '/') + ' is a folder, not a file' });
      return fail('is-folder', { at: node });
    }
    return { found: true, file: node.path, steps: steps };
  }

  // Turn a walk result into feedback a beginner can act on.
  // ctx: { attr: 'src' | 'href', here: 'index.html', what: 'picture' | 'stylesheet' }
  function pathFeedback(r, ctx) {
    var a = ctx.attr;
    var dirs = r.at ? r.at.children.filter(function (c) { return c.type === 'dir'; }).map(function (c) { return code(c.name + '/'); }) : [];
    switch (r.reason) {
      case 'empty':
        return bad('The ' + code(a) + ' is empty, so the browser has nothing to look for. Type the path to the file.');
      case 'quotes':
        return bad('Leave out the quote marks. They\'re already there around the box. Type only what goes between them.');
      case 'full-url':
        return close('That\'s a full web address. For files in your own project, use a short path that starts from this page\'s folder, like the rest of the site does. A full address also breaks if the site ever moves.', 'Not the habit to build.');
      case 'backslash':
        return bad('Web paths use forward slashes ' + code('/') + ', not backslashes ' + code('\\') + '. Backslashes are a Windows thing. Some browsers quietly fix them, but don\'t count on it.');
      case 'root-slash':
        return close('A path that starts with ' + code('/') + ' means "start at the very top of the website." On Cloudflare your site sits at the top, so this would work there. But on GitHub Pages your site lives inside a folder (' + code('/bmis235-html-4/') + '), so the same path would look in the wrong place. Drop the first ' + code('/') + ' so the path starts from this page\'s folder. That works everywhere.', 'Close, but risky.');
      case 'is-folder':
        return bad('That points at a folder, not a file. Add the file name after the folder and slash.');
      case 'double-slash':
        return bad('There are two slashes in a row. Each slash separates one folder from the next thing, so use just one.');
      case 'above-root':
        return bad(code('../') + ' means "go up one folder." ' + code(ctx.here) + ' is already in the top folder of the project, so there\'s nowhere to go up to. Drop the ' + code('../') + '.');
      case 'file-as-folder':
        return bad(code(r.part) + ' is a file, not a folder, so the browser can\'t look inside it. Check the slashes in your path.');
      case 'case':
        return close('There\'s no ' + code(r.part) + ' in ' + folderLabel(r.at) + ', but there is ' + code(r.near.name) + '. Same letters, different capitals. Web servers like Cloudflare and GitHub Pages treat capital and lowercase letters as different, so this counts as a different file. It might even work when you open the page on your own laptop, which is exactly why this bug often shows up only after you publish.', 'Close! Just the capitals.');
      case 'space':
        return bad('There\'s a space in the path. File names have to match exactly, and a space counts as a character. The file is ' + code(r.near.name) + '.');
      case 'extension':
        return bad('The file is named ' + code(r.near.name) + ', not ' + code(r.part) + '. The ending (' + code('.png') + ', ' + code('.jpg') + ', ' + code('.css') + ') is part of the name, so it has to match too, capitals included.');
      case 'spelling':
        return close('There\'s no file or folder named ' + code(r.part) + ' in ' + folderLabel(r.at) + '. Did you mean ' + code(r.near.name) + '? One letter off is enough to break the connection.', 'Almost. Check the spelling.');
      case 'missing-folder':
        return bad('The browser looked for ' + code(r.part) + ' right next to ' + code(ctx.here) + ', but the file is inside the ' + code(r.near.parent.name + '/') + ' folder. Put the folder name and a slash in front: ' + code(r.near.path) + '.' +
          (r.near.name !== r.part ? ' Watch the capitals too: the real file is ' + code(r.near.name) + ', not ' + code(r.part) + '.' : ''));
      case 'no-folder':
        return bad('There\'s no folder named ' + code(r.part) + ' here.' + (dirs.length ? ' The folder' + (dirs.length > 1 ? 's here are ' : ' here is ') + dirs.join(', ') + '.' : '') + ' Compare your path with the file list.');
      default:
        return bad('There\'s no file named ' + code(r.part || '') + ' in ' + (r.at ? folderLabel(r.at) : 'that folder') + '. Compare your path with the file list, letter by letter: folder, slash, name, extension.');
    }
  }
  function good(msg, title) { return { ok: true, kind: 'good', title: title || 'Fixed!', msg: msg }; }
  function close(msg, title) { return { ok: false, kind: 'close', title: title || 'Close!', msg: msg }; }
  function bad(msg, title) { return { ok: false, kind: 'bad', title: title || 'Not yet.', msg: msg }; }

  function hasQuotes(v) { return /["“”]/.test(v); }

  /* ---------- Feedback and the path-walk display ---------- */
  function showFeedback(el, r) {
    var icon = r.kind === 'good' ? '✓' : r.kind === 'close' ? '≈' : '✗';
    el.className = el.className.replace(/\s*is-\w+/g, '') + ' is-' + r.kind;
    el.innerHTML = '<p class="fb-title"><span aria-hidden="true">' + icon + '</span> ' + r.title + '</p><p>' + r.msg + '</p>';
  }
  function clearFeedback(el) {
    el.className = el.className.replace(/\s*is-\w+/g, '');
    el.innerHTML = '';
  }

  var walkRuns = {};
  function showWalk(treeEl, listEl, r) {
    var id = listEl.id;
    var run = (walkRuns[id] || 0) + 1;
    walkRuns[id] = run;
    $all('.tree-item', treeEl).forEach(function (n) { n.classList.remove('walk-ok', 'walk-fail', 'walk-near'); });
    listEl.innerHTML = '';
    var steps = r.steps.length ? r.steps : [{ ok: false, text: 'The browser can\'t follow this path. See the message for why.' }];
    (async function () {
      for (var i = 0; i < steps.length; i++) {
        if (walkRuns[id] !== run) return; // a newer check started; stop this one
        var s = steps[i];
        var li = document.createElement('li');
        li.className = s.ok ? 'ok' : 'fail';
        li.innerHTML = '<span class="walk-icon" aria-hidden="true">' + (s.ok ? '✓' : '✗') + '</span> ' + s.text;
        listEl.appendChild(li);
        if (typeof s.path === 'string') {
          var n = treeEl.querySelector('[data-path="' + s.path.replace(/"/g, '\\"') + '"]');
          if (n) n.classList.add(s.ok ? 'walk-ok' : 'walk-fail');
        }
        if (s.near) {
          var m = treeEl.querySelector('[data-path="' + s.near.replace(/"/g, '\\"') + '"]');
          if (m) m.classList.add('walk-near');
        }
        if (!reduceMotion && i < steps.length - 1) await sleep(380);
      }
    })();
  }
  function clearWalk(treeEl, listEl) {
    walkRuns[listEl.id] = (walkRuns[listEl.id] || 0) + 1;
    $all('.tree-item', treeEl).forEach(function (n) { n.classList.remove('walk-ok', 'walk-fail', 'walk-near'); });
    listEl.innerHTML = '';
  }

  /* ---------- Reusable pieces of the fake previews ---------- */
  function brokenImg(alt) {
    var s = document.createElement('span');
    s.className = 'broken-img';
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', 'Broken image. The browser is showing its alt text: ' + alt);
    s.innerHTML = '<span class="broken-icon" aria-hidden="true"></span>' + esc(alt);
    return s;
  }
  function realImg(src, alt) {
    var i = document.createElement('img');
    i.src = src; i.alt = alt; i.width = 165; i.height = 54;
    return i;
  }

  // Repair 01 preview: three menu buttons, the middle one is the one being fixed.
  function renderPathsPreview(el, file) {
    el.innerHTML = '';
    var nav = document.createElement('div');
    nav.className = 'mock-nav';
    nav.appendChild(realImg('img/home.png', 'Home'));
    nav.appendChild(file && isImage(file) ? realImg(file, 'Ginseng') : brokenImg('Ginseng'));
    nav.appendChild(realImg('img/misogi.png', 'MISOGI'));
    el.appendChild(nav);
  }

  // Repair 01 practice preview: a pretend photo (that file isn't really in the repo).
  function renderPracticePhoto(el, file) {
    el.innerHTML = '';
    if (file === 'img/CXO-Live.JPG') {
      var ph = document.createElement('div');
      ph.className = 'mock-photo';
      ph.setAttribute('role', 'img');
      ph.setAttribute('aria-label', 'Simulated photo: CXO performing live');
      ph.innerHTML = '<span>CXO / LIVE</span><small>img/CXO-Live.JPG loaded</small>';
      el.appendChild(ph);
    } else if (file && isImage(file)) {
      el.appendChild(realImg(file, 'CXO performing live'));
    } else {
      el.appendChild(brokenImg('CXO performing live'));
    }
  }

  // Repair 02 preview: a scrolling mini version of the Ginseng page.
  function renderJumpPage(el, noteEl, getApplied) {
    el.innerHTML =
      '<div class="mock-page">' +
      '<p class="mock-eyebrow">PRODUCER PROFILE / NOT A RANKING</p>' +
      '<p class="mock-h1">Ginseng</p>' +
      '<p><a class="mock-jump" href="#">↓ Jump to the five tracks</a></p>' +
      '<p>Ginseng (also stylized as Gin$eng) is the stage name of Christian Baello, a California-based producer, songwriter, and multi-instrumentalist.</p>' +
      '<p class="mock-h2">What to listen for</p>' +
      '<p>High-pitched, glitched-out vocal and synth textures, hyper-compressed "crushing" 808s, and pitched-up producer tags.</p>' +
      '<p class="mock-h2">Favorite production moments</p>' +
      '<p>"ENJOY YOUR LIFE" by Che and "Bbyangl" by Prettifun, for now. It changes every time he drops a new beat.</p>' +
      '<div class="mock-target">' +
      '<p class="mock-h2">Five tracks to know</p>' +
      '<ol><li>ENJOY YOUR LIFE · Che</li><li>BRUSH YO TEETH · Che</li><li>WHITEHORSEMANNEQUIN · Lucy Bedroque</li><li>EARDRUMMER · Che</li><li>Bbyangl · Prettifun</li></ol>' +
      '</div></div>';
    var link = $('.mock-jump', el);
    var target = $('.mock-target', el);
    function syncHref() {
      var a = getApplied();
      // Show the real href on hover, but never let a typed value run as code.
      link.setAttribute('href', /^\s*javascript:/i.test(a.href) ? '#' : a.href);
    }
    syncHref();
    link.addEventListener('click', function (e) {
      e.preventDefault(); // keep the real lab page from jumping; we act it out instead
      var a = getApplied();
      var r = jumpResult(a.href, a.id);
      if (r.jumps) {
        el.scrollTo({ top: target.offsetTop - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
        target.classList.remove('flash');
        void target.offsetWidth;
        target.classList.add('flash');
      } else if (r.top) {
        el.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      showFeedback(noteEl, { kind: r.jumps ? 'good' : 'bad', title: r.jumps ? 'Jumped!' : 'You clicked the link.', msg: r.say });
    });
    el._sync = syncHref;
    el._reset = function () { el.scrollTop = 0; clearFeedback(noteEl); syncHref(); };
  }

  // What would a real browser do with this href and id?
  function jumpResult(href, id) {
    var h = String(href).trim();
    var hashAt = h.indexOf('#');
    if (h === '') return { jumps: false, say: 'The href is empty, so the link doesn\'t point anywhere useful. Nothing to jump to.' };
    if (hashAt === -1) return { jumps: false, say: 'With no ' + code('#') + ', the browser tries to open a page called ' + code(h) + '. That page doesn\'t exist, so on a real site you\'d land on a 404 "page not found" error.' };
    var page = h.slice(0, hashAt), frag = h.slice(hashAt + 1);
    if (page && page !== 'ginseng.html') return { jumps: false, say: 'The browser leaves this page and opens ' + code(page) + ', which isn\'t where the tracks are.' };
    if (frag === '') return { jumps: false, top: true, say: 'A ' + code('#') + ' with no name after it jumps to the top of the page, not to the tracks.' };
    if (frag === id && !/\s/.test(id)) return { jumps: true, say: 'The browser found the element with ' + code('id="' + id + '"') + ' and scrolled to it.' };
    return { jumps: false, say: 'Nothing happened. The browser looked for an element with ' + code('id="' + frag + '"') + ', didn\'t find one, and stayed put. No error message. That\'s what makes this bug sneaky.' };
  }

  // Feedback for a jump link fix. idEditable = false for the practice round.
  function checkJump(href, id, idEditable) {
    var h = String(href).trim();
    if (hasQuotes(h) || hasQuotes(id)) return pathFeedback({ reason: 'quotes' }, { attr: 'href' });
    if (h === '') return bad('The ' + code('href') + ' is empty. A jump link needs ' + code('#') + ' plus the id\'s name.');
    if (idEditable) {
      if (id === '') return bad('The ' + code('id') + ' is empty, so there\'s nothing on the page to jump to.');
      if (/\s/.test(id)) return bad('An id can\'t contain spaces. Use a dash instead, like ' + code('five-tracks') + '.');
      if (id.charAt(0) === '#') return bad('Leave the ' + code('#') + ' off the id. The ' + code('#') + ' only goes in the link, as in ' + code('href="#tracks"') + '. The id is just the name: ' + code('id="tracks"') + '.');
    }
    var hashAt = h.indexOf('#');
    if (hashAt === -1) {
      return bad('Without a ' + code('#') + ', the browser reads ' + code(h) + ' as the name of another page and tries to open it. That page doesn\'t exist, so you\'d get a "page not found" error. The ' + code('#') + ' is what means "a spot on this page."');
    }
    var page = h.slice(0, hashAt), frag = h.slice(hashAt + 1);
    if (page && page !== 'ginseng.html') return bad('That would open ' + code(page) + ' and look for the spot there. This section is on the same page, so you only need the part that starts with ' + code('#') + '.');
    if (frag.charAt(0) === '#') return bad('There\'s an extra ' + code('#') + '. Use just one, right before the name.');
    if (frag === '') return bad('A ' + code('#') + ' with nothing after it jumps to the top of the page. Add the id\'s name right after the ' + code('#') + '.');
    if (/\s/.test(frag)) return bad('There\'s a space in the name after ' + code('#') + '. Ids can\'t have spaces, so the link can\'t either. Check the spelling of the id.');
    if (frag === id) {
      var notes = [];
      if (page) notes.push(code(h) + ' works because it points at this same page, but on the same page ' + code('#' + frag) + ' alone is simpler.');
      if (id !== id.toLowerCase()) notes.push('Both halves now say ' + code(id) + ', so it works. Most people keep ids all lowercase, so there\'s less to remember.');
      return good('The name after ' + code('#') + ' matches the id exactly: ' + code('#' + frag) + ' → ' + code('id="' + id + '"') + '. ' + notes.join(' '));
    }
    if (frag.toLowerCase() === id.toLowerCase()) {
      return close('Same word, different capitals: the link says ' + code(frag) + ' and the id says ' + code(id) + '. Jump links match exactly, so the browser treats these as two different names.', 'Close! Just the capitals.');
    }
    if (lev(frag.toLowerCase(), id.toLowerCase()) <= 2) {
      return close('The link says ' + code(frag) + ' but the id says ' + code(id) + '. One or two letters off is enough to break it.', 'Almost. Check the spelling.');
    }
    return bad('The link and the id don\'t match. The link says ' + code(frag) + ' and the id says ' + code(id) + '. They need to be the exact same name.');
  }

  // Repair 03 preview: little thumbnails of four pages sharing styles.css.
  var PAGES = [
    { file: 'index.html', title: 'Behind the Sound' },
    { file: 'ginseng.html', title: 'Ginseng' },
    { file: 'misogi.html', title: 'MISOGI' },
    { file: 'skai.html', title: 'Skai' }
  ];
  function renderMiniSite(el, plainFiles, pages) {
    el.innerHTML = '';
    (pages || PAGES).forEach(function (p) {
      var plain = plainFiles.indexOf(p.file) !== -1;
      var card = document.createElement('div');
      card.className = 'mini-page' + (plain ? '' : ' styled');
      card.innerHTML =
        '<div class="mini-tab">' + esc(p.file) + ' <span class="mini-state">' + (plain ? 'no styles loaded' : 'styled') + '</span></div>' +
        '<div class="mini-view" aria-hidden="true"><p class="mini-h1">' + esc(p.title) + '</p>' +
        '<p class="mini-text">Five underground producers. No ranking.</p>' +
        '<span class="mini-link">Back to the archive</span></div>';
      el.appendChild(card);
    });
  }

  // Practice for Repair 03: check a whole <link> line typed from memory.
  function checkLinkLine(v) {
    var s = String(v).trim();
    if (s === '') return bad('The box is empty. Type the whole line, starting with ' + code('<link') + '.');
    if (s.charAt(0) !== '<') return bad('HTML tags start with ' + code('<') + '. Start the line with ' + code('<link') + '.');
    var m = s.match(/^<\s*([a-zA-Z]+)/);
    var tag = m ? m[1].toLowerCase() : '';
    if (tag === 'style') return bad(code('<style>') + ' is for writing CSS directly inside the page. To connect a separate .css file, use ' + code('<link>') + '.');
    if (tag === 'a') return bad(code('<a>') + ' makes a clickable link for people. To connect a stylesheet, use ' + code('<link>') + ', which the browser reads behind the scenes. Nobody sees it on the page.');
    if (tag === 'script') return bad(code('<script>') + ' loads JavaScript, not CSS. Use ' + code('<link>') + '.');
    if (tag !== 'link') return bad('Start the line with ' + code('<link') + '. That\'s the tag that connects a page to a stylesheet.');
    if ((s.match(/"/g) || []).length % 2 === 1 || (s.match(/'/g) || []).length % 2 === 1) {
      return bad('One of your quotes isn\'t closed. Each value needs a quote at the start and the end, like ' + code('"styles.css"') + '.');
    }
    if (s.charAt(s.length - 1) !== '>') return bad('Close the tag with ' + code('>') + ' at the end.');
    var doc = new DOMParser().parseFromString('<!doctype html><html><head>' + s + '</head></html>', 'text/html');
    var el = doc.querySelector('link');
    if (!el) return bad('The browser couldn\'t read that as a ' + code('<link>') + ' tag. Compare it with the line in Repair 03.');
    if (!el.hasAttribute('href') && el.hasAttribute('src')) return bad(code('<link>') + ' uses ' + code('href') + ' for the file, not ' + code('src') + '. (' + code('src') + ' is what ' + code('<img>') + ' uses. Easy mix-up.)');
    if (!el.hasAttribute('rel')) return bad('Missing ' + code('rel="stylesheet"') + '. Without it, the browser sees a link to a file but doesn\'t know to use it as CSS, so the page stays plain.');
    var rels = el.getAttribute('rel').toLowerCase().split(/\s+/);
    if (rels.indexOf('stylesheet') === -1) return bad(code('rel="' + el.getAttribute('rel') + '"') + ' isn\'t something the browser knows. For CSS it has to be ' + code('rel="stylesheet"') + ' (one word).');
    if (!el.hasAttribute('href')) return bad('Missing ' + code('href') + '. That\'s the part that says which file to load, like ' + code('href="styles.css"') + '.');
    var r = walkPath('css', 'cxo.html', el.getAttribute('href'));
    if (!r.found) return pathFeedback(r, { attr: 'href', here: 'cxo.html' });
    if (r.file !== 'styles.css') return bad('That ' + code('href') + ' points at ' + code(r.file) + ', which isn\'t the stylesheet. It needs to point at ' + code('styles.css') + '.');
    var extra = /<\/link>/i.test(s) ? ' One small thing: you don\'t need ' + code('</link>') + '. A link tag has nothing inside it, so it doesn\'t get a closing tag.' : '';
    return good('That\'s the line. The order of ' + code('rel') + ' and ' + code('href') + ' doesn\'t matter, and the browser is fine with "double" or \'single\' quotes.' + extra, 'Correct!');
  }

  /* ---------- Generic "fix it" task: check, hints, answer, reset ---------- */
  function setupTask(formId, cfg) {
    var form = document.getElementById(formId);
    var fb = $('.lab-feedback', form);
    var hintsBox = $('.lab-hints', form);
    var hintBtn = $('[data-action="hint"]', form);
    var ansBtn = $('[data-action="answer"]', form);
    var resetBtn = $('[data-action="reset"]', form);
    var inputs = $all('.lab-input', form);
    var attempts = 0, hintCount = 0;

    function fit(input) {
      var min = input.classList.contains('wide') ? 30 : 8;
      input.size = Math.max(min, input.value.length + 1, (input.placeholder || '').length + 1);
    }
    inputs.forEach(function (i) { fit(i); i.addEventListener('input', function () { fit(i); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      attempts++;
      var r = cfg.check();
      showFeedback(fb, r);
      if (r.ok) { if (cfg.onSuccess) cfg.onSuccess(r); }
      else if (attempts >= 3) ansBtn.hidden = false; // never leave anyone stuck
    });
    hintBtn.addEventListener('click', function () {
      if (hintCount < cfg.hints.length) {
        var p = document.createElement('p');
        p.className = 'lab-hint';
        p.innerHTML = '<strong>Hint ' + (hintCount + 1) + ' of ' + cfg.hints.length + ':</strong> ' + cfg.hints[hintCount];
        hintsBox.appendChild(p);
        hintCount++;
      }
      if (hintCount >= cfg.hints.length) {
        hintBtn.disabled = true;
        hintBtn.textContent = 'No more hints';
        ansBtn.hidden = false;
      }
    });
    ansBtn.addEventListener('click', function () {
      cfg.fill();
      inputs.forEach(fit);
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    function reset() {
      inputs.forEach(function (i) { i.value = i.getAttribute('data-broken') || ''; fit(i); });
      clearFeedback(fb);
      hintsBox.innerHTML = '';
      hintBtn.disabled = false;
      hintBtn.textContent = 'Get a hint';
      ansBtn.hidden = true;
      attempts = 0; hintCount = 0;
      if (cfg.onReset) cfg.onReset();
    }
    resetBtn.addEventListener('click', function () { reset(); inputs[0].focus(); });
    return { reset: reset };
  }

  /* ---------- Progress tracker ---------- */
  var state = { paths: {}, jump: {}, css: {} };
  function updateProgress() {
    var n = 0;
    Object.keys(state).forEach(function (k) {
      var s = state[k];
      if (s.fixed) n++;
      var el = $('[data-status-for="' + k + '"]');
      el.textContent = s.fixed ? (s.practiced ? 'Fixed + practiced' : 'Fixed') : 'Not fixed yet';
      el.setAttribute('data-state', s.fixed ? (s.practiced ? 'done' : 'fixed') : 'todo');
    });
    $('#lab-count').textContent = n;
  }

  /* ---------- "Spot it" multiple choice ---------- */
  var SPOT = {
    paths: {
      right: 'b',
      a: 'Not quite. Alt text is the backup words the browser shows when an image can\'t load. It doesn\'t help find the file, and ' + code('alt="Ginseng"') + ' is fine. Seeing it is actually a clue: the picture didn\'t load.',
      b: 'Yes. Compare the ' + code('src') + ' in the code with the file list on the right, one letter at a time. Step 2 is open below.',
      c: 'Nope. Images can live in any folder. The ' + code('src') + ' just has to give the right directions. The Home and MISOGI buttons live in ' + code('img/') + ' too, and they load fine.'
    },
    jump: {
      right: 'b',
      a: 'It\'s the opposite: a link that starts with ' + code('#') + ' jumps to a spot on the same page. (To jump to a spot on a different page, you\'d write the page first, like ' + code('ginseng.html#tracks') + '.)',
      b: 'Yes. Look closely at the name after the ' + code('#') + ' and the id. Step 2 is open below.',
      c: 'Nope. Any element with an id can be the target: a section, a heading, a div. Only the thing you click has to be a link.'
    },
    css: {
      right: 'b',
      a: 'Content doesn\'t decide the look. These pages use the same kinds of tags. The look comes from the stylesheet, so the real question is whether skai.html is actually connected to it.',
      b: 'Yes. Compare skai.html\'s line with ginseng.html\'s, letter by letter. Step 2 is open below.',
      c: 'There\'s no limit like that. A stylesheet doesn\'t know how many pages use it. Every page that links to it gets the styles. This real site uses one styles.css for seven pages.'
    }
  };
  function setupSpot(lessonEl, key, onRight) {
    var fs = $('.lab-spot', lessonEl);
    var fb = fs.nextElementSibling;
    var btns = $all('.lab-choice', fs);
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-choice');
        var right = c === SPOT[key].right;
        b.setAttribute('aria-pressed', 'true');
        b.classList.add(right ? 'is-right' : 'is-wrong');
        showFeedback(fb, right ? { kind: 'good', title: 'Spotted it.', msg: SPOT[key][c] } : { kind: 'bad', title: 'Not that one.', msg: SPOT[key][c] + ' Try another answer.' });
        if (right) onRight();
      });
    });
    return function reset() {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-right', 'is-wrong'); });
      clearFeedback(fb);
    };
  }

  function show(lessonEl, step) { var s = $('[data-step="' + step + '"]', lessonEl); if (s) s.hidden = false; }
  function hideSteps(lessonEl) { $all('[data-step]', lessonEl).forEach(function (s) { s.hidden = true; }); }

  /* ======================= Build the lessons ======================= */
  $all('.file-tree').forEach(renderTree);
  var lessons = {};

  /* ---- Repair 01: image paths ---- */
  (function () {
    var L = $('#repair-paths');
    var srcIn = $('#paths-src');
    var practiceIn = $('#paths-practice-src');
    var yourPrev = $('#paths-your-preview');
    var tree = $('#paths-walk-tree'), walk = $('#paths-walk');
    renderPathsPreview($('#paths-broken-preview'), null);
    renderPathsPreview(yourPrev, null);
    renderPracticePhoto($('#paths-practice-preview'), null);

    var resetSpot = setupSpot(L, 'paths', function () { show(L, 'fix'); });

    var fix = setupTask('paths-fix', {
      hints: [
        'Look at the file list. How is the picture\'s name spelled, letter by letter, including capitals?',
        'Keep the ' + code('img/') + ' part. Only one letter needs to change: the capital ' + code('G') + '.'
      ],
      fill: function () { srcIn.value = 'img/ginseng.png'; },
      check: function () {
        var v = srcIn.value;
        if (hasQuotes(v)) return pathFeedback({ reason: 'quotes' }, { attr: 'src' });
        var r = walkPath('paths', 'index.html', v);
        showWalk(tree, walk, r);
        renderPathsPreview(yourPrev, r.found ? r.file : null);
        if (!r.found) return pathFeedback(r, { attr: 'src', here: 'index.html' });
        if (r.file === 'img/ginseng.png') {
          $('#paths-after-src').textContent = v.trim();
          var dot = /^\.\//.test(v.trim()) ? ' (' + code('./') + ' at the start means "this same folder." It works, but most people leave it off.)' : '';
          return good('The browser opened ' + code('img/') + ' and found ' + code('ginseng.png') + ', matching every letter. The button is back.' + dot + ' Scroll down for why it works.');
        }
        if (isImage(r.file)) return bad('That file exists, so a picture loads in your version, but it\'s ' + code(r.file) + ', not Ginseng\'s button. The path has to lead to the right file, not just any file.');
        return bad(code(r.file) + ' isn\'t a picture, so the browser still can\'t show an image. Point the ' + code('src') + ' at the Ginseng picture in ' + code('img/') + '.');
      },
      onSuccess: function () {
        state.paths.fixed = true; updateProgress();
        show(L, 'why'); show(L, 'practice');
      },
      onReset: function () { renderPathsPreview(yourPrev, null); clearWalk(tree, walk); }
    });

    var practice = setupTask('paths-practice', {
      hints: [
        'Copy the file name exactly as it appears in the file list, capitals and all.',
        'It\'s inside ' + code('img') + ', so start with ' + code('img/') + '. Then the name, with ' + code('.JPG') + ' in capitals.'
      ],
      fill: function () { practiceIn.value = 'img/CXO-Live.JPG'; },
      check: function () {
        var v = practiceIn.value;
        if (hasQuotes(v)) return pathFeedback({ reason: 'quotes' }, { attr: 'src' });
        var r = walkPath('practice', 'index.html', v);
        var pt = $('#paths-practice-tree');
        $all('.tree-item', pt).forEach(function (n) { n.classList.remove('walk-ok', 'walk-fail', 'walk-near'); });
        r.steps.forEach(function (s) {
          var n = typeof s.path === 'string' && pt.querySelector('[data-path="' + s.path + '"]');
          if (n) n.classList.add(s.ok ? 'walk-ok' : 'walk-fail');
          var m = s.near && pt.querySelector('[data-path="' + s.near + '"]');
          if (m) m.classList.add('walk-near');
        });
        renderPracticePhoto($('#paths-practice-preview'), r.found ? r.file : null);
        if (!r.found) return pathFeedback(r, { attr: 'src', here: 'index.html' });
        if (r.file === 'img/CXO-Live.JPG') {
          return good('You matched the real name exactly, capitals and all, even the ' + code('.JPG') + '. Even better habit for next time: rename the file to all lowercase (' + code('cxo-live.jpg') + ') before uploading, so you never have to remember the capitals.', 'Nailed it.');
        }
        if (isImage(r.file)) return bad('That\'s ' + code(r.file) + ', the CXO menu button, not the live photo. Find the photo in the file list.');
        return bad(code(r.file) + ' isn\'t a picture. Find the photo in the file list.');
      },
      onSuccess: function () { state.paths.practiced = true; updateProgress(); },
      onReset: function () {
        renderPracticePhoto($('#paths-practice-preview'), null);
        $all('.tree-item', $('#paths-practice-tree')).forEach(function (n) { n.classList.remove('walk-ok', 'walk-fail', 'walk-near'); });
      }
    });

    lessons.paths = function () {
      resetSpot(); fix.reset(); practice.reset(); hideSteps(L);
      $('#paths-after-src').textContent = 'img/ginseng.png';
      state.paths = {}; updateProgress();
    };
  })();

  /* ---- Repair 02: jump links ---- */
  (function () {
    var L = $('#repair-jump');
    var hrefIn = $('#jump-href'), idIn = $('#jump-id'), practiceIn = $('#jump-practice-href');
    var BROKEN = { href: '#Tracks', id: 'tracks' };
    var applied = { href: BROKEN.href, id: BROKEN.id };
    renderJumpPage($('#jump-broken-preview'), $('#jump-broken-note'), function () { return BROKEN; });
    var yourPrev = $('#jump-your-preview');
    renderJumpPage(yourPrev, $('#jump-your-note'), function () { return applied; });

    var resetSpot = setupSpot(L, 'jump', function () { show(L, 'fix'); });

    var fix = setupTask('jump-fix', {
      hints: [
        'Compare the name after ' + code('#') + ' in the link with the id. Do they match letter for letter?',
        'Change the link to ' + code('#tracks') + ' (lowercase t), or change the id to match the link. Either works, as long as both halves match.'
      ],
      fill: function () { hrefIn.value = '#tracks'; idIn.value = 'tracks'; },
      check: function () {
        applied = { href: hrefIn.value, id: idIn.value };
        yourPrev._reset();
        var r = checkJump(hrefIn.value, idIn.value, true);
        if (r.ok) r.msg += ' Now click the link in your version to watch it jump.';
        return r;
      },
      onSuccess: function () {
        state.jump.fixed = true; updateProgress();
        $('#jump-after-code').textContent = 'href="' + hrefIn.value.trim() + '" and id="' + idIn.value + '"';
        show(L, 'why'); show(L, 'practice');
      },
      onReset: function () { applied = { href: BROKEN.href, id: BROKEN.id }; yourPrev._reset(); }
    });

    var practice = setupTask('jump-practice', {
      hints: [
        'A jump link is ' + code('#') + ' followed by the id\'s name.',
        'The id is ' + code('favorite-moments') + ', so the href is a ' + code('#') + ' right before that name, with no spaces.'
      ],
      fill: function () { practiceIn.value = '#favorite-moments'; },
      check: function () {
        var r = checkJump(practiceIn.value, 'favorite-moments', false);
        if (r.ok) { r.title = 'Nailed it.'; r.msg = code(practiceIn.value.trim()) + ' matches ' + code('id="favorite-moments"') + ' exactly, so clicking it would scroll right to that heading.'; }
        return r;
      },
      onSuccess: function () { state.jump.practiced = true; updateProgress(); }
    });

    lessons.jump = function () {
      resetSpot(); fix.reset(); practice.reset(); hideSteps(L);
      $('#jump-broken-preview')._reset();
      state.jump = {}; updateProgress();
    };
  })();

  /* ---- Repair 03: the stylesheet ---- */
  (function () {
    var L = $('#repair-css');
    var hrefIn = $('#css-href'), lineIn = $('#css-practice-line');
    var tree = $('#css-walk-tree'), walk = $('#css-walk');
    var spread = $('#css-spread-site');
    renderMiniSite($('#css-broken-site'), ['skai.html']);
    renderMiniSite($('#css-your-site'), ['skai.html']);
    renderMiniSite(spread, []);
    var CXO = [{ file: 'cxo.html', title: 'CXO' }];
    renderMiniSite($('#css-practice-site'), ['cxo.html'], CXO);

    var resetSpot = setupSpot(L, 'css', function () { show(L, 'fix'); });

    var fix = setupTask('css-fix', {
      hints: [
        'Look at the file list. What is the stylesheet actually called?',
        'It\'s missing one letter. The real file is ' + code('styles.css') + ', with an s.'
      ],
      fill: function () { hrefIn.value = 'styles.css'; },
      check: function () {
        var v = hrefIn.value;
        if (/^\s*</.test(v)) return bad('Only the file path goes in this box. The rest of the ' + code('<link>') + ' line is already written around it.');
        if (hasQuotes(v)) return pathFeedback({ reason: 'quotes' }, { attr: 'href' });
        var r = walkPath('css', 'skai.html', v);
        showWalk(tree, walk, r);
        var ok = r.found && r.file === 'styles.css';
        renderMiniSite($('#css-your-site'), ok ? [] : ['skai.html']);
        if (!r.found) return pathFeedback(r, { attr: 'href', here: 'skai.html' });
        if (ok) return good('The browser found ' + code('styles.css') + ', loaded it, and skai.html matches the other pages again. Scroll down for why, and to watch one change hit every page.');
        return bad('That points at ' + code(r.file) + ', which isn\'t a stylesheet, so the browser still has no CSS to use. Point the ' + code('href') + ' at the .css file.');
      },
      onSuccess: function () {
        state.css.fixed = true; updateProgress();
        show(L, 'why'); show(L, 'practice');
      },
      onReset: function () { renderMiniSite($('#css-your-site'), ['skai.html']); clearWalk(tree, walk); }
    });

    // "See it spread": one change in styles.css recolors every linked page.
    var swatches = $all('.lab-swatch', L);
    function setAccent(color) {
      spread.style.setProperty('--mini-accent', color);
      $('#css-swatch-code').textContent = color;
      swatches.forEach(function (s) { s.setAttribute('aria-pressed', String(s.getAttribute('data-color') === color)); });
    }
    swatches.forEach(function (s) { s.addEventListener('click', function () { setAccent(s.getAttribute('data-color')); }); });

    var practice = setupTask('css-practice', {
      hints: [
        'It starts with ' + code('<link') + ' and has two attributes: ' + code('rel') + ' and ' + code('href') + '.',
        code('rel="stylesheet"') + ' says what the file is for. ' + code('href="styles.css"') + ' says where it is. Close the tag with ' + code('>') + '.'
      ],
      fill: function () { lineIn.value = '<link rel="stylesheet" href="styles.css">'; },
      check: function () {
        var r = checkLinkLine(lineIn.value);
        renderMiniSite($('#css-practice-site'), r.ok ? [] : ['cxo.html'], CXO);
        return r;
      },
      onSuccess: function () { state.css.practiced = true; updateProgress(); },
      onReset: function () { renderMiniSite($('#css-practice-site'), ['cxo.html'], CXO); }
    });

    lessons.css = function () {
      resetSpot(); fix.reset(); practice.reset(); hideSteps(L);
      setAccent('#F7ABCA');
      state.css = {}; updateProgress();
    };
  })();

  /* ---------- Reset buttons ---------- */
  $all('[data-action="reset-lesson"]').forEach(function (b) {
    b.addEventListener('click', function () {
      var L = b.closest('.lab-lesson');
      lessons[L.getAttribute('data-lesson')]();
      var h = $('h2', L);
      h.setAttribute('tabindex', '-1');
      h.focus();
      L.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
  $('#reset-all').addEventListener('click', function () {
    Object.keys(lessons).forEach(function (k) { lessons[k](); });
    var t = $('#progress-title');
    t.setAttribute('tabindex', '-1');
    t.focus();
  });

  updateProgress();
})();
