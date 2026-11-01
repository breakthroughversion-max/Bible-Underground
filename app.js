// app.js — static interlinear (GitHub Pages / plain hosting)

// ---------- Book map (from getBookInfo) ----------
const BOOKS = {
  Matthew:         ['Matthew', 'Matthew', 'matthew.json'],
  Mark:            ['Mark', 'Mark', 'mark.json'],
  Luke:            ['Luke', 'Luke', 'luke.json'],
  John:            ['John', 'John', 'john.json'],
  Acts:            ['Acts', 'Acts', 'acts.json'],
  Romans:          ['Romans', 'Romans', 'romans.json'],
  '1Corinthians':  ['1 Corinthians', 'First Corinthians', '1_corinthians.json'],
  '2Corinthians':  ['2 Corinthians', 'Second Corinthians', '2_corinthians.json'],
  Galatians:       ['Galatians', 'Galatians', 'galatians.json'],
  Ephesians:       ['Ephesians', 'Ephesians', 'ephesians.json'],
  Philippians:     ['Philippians', 'Philippians', 'philippians.json'],
  Colossians:      ['Colossians', 'Colossians', 'colossians.json'],
  '1Thessalonians':['1 Thessalonians', 'First Thessalonians', '1_thessalonians.json'],
  '2Thessalonians':['2 Thessalonians', 'Second Thessalonians', '2_thessalonians.json'],
  '1Timothy':      ['1 Timothy', 'First Timothy', '1_timothy.json'],
  '2Timothy':      ['2 Timothy', 'Second Timothy', '2_timothy.json'],
  Titus:           ['Titus', 'Titus', 'titus.json'],
  Philemon:        ['Philemon', 'Philemon', 'philemon.json'],
  Hebrews:         ['Hebrews', 'Hebrews', 'hebrews.json'],
  James:           ['James', 'James', 'james.json'],
  '1Peter':        ['1 Peter', 'First Peter', '1_peter.json'],
  '2Peter':        ['2 Peter', 'Second Peter', '2_peter.json'],
  '1John':         ['1 John', 'First John', '1_john.json'],
  '2John':         ['2 John', 'Second John', '2_john.json'],
  '3John':         ['3 John', 'Third John', '3_john.json'],
  Jude:            ['Jude', 'Jude', 'jude.json'],
  Revelation:      ['Revelation', 'Revelation', 'revelation.json'],
};

function getBookInfo(key) {
  if (!BOOKS[key]) key = 'Matthew';
  const [display, engTitle, json] = BOOKS[key];
  return { key, display, engTitle, json };
}

// ---------- Strong's / dictionary ----------
function normalizeStrongs(s) {
  s = String(s || '').toUpperCase().replace(/[^G0-9]/g, '');
  s = s.replace(/^G0+/, 'G');
  if (s === 'G') s = 'G0';
  return s;
}

let dictByStrongs = null;

async function loadDictionary() {
  const res = await fetch('greek-data-nopt.json');
  if (!res.ok) throw new Error('Dictionary JSON failed to load');
  const rows = await res.json();
  dictByStrongs = new Map();
  for (const row of rows) {
    const k = normalizeStrongs(row.strong_number);
    if (k) dictByStrongs.set(k, row);
  }
}

function lookupStrongs(strongs) {
  if (!dictByStrongs) return null;
  return dictByStrongs.get(normalizeStrongs(strongs)) || null;
}

function shortGlossFromRow(row) {
  if (!row) return '';
  let text = (row.definition || row.mounce || row.dodson || row.thayer || '').trim();
  if (!text) return '';
  if (text.includes(',')) text = text.split(',')[0].trim();
  return text.replace(/[.;\s]+$/g, '');
}

function getShortGlosses(strongsList) {
  const out = {};
  for (const s of strongsList) {
    const n = normalizeStrongs(s);
    const row = lookupStrongs(n);
    const g = shortGlossFromRow(row);
    if (g) {
      out[s] = g;
      out[n] = g;
    }
  }
  return out;
}

