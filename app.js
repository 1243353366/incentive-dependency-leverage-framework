/* ============================================================
   Leverage Lens — searchable library + adaptive decision coach
   ============================================================ */

/* ---------- tiny markdown renderer ---------- */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inlineMd(s) {
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}
function renderMD(text) {
  const lines = text.split('\n');
  let out = [], i = 0;
  let listType = null;
  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { closeList(); i++; continue; }

    // table
    if (/^\|/.test(line.trim())) {
      closeList();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      if (rows.length >= 2 && /^[\s|:-]+$/.test(rows[1])) {
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        let t = '<table><thead><tr>' + cells(rows[0]).map(c => `<th>${inlineMd(c)}</th>`).join('') + '</tr></thead><tbody>';
        for (let r = 2; r < rows.length; r++) t += '<tr>' + cells(rows[r]).map(c => `<td>${inlineMd(c)}</td>`).join('') + '</tr>';
        out.push(t + '</tbody></table>');
      }
      continue;
    }
    // hr
    if (/^---+$/.test(line.trim())) { closeList(); out.push('<hr>'); i++; continue; }
    // blockquote
    if (/^> /.test(line.trim())) { closeList(); out.push(`<blockquote>${inlineMd(line.trim().replace(/^>\s*/, ''))}</blockquote>`); i++; continue; }
    // bullet list
    if (/^[-*] /.test(line.trim())) {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${inlineMd(line.trim().replace(/^[-*] /, ''))}</li>`);
      i++; continue;
    }
    // numbered list
    const ol = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (ol) {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${inlineMd(ol[2])}</li>`);
      i++; continue;
    }
    closeList();
    out.push(`<p>${inlineMd(line.trim())}</p>`);
    i++;
  }
  closeList();
  return out.join('\n');
}

/* highlight rendered html text nodes only */
function highlightHTML(html, terms) {
  if (!terms || !terms.length) return html;
  return html.replace(/(<[^>]+)|([^<]+)/g, (m, tag, text) => {
    if (tag) return tag;
    let t = text;
    terms.forEach(term => {
      const rx = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      t = t.replace(rx, '<mark>$1</mark>');
    });
    return t;
  });
}
function highlightPlain(text, terms) {
  let t = esc(text);
  (terms || []).forEach(term => {
    const rx = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    t = t.replace(rx, '<mark>$1</mark>');
  });
  return t;
}

/* ============================================================
   LIBRARY
   ============================================================ */
const SECTIONS = FRAMEWORK.sections;
const EXTRAS = FRAMEWORK.extras;
const byId = {}; SECTIONS.forEach(s => byId[s.id] = s);

const secName = s =>
  s.type === 'layer' ? `Layer ${s.num}` :
  s.type === 'step' ? `Step ${s.num}` :
  s.type === 'trump' ? `Trump Card ${s.num}` : 'Reference';

const secBodyText = s => {
  let t = s.body.join('\n');
  (s.subsections || []).forEach(sub => { t += '\n' + sub.title + '\n' + sub.body.join('\n'); });
  return t;
};

function matchesQuery(s, q) {
  if (!q) return true;
  const hay = (s.title + ' ' + s.coreQuestion + ' ' + secBodyText(s) + ' ' + s.output).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(t => hay.includes(t));
}

function renderSecCard(s, terms) {
  const core = s.coreQuestion ? `<p class="sec-core">${highlightPlain('Core question: ' + s.coreQuestion, terms)}</p>` : '';
  const bodyHTML = s.body.filter(l => l.trim()).length ? highlightHTML(renderMD(s.body.join('\n')), terms) : '';
  const subsHTML = (s.subsections || []).map(sub =>
    `<div class="subsec"><h4>${highlightPlain(sub.title, terms)}</h4>${highlightHTML(renderMD(sub.body.join('\n')), terms)}</div>`
  ).join('');
  const out = s.output ? `<div class="sec-output"><b>Output:</b> ${highlightPlain(s.output, terms)}</div>` : '';
  return `<div class="sec-card" id="sec-${s.id}">
    <div class="sec-head" onclick="this.parentElement.classList.toggle('open')">
      <span class="sec-num type-${s.type}">${secName(s)}</span>
      <h3>${highlightPlain(s.title, terms)}</h3>
      ${core}
    </div>
    <div class="sec-body md">${bodyHTML}${subsHTML}${out}</div>
  </div>`;
}

function renderLibrary(query) {
  const root = document.getElementById('library-content');
  const terms = query.trim().split(/\s+/).filter(Boolean);
  let html = '', nMatch = 0;

  FRAMEWORK.parts.forEach(p => {
    const secs = SECTIONS.filter(s => s.partId === p.id && matchesQuery(s, query));
    if (query && !secs.length) return;
    if (!query) {
      // browsing: show all sections of this part
      nMatch += SECTIONS.filter(s => s.partId === p.id).length;
    } else nMatch += secs.length;
    html += `<div class="part-block ${query ? '' : 'open'}">
      <div class="part-head" onclick="this.parentElement.classList.toggle('open')">
        <h2>${highlightPlain(p.title, terms)}</h2>
        <div><span class="count">${query ? secs.length : SECTIONS.filter(s => s.partId === p.id).length} section(s)</span><span class="chev">▸</span></div>
      </div>
      <div class="part-body">
        ${(query ? secs : SECTIONS.filter(s => s.partId === p.id)).map(s => renderSecCard(s, terms)).join('')}
      </div>
    </div>`;
  });

  const extras = EXTRAS.filter(x => !query || (x.title + ' ' + x.body.join(' ')).toLowerCase().includes(query.toLowerCase()));
  nMatch += extras.length;
  extras.forEach(x => {
    html += `<div class="part-block ${query ? '' : 'open'}">
      <div class="part-head" onclick="this.parentElement.classList.toggle('open')">
        <h2>${highlightPlain(x.title, terms)}</h2>
        <div><span class="chev">▸</span></div>
      </div>
      <div class="part-body">
        <div class="sec-card open">
          <div class="sec-body md" style="display:block">${highlightHTML(renderMD(x.body.join('\n')), terms)}</div>
        </div>
      </div>
    </div>`;
  });

  root.innerHTML = html;
  const meta = document.getElementById('search-meta');
  meta.textContent = query
    ? `${nMatch} matching section${nMatch === 1 ? '' : 's'} for “${query}”.`
    : 'Browse all 24 layers, 8 intervention steps, 3 trump cards, and the governing principles — or search.';
}

