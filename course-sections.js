(() => {
  const tabs = document.querySelector('.pa-tabs');
  const choices = [...tabs.querySelectorAll('a')];
  const panels = choices.map(choice => document.querySelector(choice.hash));

  function selectProgram(selected) {
    choices.forEach((choice, index) => {
      const active = choice === selected;
      choice.setAttribute('aria-selected', String(active));
      choice.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });
  }

  tabs.setAttribute('role', 'tablist');
  choices.forEach((choice, index) => {
    const panel = panels[index];
    choice.id = panel.id + '-tab';
    choice.setAttribute('role', 'tab');
    choice.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', choice.id);
    panel.tabIndex = 0;
    choice.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectProgram(choice);
    });
    choice.addEventListener('keydown', event => {
      const targets = { ArrowRight: (index + 1) % choices.length, ArrowLeft: (index + choices.length - 1) % choices.length, Home: 0, End: choices.length - 1 };
      if (!(event.key in targets)) return;
      event.preventDefault();
      const next = choices[targets[event.key]];
      selectProgram(next);
      next.focus();
    });
  });
  function programFromHash() {
    const selected = choices.find(choice => choice.hash === location.hash);
    if (selected) selectProgram(selected);
  }
  selectProgram(choices[0]);
  programFromHash();
  window.addEventListener('hashchange', programFromHash);

  const filters = document.querySelector('.pa-filters');
  const buttons = [...filters.querySelectorAll('button')];
  const posts = [...document.querySelectorAll('.pa-media-list a')];
  filters.hidden = false;
  filters.setAttribute('role', 'group');
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(other => other.setAttribute('aria-pressed', String(button === other)));
    posts.forEach(post => { post.hidden = button.dataset.filter !== 'all' && post.dataset.kind !== button.dataset.filter; });
    previewPost(posts.find(post => !post.hidden));
  }));


  const preview = document.querySelector('.pa-news-preview');
  const previewItems = [...preview.children];
  function previewPost(post) {
    if (!post) return;
    previewItems.forEach(item => { item.hidden = item.dataset.kind !== post.dataset.kind; });
  }
  posts.forEach(post => {
    post.addEventListener('pointerenter', () => previewPost(post));
    post.addEventListener('focus', () => previewPost(post));
  });

  const deck = document.querySelector('.pa-deck-pages');
  const sheets = [...deck.children];
  const courses = deck.closest('.pa-deck');
  function measureDeck() {
    const top = Math.min(0, window.innerHeight - courses.offsetHeight);
    courses.style.setProperty('--deck-pin-top', top + 'px');
  }
  new ResizeObserver(measureDeck).observe(courses);
  window.addEventListener('resize', measureDeck);
  measureDeck();
  const sentence = document.querySelector('.pa-sentence');
  const showcase = document.querySelector('.pa-showcase');
  const covers = [...showcase.querySelector('.pa-montage').children];
  const program = document.querySelector('.pa-program-scene');
  const columns = [...program.querySelector('.pa-columns').children];
  // Pick the order once so reversing the scroll retraces the same movement.
  const columnDelays = columns.map((_, i) => .04 + .32 * i / (columns.length - 1));
  for (let i = columnDelays.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [columnDelays[i], columnDelays[j]] = [columnDelays[j], columnDelays[i]];
  }
  const events = [...document.querySelector('.pa-events').children];
  const awardLinks = [...document.querySelector('.pa-award-links').children];
  const canStack = matchMedia('(min-width:761px) and (min-height:580px)');
  const clamp = value => Math.max(0, Math.min(1, value));
  function ramp(value, start, end) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }
  function prop(el, name, value, unit = '') {
    const result = value.toFixed(3) + unit;
    if (el.style.getPropertyValue(name) !== result) el.style.setProperty(name, result);
  }
  function sceneProgress(rect, pinHeight) {
    return clamp(-rect.top / Math.max(1, rect.height - pinHeight));
  }

  // Read all active geometry before changing any styles on this frame.
  const scenes = new Map();
  scenes.set(deck, height => {
    if (!canStack.matches) return;
    const tops = sheets.slice(1).map(sheet => sheet.getBoundingClientRect().top);
    return () => tops.forEach((top, i) => {
      const overlap = 1 - ramp(top, 40, height - 40);
      prop(sheets[i].firstElementChild, '--sheet-scale', 1 - .045 * overlap);
      prop(sheets[i].firstElementChild, '--sheet-light', 1 - .23 * overlap);
    });
  });
  scenes.set(sentence, height => {
    const rect = sentence.getBoundingClientRect();
    return () => [...sentence.children].forEach((line, i) => {
      const position = (height - rect.top - i * rect.height / 3) / height;
      const read = ramp(position, .05, .52);
      prop(line, '--word-rise', (1 - read) * 42, 'px');
      prop(line, '--word-opacity', .36 + .64 * read);
    });
  });
  scenes.set(showcase, () => {
    const pin = showcase.firstElementChild;
    const progress = sceneProgress(showcase.getBoundingClientRect(), pin.clientHeight);
    const centres = covers.map(img => [img.offsetLeft - pin.clientWidth / 2, img.offsetTop - pin.clientHeight / 2]);
    return () => {
      const title = 1 - ramp(progress, .015, .22) + ramp(progress, .84, 1);
      prop(pin, '--title-alpha', title);
      prop(pin, '--title-y', (1 - title) * (progress < .5 ? -24 : 36), 'px');
      covers.forEach((img, i) => {
        const phase = ((i * 5) % covers.length) / covers.length;
        const enter = ramp(progress, phase * .10, .28 + phase * .06);
        const exit = ramp(progress, .66 + phase * .07, .89 + phase * .09);
        const spread = enter * (1 - exit);
        const [x, y] = centres[i];
        prop(img, '--image-x', -x * (1 - spread), 'px');
        prop(img, '--image-y', -y * (1 - spread), 'px');
        prop(img, '--image-scale', .13 + .87 * spread);
        prop(img, '--image-alpha', ramp(spread, .035, .48));
      });
    };
  });
  scenes.set(program, () => {
    const progress = sceneProgress(program.getBoundingClientRect(), program.firstElementChild.clientHeight);
    return () => {
      columns.forEach((col, i) => {
        const delay = columnDelays[i];
        prop(col, '--column-y', 101 * (1 - ramp(progress, delay, .59 + delay)), '%');
      });
    };
  });
  awardLinks.forEach((link, i) => scenes.set(link, height => {
    const rect = link.getBoundingClientRect();
    const progress = (.78 * height - rect.top) / Math.max(1, height * .48);
    const delay = (i % 4) * .045;
    return () => prop(link, '--award-fill', ramp(progress, delay, .82 + delay));
  }));
  events.forEach((event, i) => scenes.set(event, height => {
    const rect = event.getBoundingClientRect();
    const t = clamp((height - rect.top) / (height + rect.height));
    const enter = 1 - ramp(t, 0, .46);
    const exit = ramp(t, .61, 1);
    const side = i % 2 ? -1 : 1;
    const width = event.clientWidth;
    return () => {
      prop(event, '--event-x', (enter - exit) * Math.min(width * .10, 132) * side, 'px');
      prop(event, '--event-y', (enter - exit) * 48, 'px');
      prop(event, '--event-turn', (enter - exit) * 5.5 * side, 'deg');
      prop(event, '--event-scale', 1 - enter * .23 - exit * .14);
    };
  }));

  const active = new Set();
  let frame = 0;
  function render() {
    frame = 0;
    if (reducedMotionPreference.matches) return;
    const height = window.innerHeight;
    const writes = [...active].map(el => scenes.get(el)(height));
    writes.forEach(write => { if (write) write(); });
  }
  function schedule() {
    if (!frame && active.size && !reducedMotionPreference.matches) frame = requestAnimationFrame(render);
  }
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      schedule();
    }, {rootMargin:'120px 0px'});
    scenes.forEach((_, el) => visibility.observe(el));
  } else {
    scenes.forEach((_, el) => active.add(el));
  }
  function setMotion() {
    document.documentElement.classList.toggle('pa-motion', !reducedMotionPreference.matches);
    schedule();
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.fonts.ready.then(schedule);
  reducedMotionPreference.addEventListener('change', setMotion);
  setMotion();

})();