// ---------- Load Greek JSON ----------
async function loadGreekTokens(jsonPath, chapter) {
  const res = await fetch(jsonPath);
  if (!res.ok) return {};
  const data = await res.json();
  const byVerse = {};
  for (const token of data) {
    if (+token.chapter !== +chapter) continue;
    const v = +token.verse;
    if (!byVerse[v]) byVerse[v] = [];
    byVerse[v].push(token);
  }
  return byVerse;
}

// ---------- Load English .bu.txt ----------
async function loadEnglishVersion(filePath, engTitle, chapter) {
  const res = await fetch(filePath);
  if (!res.ok) return {};
  const content = await res.text();
  const titleRe = new RegExp(
    '<TITLE>\\s*' + engTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '\\s+' + chapter + '\\s*</TITLE>([\\s\\S]*?)(?=<TITLE>|$)',
    'i'
  );
  const m = content.match(titleRe);
  if (!m) return {};
  const section = m[1];
  const verseRe = /<A\s+NAME="[^"]*?(\d+)"[^>]*>[\s\S]*?<\/A>\s*<SPAN[^>]*>\s*\d+\s*<\/SPAN>([\s\S]*?)<\/P>/gi;
  const verses = {};
  let match;
  while ((match = verseRe.exec(section)) !== null) {
    const vnum = parseInt(match[1], 10);
    let text = match[2].replace(/<\/?SPAN[^>]*>/gi, '').trim();
    verses[vnum] = text;
  }
  return verses;
}

// ---------- Morph → CSS class (basic) ----------
function morphToPosClass(morph) {
  const m = (morph || '').toUpperCase().trim();
  if (!m) return 'pos-other';
  if (m.startsWith('V-') || m[0] === 'V') return 'pos-verb';
  if (m.startsWith('N-') || m[0] === 'N') return 'pos-noun';
  if (m.startsWith('A-') || m[0] === 'A') return 'pos-adj';
  if (m.startsWith('ADV') || m === 'ADV') return 'pos-adv';
  if (/^(R|RP|RD|RE|RI|RK|RS|RX|P-)/.test(m)) return 'pos-pron';
  if (m === 'PREP' || m.startsWith('P-')) return 'pos-prep';
  if (m === 'CONJ' || m === 'COND') return 'pos-conj';
  if (m === 'PRT' || m === 'PART' || m === 'I-') return 'pos-particle';
  if (m.startsWith('T-') || m === 'ART') return 'pos-article';
  return 'pos-other';
}

function adjustGlossForMorph(gloss, morph) {
  gloss = (gloss || '').trim();
  if (!gloss || !morph) return gloss;
  const m = morph.toUpperCase().trim();
  let caseLetter = '';
  let p = m.match(/^[NART]-([NGDAV])/);
  if (p) caseLetter = p[1];
  else {
    p = m.match(/^P-[123]?([NGDAV])/);
    if (p) caseLetter = p[1];
    else {
      p = m.match(/-([NGDAV])[SP][MFN]?$/);
      if (p) caseLetter = p[1];
    }
  }
  if (!caseLetter) return gloss;
  const lower = gloss.toLowerCase();
  if (caseLetter === 'G' && !lower.startsWith('of ')) return 'of ' + gloss;
  if (caseLetter === 'D' && !lower.startsWith('to ') && !lower.startsWith('for ')) {
    return 'to/for ' + gloss;
  }
  return gloss;
}