/* tabs */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  if (name === 'library') {
    document.getElementById('tab-library').classList.add('active');
    document.getElementById('view-library').classList.add('active');
  } else {
    document.getElementById('tab-coach').classList.add('active');
    document.getElementById('view-coach').classList.add('active');
  }
}
document.getElementById('tab-library').addEventListener('click', () => switchTab('library'));
document.getElementById('tab-coach').addEventListener('click', () => switchTab('coach'));
document.getElementById('search-input').addEventListener('input', e => renderLibrary(e.target.value));

/* jump from coach to a section */
function jumpToSection(id) {
  switchTab('library');
  setTimeout(() => {
    const el = document.getElementById('sec-' + id);
    if (el) { el.classList.add('open'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }, 80);
}

/* ============================================================
   DECISION COACH
   ============================================================ */

const BASE_QUESTIONS = [
  { id: 'situation', tag: 'Situation', layer: null,
    ask: 'Describe the situation, conflict, or decision you\'re facing. Who is involved, and what outcome do you want?',
    why: 'A neutral statement of the problem anchors everything that follows. (Layer 7 — Framing)',
    type: 'text', placeholder: 'e.g. My business partner keeps making purchases without consulting me…' },
  { id: 'know', tag: 'What do I actually know?', layer: 'layer-0',
    ask: 'What do you actually know so far? List what you\'ve directly seen, heard, or recorded — separately from what you\'ve been told, assumed, or inferred.',
    why: 'Layer 0 — classify information as observed, corroborated, inferred, hypothesized, or unknown.',
    type: 'text', placeholder: 'Seen/heard myself: …  Told by others: …  I assume: …' },
  { id: 'know_split', tag: 'Evidence check', layer: 'layer-0',
    ask: 'Of what you listed: how much is directly observed (witnessed or recorded), versus secondhand or assumed?',
    why: 'Confidence should track the strongest evidence you have, not the intensity of the story.',
    type: 'choice',
    options: [
      { label: 'Mostly directly observed', value: 'observed' },
      { label: 'A mix of both', value: 'mixed' },
      { label: 'Mostly secondhand or assumed', value: 'secondhand' },
      { label: 'Honestly, I\'m not sure', value: 'unsure' }
    ] },
  { id: 'incentives', tag: 'What does everyone want?', layer: 'layer-1',
    ask: 'What does each party want here — including you? Stated goals and observable priorities both count.',
    why: 'Layer 1 — incentives explain possible motives; they don\'t prove intent.',
    type: 'text', placeholder: 'They want…  I want…  Others affected want…' },
  { id: 'dependencies', tag: 'What does everyone depend on?', layer: 'layer-2',
    ask: 'What does each side rely on the other for? Money, approval, information, cooperation, a place to live, emotional support, closure…',
    why: 'Layer 2 — dependencies explain constraints; they don\'t prove exploitation.',
    type: 'text', placeholder: 'I rely on them for…  They rely on me for…' },
  { id: 'switch_cost', tag: 'Dependency check', layer: 'layer-2',
    ask: 'For your biggest dependency: do real alternatives exist, and what would switching cost?',
    why: 'The cost of switching often explains why a costly arrangement persists — no malice required.',
    type: 'text', placeholder: 'Alternatives: …  Cost of switching: …' },
  { id: 'leverage', tag: 'What can you realistically influence?', layer: 'layer-3',
    ask: 'What can you actually do — influence, provide, withhold, document, or refuse — and at what cost to you and to them?',
    why: 'Layer 3 — distinguish the ability to influence an outcome from the ability merely to cause harm.',
    type: 'text', placeholder: 'I can…  It would cost…' },
  { id: 'outside', tag: 'Outside options', layer: 'layer-4',
    ask: 'What could you do without their cooperation at all? What is your best outside option, and what does leaving cost?',
    why: 'Layer 4 — reducing a dependency can beat increasing leverage. Exit is an option, not an obligation.',
    type: 'text', placeholder: 'Without them I could…  The cost would be…' },
  { id: 'mirror', tag: 'Mirror test', layer: 'layer-13',
    ask: 'The mirror test: what are YOU contributing to this? Did anything you did escalate it? Are you applying standards to them that you wouldn\'t apply to yourself?',
    why: 'Layer 13 — your own incentives, dependencies and errors get the same scrutiny as everyone else\'s.',
    type: 'text', placeholder: 'Honestly, I…  /  I don\'t think I\'ve contributed because…' },
  { id: 'theory', tag: 'Adversarial theory testing', layer: 'layer-14',
    ask: 'Which explanation best fits the evidence so far?',
    why: 'Layer 14 — test at least three explanations before concluding strategy.',
    type: 'choice',
    options: [
      { label: 'Strategic — they deliberately use this behavior to influence the outcome', value: 'strategic' },
      { label: 'Ordinary — misunderstanding, habit, defensiveness, poor communication', value: 'ordinary' },
      { label: 'Mixed — a real grievance plus defensive or unfair behavior', value: 'mixed' },
      { label: 'I genuinely can\'t tell yet', value: 'unknown' }
    ] },
  { id: 'confidence', tag: 'Calibration', layer: 'layer-19',
    ask: 'How confident are you in that reading of the situation?',
    why: 'Layer 19 — confidence must be calibrated against demonstrated accuracy, not felt certainty.',
    type: 'choice',
    options: [
      { label: 'Low — could easily be wrong', value: 'low' },
      { label: 'Medium — some evidence supports it', value: 'medium' },
      { label: 'High — I\'d bet on it', value: 'high' }
    ] },
  { id: 'new_evidence', tag: 'Overthinking check', layer: 'trump-1',
    ask: 'Has any genuinely NEW evidence appeared since you formed this view — or are you re-analyzing the same facts?',
    why: 'Trump Card 1 — Overthinking. If further analysis has no expected value, stop and act.',
    type: 'choice',
    options: [
      { label: 'Yes, something new appeared', value: 'yes' },
      { label: 'No — same facts, going in circles', value: 'no' },
      { label: 'Maybe, I haven\'t checked', value: 'unsure' }
    ] },
  { id: 'action', tag: 'Which action serves the objective?', layer: 'layer-16',
    ask: 'Given everything above, which action are you leaning toward?',
    why: 'Layer 16 — prefer the smallest proportionate action that preserves flexibility.',
    type: 'choice',
    options: [
      { label: 'Ask for clarification / have a direct conversation', value: 'clarify' },
      { label: 'Document and verify the facts first', value: 'document' },
      { label: 'Reduce my dependency / build alternatives', value: 'reduce' },
      { label: 'Negotiate clear, verifiable terms', value: 'negotiate' },
      { label: 'Seek independent advice or review', value: 'advice' },
      { label: 'Use a legitimate formal process', value: 'formal' },
      { label: 'Disengage — temporarily or permanently', value: 'disengage' },
      { label: 'Do nothing yet — wait and watch', value: 'wait' }
    ] },
  { id: 'small_step', tag: 'Proportionality', layer: 'layer-16',
    ask: 'What is the smallest step that still works even if your reading of the other person is wrong?',
    why: 'A defensive response that works across multiple explanations beats one that succeeds only if the hostile interpretation is correct.',
    type: 'text', placeholder: 'The smallest reasonable first step is…' },
  { id: 'final_check', tag: 'Final check', layer: null,
    ask: 'The final check: would this still be a reasonable action if your interpretation of the other person turned out to be wrong?',
    why: 'Every intervention must remain defensible if the preferred interpretation is wrong.',
    type: 'choice',
    options: [
      { label: 'Yes — it holds up either way', value: 'yes' },
      { label: 'No — it only makes sense if I\'m right about them', value: 'no' },
      { label: 'Not sure', value: 'unsure' }
    ] },
  { id: 'success', tag: 'Success criteria', layer: 'layer-23',
    ask: 'What outcome would count as resolved? Use something observable — not just an apology or an admission of fault.',
    why: 'Layer 23 — minimum: a clear answer. Acceptable: an agreed process or verifiable terms. Ideal: the behavior actually changes.',
    type: 'text', placeholder: 'I\'ll consider this resolved when…' },
  { id: 'exit', tag: 'Exit condition', layer: 'layer-23',
    ask: 'Last one: what would tell you to stop engaging, change course, or leave? Name your stopping condition.',
    why: 'Analysis must have stopping conditions. Deciding the exit rule now protects you from sunk-cost escalation later.',
    type: 'text', placeholder: 'If X happens, or if nothing changes by [date], I will…' }
];

const FOLLOWUPS = {
  fu_verify: {
    id: 'fu_verify', tag: 'Verification', layer: 'layer-0',
    ask: 'Before deciding anything: what ONE thing could you check, record, or confirm that would most change what you know?',
    why: 'A verification plan turns uncertainty into a next step instead of a reason to speculate.',
    type: 'text', placeholder: 'I could check / ask for / pull a record of…' },
  fu_my_incentive: {
    id: 'fu_my_incentive', tag: 'Your incentives', layer: 'layer-1',
    ask: 'You mostly described what others want. What are YOU getting out of the current arrangement — and what do you risk if it changes?',
    why: 'Your own incentives deserve the same scrutiny. Even keeping things familiar counts as an incentive.',
    type: 'text', placeholder: 'I get…  I\'d risk…' },
  fu_their_incentive: {
    id: 'fu_their_incentive', tag: 'Their incentives', layer: 'layer-1',
    ask: 'You focused on your own side. If the other party were asked what they want, what would they honestly say?',
    why: 'The same behavior often fits several motives. Mapping theirs is not the same as excusing it.',
    type: 'text', placeholder: 'They would probably say they want…' },
  fu_flip: {
    id: 'fu_flip', tag: 'Competing explanations', layer: 'layer-1',
    ask: 'Flip it: does the same behavior fit more than one motive? What would each party want if the incentives were reversed?',
    why: 'Do not assume that a person who benefits from an outcome deliberately engineered it.',
    type: 'text', placeholder: 'Alternative reading: …' },
  fu_theory_evidence: {
    id: 'fu_theory_evidence', tag: 'Evidence vs. interpretation', layer: 'layer-14',
    ask: 'You lean toward a strategic reading. What evidence supports DELIBERATE strategy specifically — rather than misunderstanding, habit, or defensiveness? What would distinguish them?',
    why: 'Do not infer deliberate strategy solely because a behavior benefits the person displaying it.',
    type: 'text', placeholder: 'Evidence for deliberate strategy: …  What would distinguish it: …' },
  fu_falsifier: {
    id: 'fu_falsifier', tag: 'Falsifiability', layer: 'layer-19',
    ask: 'High confidence noted. What single fact, if true, would prove your reading wrong? If nothing comes to mind, that\'s worth knowing too.',
    why: 'Trump Card 2 — Competence. Without a falsifier, your confidence tracks certainty, not accuracy.',
    type: 'text', placeholder: 'It would change my mind if…' },
  fu_revisit: {
    id: 'fu_revisit', tag: 'Adjust the plan', layer: 'layer-16',
    ask: 'Since the action depends on being right about them: what would a more robust version look like — one that protects your interests even if you\'re wrong?',
    why: 'A plan that only works if the hostile interpretation is true is a fragile plan.',
    type: 'text', placeholder: 'A more robust version would be…' },
  fu_absolutist: {
    id: 'fu_absolutist', tag: 'Test that claim', layer: 'layer-0',
    ask: '__QUOTE__',
    buildAsk: quote => `Earlier you wrote: “${quote}”. What specific evidence supports that — and what would count against it?`,
    why: 'Absolutist phrasing (“always”, “never”, “obviously”) is worth testing before it hardens into an assumption.',
    type: 'text', placeholder: 'Evidence for: …  Evidence against would be: …' }
};

const RE = {
  secondhand: /\b(heard|told me|told them|rumo?ur?|apparently|they say|said that|story goes|word is|everyone says)\b/i,
  absolutist: /\b(always|never|obviously|clearly|definitely|certainly|for sure|everyone knows|no doubt|without question)\b/i,
  safety: /\b(unsafe|afraid|scared|fear(ing)? (for|of)|threat(en(ed|s)?)?|viol(en(t|ce))|hit me|hurt me|stalk(ing|er)|danger(ous)?|assault)\b/i,
  darvo: /\b(darvo|den(ies|y|ial)|revers(e|ed) (victim|it)|turned it around|blame[sd]? me|makes? it (my|his|her) fault|attacks? me (instead|back))\b/i,
  exit_word: /\b(leave|quit|walk away|get out|exit|move out|end it|breakup|break up|divorce|resign)\b/i,
  guilt: /\b(guilt|guilty|obligat|owe them|bad person|shame)\b/i,
  love: /\b(love|attachment|attached|miss|grief|griev(e|ing)|affection|loyal(ty)?|bond)\b/i,
  manip: /\b(manipulat(e|ed|ion|ive)|gaslight|playing games|mind games|controlling)\b/i,
  proof: /\b(proof|prove|evidence|screenshots?|messages?|records?|document(ed|ation)?)\b/i
};

/* ---------- state ---------- */
const STORE_KEY = 'leverage-lens-sessions';
let sessions = [];
let session = null;

const DYN_QUESTIONS = {};
function qById(id) {
  return DYN_QUESTIONS[id]
    || BASE_QUESTIONS.find(q => q.id === id)
    || FOLLOWUPS[id];
}

function loadSessions() {
  try { sessions = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { sessions = []; }
}
function saveSessions() { localStorage.setItem(STORE_KEY, JSON.stringify(sessions)); }
function persist() {
  const i = sessions.findIndex(s => s.id === session.id);
  if (i >= 0) sessions[i] = session; else sessions.push(session);
  saveSessions();
}
function newSession() {
  session = {
    id: 's' + Date.now(),
    name: new Date().toLocaleString(),
    created: Date.now(),
    answers: {}, flags: {}, followupsUsed: {}, asked: [], queue: BASE_QUESTIONS.map(q => q.id), done: false
  };
  Object.keys(DYN_QUESTIONS).forEach(k => delete DYN_QUESTIONS[k]);
  persist();
  renderSessions();
  startCoach();
}

/* ---------- chat rendering ---------- */
function botSay(html) {
  const d = document.createElement('div');
  d.className = 'msg bot';
  d.innerHTML = html;
  document.getElementById('coach-chat').appendChild(d);
  return d;
}
function userSay(text) {
  const d = document.createElement('div');
  d.className = 'msg user';
  d.textContent = text;
  document.getElementById('coach-chat').appendChild(d);
}

function renderQuestion(q) {
  const chat = document.getElementById('coach-chat');
  const w = document.getElementById('coach-input-wrap');
  const wrapper = document.createElement('div');
  wrapper.className = 'qa';
  wrapper.innerHTML = `
    <div class="msg bot">
      <span class="tag">${esc(q.tag)}${q.layer && byId[q.layer] ? ' · ' + secName(byId[q.layer]) : ''}</span>
      ${esc(q.ask)}
      ${q.why ? `<div class="why">${esc(q.why)}</div>` : ''}
      ${q.layer && byId[q.layer] ? `<span class="reflink">read the ${secName(byId[q.layer])} reference →</span>` : ''}
    </div>`;
  const ref = wrapper.querySelector('.reflink');
  if (ref) ref.addEventListener('click', () => jumpToSection(q.layer));
  chat.appendChild(wrapper);

  if (q.type === 'choice') {
    w.classList.add('hidden');
    const choices = document.createElement('div');
    choices.className = 'choices';
    q.options.forEach(o => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = o.label;
      b.onclick = () => recordAnswer(q.id, o.value, o.label);
      choices.appendChild(b);
    });
    const back = document.createElement('button');
    back.className = 'choice';
    back.style.borderStyle = 'dashed';
    back.style.color = 'var(--muted)';
    back.textContent = '← back to previous question';
    back.onclick = goBack;
    choices.appendChild(back);
    wrapper.appendChild(choices);
    choices.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } else {
    w.classList.remove('hidden');
    const ta = document.getElementById('coach-input');
    ta.value = '';
    ta.placeholder = q.placeholder || 'Type your answer…';
    ta.focus();
    document.getElementById('input-hint').textContent = 'Ctrl/⌘ + Enter to continue';
    ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function askNext() {
  const qid = session.queue.find(id => !session.asked.includes(id));
  if (!qid) { finishSession(); return; }
  session.current = qid;
  persist();
  updateProgress();
  renderQuestion(qById(qid));
}

function startCoach() {
  document.getElementById('coach-chat').innerHTML = '';
  document.getElementById('coach-report').classList.add('hidden');
  document.getElementById('coach-report').innerHTML = '';
  document.getElementById('safety-banner').classList.add('hidden');
  botSay(`Let's work through this together. I'll ask one question at a time — answer as specifically as you can, and I'll ask follow-ups where your answers point.
    <br><br><span style="font-size:13.5px;color:var(--muted)">The path follows the framework: evidence → incentives → dependencies → leverage → alternatives → mirror test → theory testing → action → stopping conditions. Everything you type stays on this device.</span>`);
  askNext();
}

function goBack() {
  const last = session.asked[session.asked.length - 1];
  if (!last) return;
  session.asked.pop();
  delete session.answers[last];
  // drop any follow-ups queued after that point (they were spawned by it)
  const idx = session.queue.indexOf(last);
  if (idx >= 0) session.queue = session.queue.slice(0, idx + 1).filter((id, i) => session.queue.indexOf(id) === i);
  persist();
  rebuildChat();
}

function rebuildChat() {
  document.getElementById('coach-chat').innerHTML = '';
  document.getElementById('coach-report').classList.add('hidden');
  document.getElementById('coach-report').innerHTML = '';
  session.asked.forEach(qid => {
    const q = qById(qid);
    if (!q) return;
    const a = session.answers[qid];
    botSay(`<span class="tag">${esc(q.tag)}</span>${esc(q.ask)}`);
    userSay(a ? (a.label || a.value || '(skipped)') : '(skipped)');
  });
  askNext();
}

/* ---------- adaptive analysis ---------- */
function injectFollowup(fuId) {
  const idx = session.queue.indexOf(session.current);
  const pos = idx >= 0 ? idx + 1 : session.queue.length;
  if (!session.queue.includes(fuId)) session.queue.splice(pos, 0, fuId);
}
function useFollowup(fuId) {
  if (session.followupsUsed[fuId]) return false;
  session.followupsUsed[fuId] = true;
  injectFollowup(fuId);
  return true;
}

function analyzeAnswer(qid, value, text) {
  const lower = String(text || '').toLowerCase();
  const flags = session.flags;

  if (RE.safety.test(text) && !flags.safety) {
    flags.safety = true;
    const b = document.getElementById('safety-banner');
    b.classList.remove('hidden');
    b.innerHTML = '<b>Safety first.</b> Some of what you wrote suggests this situation may not be safe to handle head-on. The framework is explicit: if direct engagement predictably escalates an unsafe situation, prioritize safety and outside support over continuing the analysis. People and services you trust come before tactics.';
  }

  if (qid !== 'fu_absolutist' && !flags.absolutist && text && RE.absolutist.test(text) && text.length > 15) {
    const quote = text.trim().slice(0, 140);
    flags.absolutist = { quote };
    if (!session.followupsUsed.fu_absolutist) {
      session.followupsUsed.fu_absolutist = true;
      DYN_QUESTIONS.fu_absolutist = {
        ...FOLLOWUPS.fu_absolutist,
        ask: FOLLOWUPS.fu_absolutist.buildAsk(quote)
      };
      injectFollowup('fu_absolutist');
    }
  }

  if (qid === 'know' && RE.secondhand.test(text)) useFollowup('fu_verify');
  if (qid === 'know_split' && (value === 'secondhand' || value === 'unsure')) useFollowup('fu_verify');

  if (qid === 'incentives' && text) {
    const words = lower.split(/\s+/);
    const selfWords = words.filter(w => /^(i|i'm|me|my|mine|myself|myself)$|^my/.test(w)).length;
    const otherWords = words.filter(w => /^(he|she|they|him|her|them|his|their|partner|boss|she's|he's|they're)$/.test(w)).length;
    if (otherWords >= 2 && selfWords === 0) useFollowup('fu_my_incentive');
    else if (selfWords >= 2 && otherWords === 0) useFollowup('fu_their_incentive');
    else if (text.length < 60) useFollowup('fu_flip');
  }

  if (qid === 'theory' && value === 'strategic') useFollowup('fu_theory_evidence');
  if (qid === 'confidence' && value === 'high') useFollowup('fu_falsifier');
  if (qid === 'final_check' && value === 'no') useFollowup('fu_revisit');

  // report flags
  if (qid === 'new_evidence') { flags.overthinking = (value === 'no'); flags.checked_evidence = value; }
  if (qid === 'know_split') flags.evidence_quality = value;
  if (qid === 'theory') flags.theory = value;
  if (qid === 'confidence') flags.confidence = value;
  if (qid === 'action') flags.action = value;
  if (qid === 'final_check') flags.final_check = value;

  // keyword routing for suggested reading
  const reading = flags.reading = flags.reading || [];
  const route = (rx, id) => { if (rx.test(lower) && !reading.includes(id)) reading.push(id); };
  route(RE.darvo, 'layer-8');
  route(RE.manip, 'layer-8'); route(RE.manip, 'layer-14');
  route(RE.exit_word, 'layer-4');
  route(RE.guilt, 'layer-11');
  route(RE.love, 'layer-21');
  route(RE.proof, 'layer-0');
  route(RE.safety, 'layer-22');
}

function recordAnswer(qid, value, label) {
  session.answers[qid] = { value, label, at: Date.now() };
  session.asked.push(qid);
  analyzeAnswer(qid, value, label || value || '');
  userSay(label || value || '(skipped)');
  persist();
  renderNotes();
  askNext();
}

/* ---------- notes panel ---------- */
function renderNotes() {
  const el = document.getElementById('session-notes');
  if (!session) { el.innerHTML = '<div class="note">No active session.</div>'; return; }
  const F = session.flags;
  let notes = [];
  const add = (t, kind) => notes.push(`<div class="note ${kind || ''}">${t}</div>`);

  const eq = {
    observed: 'Evidence base: mostly directly observed',
    mixed: 'Evidence base: mixed direct and secondhand',
    secondhand: 'Evidence base: mostly secondhand or assumed — verify before deciding',
    unsure: 'Evidence base: unclear — build a verification plan'
  };
  if (F.evidence_quality) add('<b>Evidence</b>' + eq[F.evidence_quality], (F.evidence_quality === 'observed') ? '' : 'warn');

  const tq = {
    strategic: 'Working theory: deliberate strategy',
    ordinary: 'Working theory: ordinary (misunderstanding / habit / defensiveness)',
    mixed: 'Working theory: mixed — real grievance + bad behavior',
    unknown: 'Working theory: undetermined'
  };
  if (F.theory) add('<b>Theory</b>' + tq[F.theory]);
  const cq = { low: 'Confidence: low', medium: 'Confidence: medium', high: 'Confidence: high — falsifier requested' };
  if (F.confidence) add('<b>Confidence</b>' + cq[F.confidence], F.confidence === 'high' ? 'warn' : '');

  if (F.overthinking) add('<b>Overthinking</b>No new evidence — stop analyzing; act on the smallest step.', 'warn');
  if (F.absolutist) add('<b>Absolutist claim</b>Challenged: “' + esc(F.absolutist.quote.slice(0, 60)) + '…”', 'warn');
  if (F.safety) add('<b>Safety</b>Safety signals detected — prioritize support over tactics.', 'warn');
  if (F.final_check === 'no') add('<b>Plan risk</b>Action depends on being right — robustness revision requested.', 'warn');
  if (F.final_check === 'yes') add('<b>Plan robustness</b>Passes the “wrong interpretation” check.', '');
  if (F.reading && F.reading.length) add('<b>Suggested reading</b>' + F.reading.map(id => byId[id] ? secName(byId[id]) + ' — ' + esc(byId[id].title) : '').filter(Boolean).slice(0, 3).join('<br>'));

  el.innerHTML = notes.length ? notes.join('') : '<div class="note">Notes appear here as you answer — evidence quality, working theory, confidence, flags.</div>';
}

function updateProgress() {
  const el = document.getElementById('session-progress');
  const pct = session.done ? 100 : Math.min(95, Math.round((session.asked.length / session.queue.length) * 100));
  el.innerHTML = `<div class="progress-bar"><div style="width:${pct}%"></div></div>
    <div class="progress-label">${session.done ? 'Complete — report ready' : session.asked.length + ' / ' + session.queue.length + ' questions'}</div>`;
}

/* ---------- report ---------- */
function valOf(id) {
  const a = session.answers[id];
  if (!a) return '—';
  return a.label || a.value || '—';
}

function reportAsText() {
  const A = session.answers;
  const v = id => A[id] ? (A[id].label || A[id].value || '—') : '—';
  const L = [
    'LEVERAGE LENS — SITUATION REPORT',
    'Generated: ' + session.name,
    '='.repeat(50), '',
    'SITUATION', v('situation'), '',
    'FACT BASE (Layer 0)', v('know'), v('know_split'),
    A.fu_verify ? 'Verification step: ' + v('fu_verify') : '', '',
    'INCENTIVES (Layer 1)', v('incentives'),
    A.fu_my_incentive ? 'What I get: ' + v('fu_my_incentive') : '',
    A.fu_their_incentive ? 'What they want: ' + v('fu_their_incentive') : '',
    A.fu_flip ? 'Reversed-incentive check: ' + v('fu_flip') : '',
    A.fu_absolutist ? 'Absolutist claim tested: ' + v('fu_absolutist') : '', '',
    'DEPENDENCIES (Layer 2)', v('dependencies'),
    'Switching cost: ' + v('switch_cost'), '',
    'LEVERAGE (Layer 3)', v('leverage'), '',
    'OUTSIDE OPTIONS (Layer 4)', v('outside'), '',
    'MY CONTRIBUTION (Layer 13)', v('mirror'), '',
    'THEORY (Layer 14)', v('theory'), 'Confidence: ' + v('confidence'),
    A.fu_theory_evidence ? 'Evidence for strategic reading: ' + v('fu_theory_evidence') : '',
    A.fu_falsifier ? 'Falsifier: ' + v('fu_falsifier') : '', '',
    'DECISION (Layer 16)', 'Action: ' + v('action'),
    'Smallest robust step: ' + v('small_step'),
    A.fu_revisit ? 'Robust revision: ' + v('fu_revisit') : '',
    'Final check passed: ' + v('final_check'), '',
    'STOPPING CONDITIONS (Layer 23)', 'Success: ' + v('success'), 'Exit: ' + v('exit'), '',
    session.flags.safety ? 'SAFETY FLAG: prioritize safety and outside support over tactics.' : '',
    '', '— Just because you can doesn\'t mean you should.'
  ];
  return L.filter(l => l !== undefined).join('\n');
}

function finishSession() {
  session.done = true;
  persist();
  updateProgress();
  document.getElementById('coach-input-wrap').classList.add('hidden');

  const A = session.answers, F = session.flags;

  const flagBlocks = [];
  if (F.safety) flagBlocks.push('<div class="rep-flag danger"><b>Safety.</b> You indicated possible unsafety. The framework\'s rule: if direct questioning predictably escalates an unsafe situation, prioritize safety and outside support over continuing the analysis. Tactics come after security.</div>');
  if (F.evidence_quality === 'secondhand' || F.evidence_quality === 'unsure')
    flagBlocks.push('<div class="rep-flag warn"><b>Thin evidence base.</b> Much of what you "know" is secondhand or assumed. Run the verification step before acting on an interpretation. Missing information doesn\'t prove concealment — but it doesn\'t prove anything else either.</div>');
  if (F.overthinking) flagBlocks.push('<div class="rep-flag warn"><b>Overthinking flag.</b> No new evidence has appeared. Per Trump Card 1: further analysis has no expected value. Execute the smallest proportionate step and let reality supply new data.</div>');
  if (F.confidence === 'high' && F.theory === 'strategic')
    flagBlocks.push('<div class="rep-flag warn"><b>Confidence audit.</b> High confidence + strategic reading is the most expensive combination to be wrong about. You named a falsifier — treat it as a live test, not a formality. Record a prediction and check it against what actually happens.</div>');
  if (F.absolutist) flagBlocks.push(`<div class="rep-flag warn"><b>Absolutist claim tested.</b> You wrote “${esc(F.absolutist.quote.slice(0, 140))}”. Its strength now depends on the evidence you gave for and against it.</div>`);
  if (F.final_check === 'no') flagBlocks.push('<div class="rep-flag warn"><b>Fragile plan.</b> You said the action only makes sense if your interpretation is right. You requested a more robust version — prefer that one. A response that works across multiple explanations beats one that succeeds only if the hostile interpretation is correct.</div>');
  if (F.final_check === 'yes') flagBlocks.push('<div class="rep-flag ok"><b>Robust plan.</b> It passes the final check: reasonable even if you\'re wrong about them. That is the standard.</div>');
  if (F.evidence_quality === 'observed') flagBlocks.push('<div class="rep-flag ok"><b>Solid evidence base.</b> Mostly directly observed. Still separate observed from inferred when you state your case.</div>');

  const reading = [...new Set([...(F.reading || []),
    ...(F.safety ? ['layer-22'] : []),
    ...(F.theory === 'strategic' ? ['layer-14', 'layer-19'] : []),
    ...(F.theory === 'mixed' ? ['layer-11'] : []),
    ...(F.overthinking ? ['trump-1'] : [])
  ])].filter(id => byId[id]);
  const readingHTML = reading.map(id =>
    `<a onclick="jumpToSection('${id}')">${secName(byId[id])} — ${esc(byId[id].title)}</a>`
  ).join('');

  const holder = document.getElementById('coach-report');
  holder.innerHTML = `
    <h2>Situation report</h2>
    <p style="color:var(--muted);font-size:13.5px">Generated from your answers · ${esc(session.name)} · This report structures what <i>you</i> know; it never claims to know what actually happened.</p>

    <h3>1 · The situation, in your words</h3>
    <div class="rep-quote">${esc(valOf('situation'))}</div>

    <h3>2 · Fact base (Layer 0)</h3>
    <div class="rep-block">${esc(valOf('know'))}

Evidence quality: ${esc(valOf('know_split'))}${A.fu_verify ? '\n\nVerification step: ' + esc(valOf('fu_verify')) : ''}${A.fu_absolutist ? '\n\nAbsolutist claim, tested: ' + esc(valOf('fu_absolutist')) : ''}</div>

    <h3>3 · Incentives (Layer 1)</h3>
    <div class="rep-block">${esc(valOf('incentives'))}${A.fu_my_incentive ? '\n\nWhat I get out of it: ' + esc(valOf('fu_my_incentive')) : ''}${A.fu_their_incentive ? '\n\nWhat they would say they want: ' + esc(valOf('fu_their_incentive')) : ''}${A.fu_flip ? '\n\nReversed-incentive check: ' + esc(valOf('fu_flip')) : ''}</div>

    <h3>4 · Dependencies (Layer 2)</h3>
    <div class="rep-block">${esc(valOf('dependencies'))}

Switching cost of biggest dependency: ${esc(valOf('switch_cost'))}</div>

    <h3>5 · Leverage and outside options (Layers 3–4)</h3>
    <div class="rep-block">What I can realistically do: ${esc(valOf('leverage'))}

Best option without their cooperation: ${esc(valOf('outside'))}</div>

    <h3>6 · Your own contribution (Layer 13)</h3>
    <div class="rep-block">${esc(valOf('mirror'))}</div>

    <h3>7 · Working theory and calibration (Layers 14, 19)</h3>
    <div class="rep-block">Best-fit explanation: ${esc(valOf('theory'))}
Confidence: ${esc(valOf('confidence'))}${A.fu_theory_evidence ? '\nEvidence for the strategic reading: ' + esc(valOf('fu_theory_evidence')) : ''}${A.fu_falsifier ? '\nWhat would change my mind: ' + esc(valOf('fu_falsifier')) : ''}</div>

    <h3>8 · Decision (Layer 16)</h3>
    <div class="rep-block">Chosen action: ${esc(valOf('action'))}
Smallest robust step: ${esc(valOf('small_step'))}${A.fu_revisit ? '\nRobust revision: ' + esc(valOf('fu_revisit')) : ''}
Final check (reasonable even if I'm wrong?): ${esc(valOf('final_check'))}</div>

    <h3>9 · Stopping conditions (Layer 23)</h3>
    <div class="rep-block">Success criteria: ${esc(valOf('success'))}

Exit condition: ${esc(valOf('exit'))}</div>

    ${flagBlocks.length ? '<h3>Flags and cautions</h3>' + flagBlocks.join('') : ''}

    ${readingHTML ? '<h3>Suggested reading for your situation</h3><div class="reading-list">' + readingHTML + '</div>' : ''}

    <h3>The three tests of action</h3>
    <div class="rep-block">Capability — can you do it?
Self-interest — does it improve your position over the relevant horizon?
Justification — is it proportionate, defensible, and consistent with your obligations and values?

Master question: if every theory and narrative disappeared, what facts would still remain — and what is the lowest-risk way to your legitimate objective?</div>

    <div class="report-actions">
      <button class="btn small" id="btn-copy-report">Copy report as text</button>
      <button class="btn small ghost" id="btn-download-report">Download as .txt</button>
      <button class="btn small ghost" id="btn-restart">Start a new session</button>
    </div>`;
  holder.classList.remove('hidden');

  botSay('Session complete. Your structured report is above — including any flags worth taking seriously. The framework\'s final standard: <b>a decision that remains reasonable even when your interpretation is imperfect.</b> If the facts change, start a new session and see whether the story changes with them.');
  holder.scrollIntoView({ behavior: 'smooth' });

  document.getElementById('btn-copy-report').onclick = () => {
    navigator.clipboard.writeText(reportAsText()).then(() => {
      const b = document.getElementById('btn-copy-report');
      b.textContent = 'Copied ✓';
      setTimeout(() => b.textContent = 'Copy report as text', 1800);
    });
  };
  document.getElementById('btn-download-report').onclick = () => {
    const blob = new Blob([reportAsText()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leverage-lens-report.txt';
    a.click();
  };
  document.getElementById('btn-restart').onclick = () => newSession();
}

/* ---------- session UI ---------- */
function renderSessions() {
  const sel = document.getElementById('session-select');
  sel.innerHTML = sessions.map(s =>
    `<option value="${s.id}" ${session && s.id === session.id ? 'selected' : ''}>${esc(s.name)}${s.done ? ' ✓' : ''}</option>`
  ).join('') || '<option value="">(no sessions yet)</option>';
}

function resumeSession(id) {
  session = sessions.find(s => s.id === id);
  if (!session) { newSession(); return; }
  Object.keys(DYN_QUESTIONS).forEach(k => delete DYN_QUESTIONS[k]);
  // restore dynamic absolutist question if it was used
  if (session.flags.absolutist && session.answers.fu_absolutist) {
    DYN_QUESTIONS.fu_absolutist = {
      ...FOLLOWUPS.fu_absolutist,
      ask: FOLLOWUPS.fu_absolutist.buildAsk(session.flags.absolutist.quote)
    };
  }
  renderSessions();
  renderNotes();

  document.getElementById('coach-chat').innerHTML = '';
  const holder = document.getElementById('coach-report');
  holder.classList.add('hidden');
  holder.innerHTML = '';
  const banner = document.getElementById('safety-banner');
  if (session.flags.safety) {
    banner.classList.remove('hidden');
    banner.innerHTML = '<b>Safety first.</b> This session contains safety signals. Prioritize safety and outside support over tactics.';
  } else banner.classList.add('hidden');

  if (session.done) {
    // redraw history + report
    session.asked.forEach(qid => {
      const q = qById(qid);
      if (!q) return;
      const a = session.answers[qid];
      botSay(`<span class="tag">${esc(q.tag)}</span>${esc(q.ask)}`);
      userSay(a ? (a.label || a.value || '(skipped)') : '(skipped)');
    });
    finishSession();
  } else {
    rebuildChat();
  }
}

/* ---------- wire up ---------- */
document.getElementById('btn-new-session').addEventListener('click', newSession);
document.getElementById('btn-delete-session').addEventListener('click', () => {
  if (!session || !sessions.length) return;
  if (!confirm('Delete this session?')) return;
  sessions = sessions.filter(s => s.id !== session.id);
  saveSessions();
  if (sessions.length) resumeSession(sessions[sessions.length - 1].id);
  else newSession();
});
document.getElementById('session-select').addEventListener('change', e => resumeSession(e.target.value));

document.getElementById('btn-submit').addEventListener('click', () => {
  const ta = document.getElementById('coach-input');
  const v = ta.value.trim();
  if (!v) { ta.focus(); return; }
  recordAnswer(session.current, v, null);
});
document.getElementById('btn-skip').addEventListener('click', () => recordAnswer(session.current, '(skipped)', null));
document.getElementById('btn-back').addEventListener('click', goBack);
document.getElementById('coach-input').addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('btn-submit').click();
  }
});

/* ---------- init ---------- */
loadSessions();
renderLibrary('');
if (sessions.length) {
  resumeSession(sessions[sessions.length - 1].id);
} else {
  renderSessions();
  newSession();
}