function pronounGlossFromMorph(morph) {
  let m = (morph || '').toUpperCase().trim().replace(/[ _]/g, '');
  if (!m) return null;

  const map = {
    'P-1NS': 'I', 'P-1GS': 'of me', 'P-1DS': 'to/for me', 'P-1AS': 'me',
    'P-1NP': 'we', 'P-1GP': 'of us', 'P-1DP': 'to/for us', 'P-1AP': 'us',
    'P-2NS': 'you', 'P-2GS': 'of you', 'P-2DS': 'to/for you', 'P-2AS': 'you',
    'P-2NP': 'you', 'P-2GP': 'of you', 'P-2DP': 'to/for you', 'P-2AP': 'you',
    'P-NSM': 'he', 'P-GSM': 'of him', 'P-DSM': 'to/for him', 'P-ASM': 'him',
    'P-NPM': 'they', 'P-GPM': 'of them', 'P-DPM': 'to/for them', 'P-APM': 'them',
    'P-NSF': 'she', 'P-GSF': 'of her', 'P-DSF': 'to/for her', 'P-ASF': 'her',
    'P-NPF': 'they', 'P-GPF': 'of them', 'P-DPF': 'to/for them', 'P-APF': 'them',
    'P-NSN': 'it', 'P-GSN': 'of it', 'P-DSN': 'to/for it', 'P-ASN': 'it',
    'P-NPN': 'they', 'P-GPN': 'of them', 'P-DPN': 'to/for them', 'P-APN': 'them',
    'F-3ASM': 'himself', 'F-3ASF': 'herself', 'F-3ASN': 'itself',
    'F-3APM': 'themselves', 'F-3APF': 'themselves', 'F-3APN': 'themselves',
  };

  if (map[m]) return map[m];

  const p = m.match(/^(P|RP|RD|RE|RI|RK|RS|RX|F)-?([123])?([NGDAV])([SP])([MFN])?/);
  if (p) {
    const person = p[2] || '3';
    const key = 'P-' + person + p[3] + p[4] + (p[5] || '');
    if (map[key]) return map[key];
    const key2 = 'P-' + person + p[3] + p[4];
    if (map[key2]) return map[key2];
  }
  return null;
}

function demonstrativeGlossFromStrongs(strongs, morph = '') {
  const s = normalizeStrongs(strongs);
  const m = (morph || '').toUpperCase().trim();
  let plural = false;
  const p = m.match(/-([NGDAV])([SP])([MFN])?/);
  if (p) plural = p[2] === 'P';

  switch (s) {
    case 'G3778': return plural ? 'these' : 'this';
    case 'G3592': return plural ? 'the [things] here' : 'the [thing] here';
    case 'G1565': return plural ? 'those' : 'that';
    case 'G5108': return plural ? 'these types [of]' : 'this type [of]';
    case 'G5118': return plural ? 'so many' : 'so much';
    default: return null;
  }
}

function adjustVerbGloss(baseGloss, morph) {
  let base = (baseGloss || '').trim();
  const m = (morph || '').toUpperCase().trim();
  if (!base || !m || m[0] !== 'V') return base;

  base = base.replace(/^to\s+/i, '');
  const parts = base.match(/^(\S+)(.*)$/u);
  if (!parts) return base;
  const verbWord = parts[1];
  const remainder = parts[2];

  let tense = '', voice = '', mood = '', person = '', number = '', gender = '';
  let p;

  if ((p = m.match(/^V-2([AFLR])([AMPDONEQX])([ISDOPN])(?:-([123])([SP])([MFN])?)?/))) {
    tense = p[1]; voice = p[2]; mood = p[3];
    person = p[4] || ''; number = p[5] || ''; gender = p[6] || '';
  } else if ((p = m.match(/^V-([PIFARXL])([AMPDONEQX])([ISDOPN])-([123])([SP])([MFN])?/))) {
    tense = p[1]; voice = p[2]; mood = p[3];
    person = p[4]; number = p[5]; gender = p[6] || '';
  } else if ((p = m.match(/^V-2?([PIFARXL])([AMPDONEQX])P-([NGDAV])([SP])([MFN])/))) {
    tense = p[1]; voice = p[2]; mood = 'P';
    number = p[4]; gender = p[5];
  } else if ((p = m.match(/^V-2?([PIFARXL])([AMPDONEQX])N$/))) {
    tense = p[1]; voice = p[2]; mood = 'N';
  } else if ((p = m.match(/^V-([PIFARXL])([AMPDONEQX])([ISDOPN])/))) {
    tense = p[1]; voice = p[2]; mood = p[3];
  }

  // Deponents → active meaning
  if (voice === 'D' || voice === 'O' || voice === 'N') voice = 'A';
  else if (voice && !['A', 'M', 'P'].includes(voice)) voice = 'A';

  const isSubjunctive = mood === 'S';
  const isOptative = mood === 'O';

  const irregular = {
    be: { pres: { I:'am', you:'are', he:'is', she:'is', it:'is', we:'are', they:'are' },
          past: { I:'was', you:'were', he:'was', she:'was', it:'was', we:'were', they:'were' },
          perf:'been', part:'being' },
    have: { pres: { I:'have', you:'have', he:'has', she:'has', it:'has', we:'have', they:'have' },
            past:'had', perf:'had', part:'having' },
    do: { pres: { I:'do', you:'do', he:'does', she:'does', it:'does', we:'do', they:'do' },
          past:'did', perf:'done', part:'doing' },
    go: { pres:'go', past:'went', perf:'gone', part:'going' },
    come: { pres:'come', past:'came', perf:'come', part:'coming' },
    see: { pres:'see', past:'saw', perf:'seen', part:'seeing' },
    know: { pres:'know', past:'knew', perf:'known', part:'knowing' },
    say: { pres:'say', past:'said', perf:'said', part:'saying' },
    give: { pres:'give', past:'gave', perf:'given', part:'giving' },
    take: { pres:'take', past:'took', perf:'taken', part:'taking' },
    make: { pres:'make', past:'made', perf:'made', part:'making' },
    write: { pres:'write', past:'wrote', perf:'written', part:'writing' },
    find: { pres:'find', past:'found', perf:'found', part:'finding' },
    leave: { pres:'leave', past:'left', perf:'left', part:'leaving' },
    speak: { pres:'speak', past:'spoke', perf:'spoken', part:'speaking' },
    hear: { pres:'hear', past:'heard', perf:'heard', part:'hearing' },
    love: { pres:'love', past:'loved', perf:'loved', part:'loving' },
    believe: { pres:'believe', past:'believed', perf:'believed', part:'believing' },
  };

  function getForm(which) {
    const lookup = verbWord.toLowerCase();
    let subjectKey = 'he';
    if (person === '1' && number === 'S') subjectKey = 'I';
    if (person === '1' && number === 'P') subjectKey = 'we';
    if (person === '2') subjectKey = 'you';
    if (person === '3' && number === 'P') subjectKey = 'they';
    if (gender === 'F') subjectKey = 'she';
    if (gender === 'N') subjectKey = 'it';

    if (irregular[lookup] && irregular[lookup][which] != null) {
      let form = irregular[lookup][which];
      if (typeof form === 'object') form = form[subjectKey] || form.he || verbWord;
      return form + remainder;
    }

    let conjugated = verbWord;
    if (which === 'pres') {
      if (['he', 'she', 'it'].includes(subjectKey)) {
        if (/(s|x|z|ch|sh)$/i.test(verbWord)) conjugated = verbWord + 'es';
        else if (/[^aeiou]y$/i.test(verbWord)) conjugated = verbWord.slice(0, -1) + 'ies';
        else conjugated = verbWord + 's';
      }
    } else if (which === 'past' || which === 'perf') {
      if (/e$/i.test(verbWord)) conjugated = verbWord + 'd';
      else if (/[^aeiou]y$/i.test(verbWord)) conjugated = verbWord.slice(0, -1) + 'ied';
      else conjugated = verbWord + 'ed';
    } else if (which === 'part') {
      if (/ie$/i.test(verbWord)) conjugated = verbWord.slice(0, -2) + 'ying';
      else if (/e$/i.test(verbWord)) conjugated = verbWord.slice(0, -1) + 'ing';
      else conjugated = verbWord + 'ing';
    }
    return conjugated + remainder;
  }

  let subject = '';
  if (person && number) {
    if (person === '1' && number === 'S') subject = 'I';
    if (person === '1' && number === 'P') subject = 'we';
    if (person === '2') subject = 'you';
    if (person === '3' && number === 'S') {
      subject = 'he';
      if (gender === 'F') subject = 'she';
      if (gender === 'N') subject = 'it';
      if (!gender) subject = 'he/she/it';
    }
    if (person === '3' && number === 'P') subject = 'they';
  }

  let reflexive = '';
  if (person && number) {
    if (person === '1' && number === 'S') reflexive = 'myself';
    if (person === '1' && number === 'P') reflexive = 'ourselves';
    if (person === '2') reflexive = 'yourself';
    if (person === '3' && number === 'S') {
      reflexive = 'himself';
      if (gender === 'F') reflexive = 'herself';
      if (gender === 'N') reflexive = 'itself';
      if (!gender) reflexive = 'himself/herself/itself';
    }
    if (person === '3' && number === 'P') reflexive = 'themselves';
  }

  if (mood === 'N') return 'to ' + verbWord + remainder;

  if (mood === 'P') {
    const partForm = getForm('part');
    if (tense === 'A') return 'after ' + partForm;
    if (tense === 'X' || tense === 'R') return 'having ' + getForm('perf');
    return partForm;
  }

  let verbForm = verbWord + remainder;

  if (voice === 'A' || voice === '') {
    switch (tense) {
      case 'P': verbForm = getForm('pres'); break;
      case 'I': {
        const aux = ['I', 'he', 'she', 'it', 'he/she/it'].includes(subject) ? 'was' : 'were';
        verbForm = aux + ' ' + getForm('part');
        break;
      }
      case 'F': verbForm = 'will ' + verbWord + remainder; break;
      case 'A': verbForm = getForm('past'); break;
      case 'R':
      case 'X': {
        let aux = ['he', 'she', 'it', 'he/she/it'].includes(subject) ? 'has' : 'have';
        if (subject === 'I') aux = 'have';
        verbForm = aux + ' ' + getForm('perf');
        break;
      }
      case 'L': verbForm = 'had ' + getForm('perf'); break;
    }
  } else if (voice === 'M') {
    switch (tense) {
      case 'P': verbForm = getForm('pres') + ' ' + reflexive; break;
      case 'I': {
        const aux = ['I', 'he', 'she', 'it', 'he/she/it'].includes(subject) ? 'was' : 'were';
        verbForm = aux + ' ' + getForm('part') + ' ' + reflexive;
        break;
      }
      case 'F': verbForm = 'will ' + verbWord + remainder + ' ' + reflexive; break;
      case 'A': verbForm = getForm('past') + ' ' + reflexive; break;
      case 'R':
      case 'X': {
        let aux = ['he', 'she', 'it', 'he/she/it'].includes(subject) ? 'has' : 'have';
        if (subject === 'I') aux = 'have';
        verbForm = aux + ' ' + getForm('perf') + ' ' + reflexive;
        break;
      }
      case 'L': verbForm = 'had ' + getForm('perf') + ' ' + reflexive; break;
    }
  } else {
    // Passive
    switch (tense) {
      case 'P': {
        const aux = subject === 'I' ? 'am'
          : ['he', 'she', 'it', 'he/she/it'].includes(subject) ? 'is' : 'are';
        verbForm = aux + ' ' + getForm('perf');
        break;
      }
      case 'I': {
        const aux = ['I', 'he', 'she', 'it', 'he/she/it'].includes(subject) ? 'was' : 'were';
        verbForm = aux + ' being ' + getForm('perf');
        break;
      }
      case 'F': verbForm = 'will be ' + getForm('perf'); break;
      case 'A': {
        const aux = (number === 'S' || ['I', 'he', 'she', 'it', 'he/she/it'].includes(subject))
          ? 'was' : 'were';
        verbForm = aux + ' ' + getForm('perf');
        break;
      }
      case 'R':
      case 'X': {
        let aux = ['he', 'she', 'it', 'he/she/it'].includes(subject) ? 'has' : 'have';
        if (subject === 'I') aux = 'have';
        verbForm = aux + ' been ' + getForm('perf');
        break;
      }
      case 'L': verbForm = 'had been ' + getForm('perf'); break;
      default: verbForm = 'be ' + getForm('perf');
    }
  }

  if (isSubjunctive) {
    const modal = tense === 'P' ? 'may' : 'might';
    if (voice === 'M') verbForm = modal + ' ' + verbWord + remainder + ' ' + reflexive;
    else if (voice === 'P') verbForm = modal + ' be ' + getForm('perf');
    else verbForm = modal + ' ' + verbWord + remainder;
  }

  if (isOptative) {
    if (voice === 'M') verbForm = 'would ' + verbWord + remainder + ' ' + reflexive;
    else if (voice === 'P') verbForm = 'would be ' + getForm('perf');
    else verbForm = 'would ' + verbWord + remainder;
  }

  if (subject) return subject + ' ' + verbForm;
  return verbForm;
}

function decodeMorph(morph) {
  const m = (morph || '').toUpperCase().trim();
  if (!m) return {};
  const info = {};

  if (m.startsWith('V')) info['Part of Speech'] = 'Verb';
  else if (m.startsWith('N-')) info['Part of Speech'] = 'Noun';
  else if (m.startsWith('A-')) info['Part of Speech'] = 'Adjective';
  else if (m.startsWith('P-') || m.startsWith('RP')) info['Part of Speech'] = 'Personal Pronoun';
  else if (m.startsWith('D-') || m.startsWith('RD')) info['Part of Speech'] = 'Demonstrative Pronoun';
  else if (m === 'PREP') info['Part of Speech'] = 'Preposition';
  else if (m === 'CONJ' || m === 'COND') info['Part of Speech'] = 'Conjunction';
  else if (m.startsWith('T-')) info['Part of Speech'] = 'Article';
  else if (m === 'ADV') info['Part of Speech'] = 'Adverb';
  else if (m === 'INJ' || m === 'I-') info['Part of Speech'] = 'Interjection';
  else if (m === 'PRT' || m.startsWith('PRT')) info['Part of Speech'] = 'Particle';

  if (m.startsWith('V')) {
    const tenseMap = {
      P: 'Present', I: 'Imperfect', F: 'Future', A: 'Aorist',
      R: 'Perfect', X: 'No Tense Stated', L: 'Pluperfect',
    };
    const voiceMap = {
      A: 'Active', M: 'Middle', P: 'Passive',
      D: 'Middle Deponent (has middle ending but is translated as active)',
      O: 'Passive Deponent (has passive ending but is translated as active)',
      N: 'Middle or Passive Deponent (has middle or passive ending but is translated as active)',
      E: 'Either Middle or Passive',
      Q: 'Impersonal Active',
      X: 'No Voice Stated',
    };
    const moodMap = {
      I: 'Indicative', S: 'Subjunctive', O: 'Optative',
      D: 'Imperative', N: 'Infinitive', P: 'Participle',
    };

    let p = m.match(/^V-2?([PIFARXL])([AMPDONEQX])([ISDOPN])/);
    if (p) {
      info['Tense'] = tenseMap[p[1]] || p[1];
      info['Voice'] = voiceMap[p[2]] || p[2];
      info['Mood'] = moodMap[p[3]] || p[3];
    }

    p = m.match(/-([123])([SP])([MFN])?/);
    if (p) {
      const personMap = { 1: 'first', 2: 'second', 3: 'third' };
      const numberMap = { S: 'Singular', P: 'Plural' };
      const genderMap = { M: 'Masculine', F: 'Feminine', N: 'Neuter' };
      let personLabel = personMap[p[1]] || p[1];
      if (p[1] === '1' && p[2] === 'P') personLabel += ' [we]';
      else if (p[1] === '1' && p[2] === 'S') personLabel += ' [I]';
      else if (p[1] === '2') personLabel += ' [you]';
      else if (p[1] === '3' && p[2] === 'S') personLabel += ' [he/she/it]';
      else personLabel += ' [they]';
      info['Person'] = personLabel;
      info['Number'] = numberMap[p[2]] || p[2];
      if (p[3]) info['Gender'] = genderMap[p[3]] || p[3];
    }
  }

  const np = m.match(/^[NART]-([NGDAV])([SP])([MFN])/);
  if (np) {
    const caseMap = { N: 'Nominative', G: 'Genitive', D: 'Dative', A: 'Accusative', V: 'Vocative' };
    const numberMap = { S: 'Singular', P: 'Plural' };
    const genderMap = { M: 'Masculine', F: 'Feminine', N: 'Neuter' };
    info['Case'] = caseMap[np[1]] || np[1];
    info['Number'] = numberMap[np[2]] || np[2];
    info['Gender'] = genderMap[np[3]] || np[3];
  }

  return info;
}

function buildGloss(tok, shortGlosses) {
  const strongs = tok.strongs || '';
  const morph = tok.morph || '';
  let gloss = pronounGlossFromMorph(morph);
  if (gloss == null) gloss = demonstrativeGlossFromStrongs(strongs, morph);
  if (gloss == null) {
    const raw = shortGlosses[strongs] || shortGlosses[normalizeStrongs(strongs)] || '';
    if (/^v/i.test(morph)) gloss = adjustVerbGloss(raw, morph);
    else gloss = adjustGlossForMorph(raw, morph);
  }
  return gloss || '';
}

// ---------- Render ----------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderChapter(bookInfo, chapter, englishBV, englishTB, greek, shortGlosses) {
  const main = document.getElementById('main');
  const verseNums = [
    ...new Set([
      ...Object.keys(englishBV).map(Number),
      ...Object.keys(englishTB).map(Number),
      ...Object.keys(greek).map(Number),
    ]),
  ].sort((a, b) => a - b);

  document.title = `${bookInfo.key} ${chapter} – Interlinear`;

  if (!verseNums.length) {
    main.innerHTML = '<p><strong>No content found for this chapter.</strong></p>';
    return;
  }

  let html = '';
  for (const v of verseNums) {
    html += `<section class="verse" id="v${v}">`;
    html += `<h3>${escapeHtml(bookInfo.display + ' ' + chapter + ':' + v)}</h3>`;
    html += '<div class="english-versions">';
    if (englishBV[v]) {
      html += `<div class="english bv"><span class="version-label">Breakthrough Version</span>${englishBV[v]}</div>`;
    }
    if (englishTB[v]) {
      html += `<div class="english tb"><span class="version-label">Today's Bible</span>${englishTB[v]}</div>`;
    }
    html += '</div>';

    const toks = greek[v] || [];
    if (toks.length) {
      html += `<div class="greek-verse">${escapeHtml(toks.map(t => t.word || '').join(' '))}</div>`;
    }

    html += '<div class="interlinear">';
    for (const tok of toks) {
      const strongs = tok.strongs || '';
      const morph = tok.morph || '';
      const word = tok.word || '';
      const gloss = buildGloss(tok, shortGlosses);
      const posClass = morphToPosClass(morph);
      html += `<div class="word ${escapeHtml(posClass)}" data-strongs="${escapeHtml(strongs)}" data-morph="${escapeHtml(morph)}">`;
      html += `<span class="greek">${escapeHtml(word)}</span>`;
      if (gloss) html += `<span class="gloss">${escapeHtml(gloss)}</span>`;
      html += `<span class="morph">${escapeHtml(morph)}</span>`;
      html += `<span class="strongs">${escapeHtml(strongs)}</span>`;
      html += '</div>';
    }
    html += '</div></section>';
  }
  main.innerHTML = html;
  bindWordClicks();
}

function bindWordClicks() {
  document.querySelectorAll('.word').forEach(el => {
    el.addEventListener('click', () => {
      const strongs = el.dataset.strongs;
      const morph = el.dataset.morph || '';
      if (!strongs) return;

      const panel = document.getElementById('dict-panel');
      const content = document.getElementById('dict-content');
      content.innerHTML = '<p>Loading…</p>';
      panel.classList.remove('hidden');

      const row = lookupStrongs(strongs);
      const morphInfo = decodeMorph(morph);

      // Morphology block (same idea as dict.php morphInfo)
      let morphHtml = '';
      if (morphInfo && Object.keys(morphInfo).length) {
        morphHtml = '<div class="morph-breakdown"><h4>Morphology</h4><ul>';
        for (const [k, v] of Object.entries(morphInfo)) {
          morphHtml += `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`;
        }
        morphHtml += '</ul></div>';
      } else if (morph) {
        morphHtml = `<p><strong>Morph:</strong> ${escapeHtml(morph)}</p>`;
      }

      if (!row) {
        const s = normalizeStrongs(strongs);
        content.innerHTML = `
          <h3>${escapeHtml(s)}</h3>
          ${morphHtml}
          <p>No entry found in Today's Greek Dictionary for ${escapeHtml(s)}.</p>
        `;
        return;
      }

      // Lemma line — match dict.php
      const extra = [];
      if (row.transliteration) extra.push(row.transliteration);
      if (row.pronunciation)  extra.push(row.pronunciation);
      if (row.part_of_speech) extra.push(row.part_of_speech);

      let lemmaHtml = escapeHtml(row.greek_word || '');
      if (extra.length) {
        lemmaHtml += ` <span style="color:#666;font-size:0.9em">(${escapeHtml(extra.join(' · '))})</span>`;
      }

      // Definition parts — same order & labels as dict.php
      const parts = [];
      if (row.etymology) {
        parts.push(`<p><strong>Etymology:</strong> ${escapeHtml(row.etymology).replace(/\n/g, '<br>')}</p>`);
      }
      if (row.definition) {
        parts.push(`<p><strong>Translation:</strong> ${escapeHtml(row.definition).replace(/\n/g, '<br>')}</p>`);
      }
      if (row.comments) {
        parts.push(`<p><strong>Comments:</strong> ${escapeHtml(row.comments).replace(/\n/g, '<br>')}</p>`);
      }
      if (row.mounce) {
        parts.push(`<p><strong>Mounce:</strong> ${escapeHtml(row.mounce).replace(/\n/g, '<br>')}</p>`);
      }
      if (row.thayer) {
        parts.push(`<p><strong>Thayer:</strong> ${escapeHtml(row.thayer).replace(/\n/g, '<br>')}</p>`);
      }
      if (row.dodson) {
        parts.push(`<p><strong>Dodson:</strong> ${escapeHtml(row.dodson).replace(/\n/g, '<br>')}</p>`);
      }
      if (row.kjv_terms) {
        parts.push(`<p><strong>KJV terms:</strong> ${escapeHtml(row.kjv_terms)}</p>`);
      }

      const definitionHtml = parts.join('\n') || 'No definition text available.';

      content.innerHTML = `
        <h3>${escapeHtml(row.strong_number)}</h3>
        <p><strong>${lemmaHtml}</strong></p>
        ${morphHtml}
        <div>${definitionHtml}</div>
      `;
    });
  });
}

// ---------- Boot ----------
async function main() {
  const params = new URLSearchParams(location.search);
  const bookKey = params.get('book') || 'Matthew';
  const chapter = Math.max(1, parseInt(params.get('chapter') || '1', 10));
  const bookInfo = getBookInfo(bookKey);

  document.getElementById('book-select').value = bookInfo.key;
  document.getElementById('chapter-input').value = chapter;

  document.getElementById('nav-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const b = document.getElementById('book-select').value;
    const c = document.getElementById('chapter-input').value;
    location.search = `?book=${encodeURIComponent(b)}&chapter=${encodeURIComponent(c)}`;
  });

  document.getElementById('close-dict').addEventListener('click', () => {
    document.getElementById('dict-panel').classList.add('hidden');
  });

  try {
    await loadDictionary();
    const [englishBV, englishTB, greek] = await Promise.all([
      loadEnglishVersion('BV.bu.txt', bookInfo.engTitle, chapter),
      loadEnglishVersion('LivingBV.bu.txt', bookInfo.engTitle, chapter),
      loadGreekTokens('data/opengnt/' + bookInfo.json, chapter),
    ]);

    const allStrongs = [];
    for (const verseTokens of Object.values(greek)) {
      for (const tok of verseTokens) {
        if (tok.strongs) allStrongs.push(tok.strongs);
      }
    }
    const shortGlosses = getShortGlosses(allStrongs);
    renderChapter(bookInfo, chapter, englishBV, englishTB, greek, shortGlosses);
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML =
      `<p><strong>Error loading data.</strong> ${escapeHtml(err.message)}</p>`;
  }
}

main();