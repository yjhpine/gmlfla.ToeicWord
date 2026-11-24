import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { IMPORTANT_STORAGE_KEY, isImportantWord, loadImportantWords, toggleImportantWord } from '../src/lib/important.ts';
import {
  REGISTERED_STORAGE_KEY,
  editRegisteredWord,
  loadRegisteredBlocks,
  registerEntries,
  saveRegistrationTable,
  registeredWordLocations,
  registerWord,
  removeRegisteredWord,
  renameRegisteredBlock,
  registeredLabelForDay,
  registeredQuizDates,
  registeredToQuizWords,
} from '../src/lib/registered.ts';

const word = (value, meaning = '뜻') => ({
  word: value, meaning, example: '', registeredAt: '2026-01-01T00:00:00.000Z',
});
const blockIn = (category) => loadRegisteredBlocks().find((b) => b.category === category);

beforeEach(() => {
  const values = new Map();
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    },
  });
});
afterEach(() => { delete globalThis.window; });

test('new stores have independent general, LC and RC blocks with stable IDs', () => {
  const blocks = loadRegisteredBlocks();
  assert.deepEqual(blocks.map((b) => [b.category, b.name, b.words.length]), [
    ['general', '등록 1', 0], ['LC', '등록 1', 0], ['RC', '등록 1', 0],
  ]);
  assert.equal(new Set(blocks.map((b) => b.id)).size, 3);
  assert.deepEqual(loadRegisteredBlocks(), blocks);
});

test('existing v2 words pack in order and retain names, IDs and bookmark identities', () => {
  const old = [
    { id: 'old-1', name: '내 단어', words: [word('old')] },
    { id: 'old-2', name: '복습', words: [word('review')] },
  ];
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify({ version: 2, blocks: old }));
  const blocks = loadRegisteredBlocks();
  assert.deepEqual(blocks.slice(0, 2), [
    { ...old[0], category: 'general', words: [...old[0].words, { ...old[1].words[0], bookmarkDay: -2 }] },
    { ...old[1], category: 'general', words: [] },
  ]);
  assert.deepEqual(blocks.slice(2).map((b) => [b.category, b.words.length]), [['LC', 0], ['RC', 0]]);
  assert.equal(registeredLabelForDay(-1), '내 단어');
  assert.equal(registeredLabelForDay(-2), '복습');
  assert.deepEqual(registeredToQuizWords([-1]).map((w) => w.word), ['old', 'review']);
  assert.deepEqual(registeredToQuizWords([-2]), []);
  assert.deepEqual(loadRegisteredBlocks(), blocks);
});

test('v1 legacy words remain in general blocks; migration repeats without duplication', () => {
  const words = Array.from({ length: 21 }, (_, i) => word(`legacy-${i}`));
  window.localStorage.setItem('heelim-toeic-registered-v1', JSON.stringify(words));
  const blocks = loadRegisteredBlocks();
  assert.deepEqual(blocks.filter((b) => b.category === 'general').flatMap((b) => b.words), words);
  assert.deepEqual(blocks.map((b) => b.words.length), [20, 1, 0, 0]);
  assert.deepEqual(loadRegisteredBlocks(), blocks);
});

test('fragmented RC blocks pack on load, reuse their slots and keep dates and bookmarks when cards move', () => {
  const rc = blockIn('RC');
  const initial = loadRegisteredBlocks();
  const first = initial.find((b) => b.id === rc.id);
  first.words = ['a', 'b', 'c'].map((s) => word(s));
  const moved = { ...word('d'), registeredAt: '2026-01-02T00:00:00Z' };
  const second = { ...rc, id: 'later', name: '등록 2', words: [moved, word('e')] };
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify({ version: 2, blocks: [...initial, second] }));
  const oldQuizWord = { day: -4, word: 'd', meaning: '뜻', example: '', exampleMeaning: '' };
  toggleImportantWord(oldQuizWord);

  const sizes = () => loadRegisteredBlocks().filter((b) => b.category === 'RC').map((b) => b.words.length);
  assert.deepEqual(sizes(), [5, 0]);
  assert.equal(blockIn('RC').words[3].registeredAt, moved.registeredAt);
  const current = registeredToQuizWords([-3]).find((w) => w.word === 'd');
  assert.equal(isImportantWord(current), true);
  assert.equal(registeredLabelForDay(-4, oldQuizWord), 'RC 등록 1');
  assert.equal(editRegisteredWord(rc.id, blockIn('RC').words[3], word('draft', '초안')).ok, true);
  assert.equal(loadImportantWords()[0].word, 'draft');
  assert.equal(isImportantWord(registeredToQuizWords([-3])[3]), true);

  registerEntries(Array.from({ length: 18 }, (_, i) => word('test-' + i)), rc.id);
  assert.deepEqual(sizes(), [20, 3]);
  const more = registerEntries([word('one'), word('two')], rc.id);
  assert.equal(more.firstBlock.id, second.id);
  assert.equal(more.newBlockCount, 0);
  assert.deepEqual(sizes(), [20, 5]);
  const bookmarked = registeredToQuizWords([-4])[0];
  toggleImportantWord(bookmarked);
  removeRegisteredWord(rc.id, blockIn('RC').words[0]);
  assert.deepEqual(sizes(), [20, 4]);
  const shifted = registeredToQuizWords([-3]).find((w) => w.word === bookmarked.word);
  assert.equal(isImportantWord(shifted), true);
  assert.equal(toggleImportantWord(shifted), false);
});

test('the same word can be registered separately in general, LC and RC', () => {
  for (const category of ['general', 'LC', 'RC']) {
    registerWord(word('shared', category), blockIn(category).id);
  }
  const lc = blockIn('LC');
  registerWord(word('SHARED', 'updated LC'), lc.id);
  assert.equal(blockIn('general').words[0].meaning, 'general');
  assert.equal(blockIn('RC').words[0].meaning, 'RC');
  assert.deepEqual(blockIn('LC').words.map((w) => w.meaning), ['updated LC']);
});

test('overflow stays in its category and keeps other empty blocks and quiz IDs', () => {
  const initial = loadRegisteredBlocks();
  const lc = blockIn('LC');
  const rc = blockIn('RC');
  for (let i = 0; i < 20; i++) registerWord(word(`lc-${i}`), lc.id);
  const result = registerWord(word('lc-overflow'), lc.id);
  assert.equal(result.createdNewBlock, true);
  assert.deepEqual(result.blocks.slice(0, 3).map((b) => b.id), initial.map((b) => b.id));
  const extra = result.blocks.find((b) => b.id === result.blockId);
  assert.equal(extra.category, 'LC');
  assert.equal(extra.name, '등록 2');
  registerWord(word('rc-word'), rc.id);
  assert.deepEqual(registeredToQuizWords([-3]).map((w) => w.word), ['rc-word']);
  assert.deepEqual(registeredToQuizWords([-4]).map((w) => w.word), ['lc-overflow']);
  assert.equal(registeredLabelForDay(-4), 'LC 등록 2');
});

test('one batch preserves input order across blocks, existing examples and other categories', () => {
  const rc = blockIn('RC');
  registerWord({ ...word('draft'), example: 'A draft.' }, rc.id);
  registerWord(word('draft', 'LC 뜻'), blockIn('LC').id);
  for (let i = 0; i < 18; i++) registerWord(word('old-' + i), rc.id);
  const rows = [{ word: ' DRAFT ', meaning: '초안' }, ...Array.from({ length: 23 }, (_, i) => word('new-' + i))];
  let writes = 0;
  const store = window.localStorage;
  const setItem = store.setItem;
  store.setItem = (key, value) => { writes++; setItem(key, value); };
  const result = registerEntries(rows, rc.id);
  assert.equal(result.ok, true);
  assert.equal(writes, 1);
  assert.equal(result.count, 24);
  assert.equal(result.newBlockCount, 2);
  assert.equal(result.firstBlock.id, rc.id);
  const reading = loadRegisteredBlocks().filter((b) => b.category === 'RC');
  assert.deepEqual(reading.map((b) => b.words.length), [20, 20, 2]);
  assert.deepEqual(reading.flatMap((b) => b.words).filter((w) => !w.word.startsWith('old-')).map((w) => w.word),
    rows.map((w) => w.word.trim()));
  assert.equal(reading[0].words[0].example, 'A draft.');
  assert.equal(blockIn('LC').words[0].meaning, 'LC 뜻');
});

test('batch registration skips blank rows, rejects incomplete or duplicate rows and can retry a failed write', () => {
  const lc = blockIn('LC');
  registerWord({ ...word('Wait.'), isSentence: true }, lc.id);
  const before = window.localStorage.getItem(REGISTERED_STORAGE_KEY);
  const blank = { word: ' ', meaning: '' };
  for (const rows of [[blank], [word('Wait.'), blank, { word: '', meaning: '뜻' }], [word('Wait.'), word(' WAIT. ')]]) {
    assert.equal(registerEntries(rows, lc.id).ok, false);
    assert.equal(window.localStorage.getItem(REGISTERED_STORAGE_KEY), before);
  }
  const rows = [blank, word('Wait.'), word('Ready')];
  const store = window.localStorage;
  const write = store.setItem;
  store.setItem = () => { throw new Error('quota'); };
  assert.equal(registerEntries(rows, lc.id).ok, false);
  assert.equal(store.getItem(REGISTERED_STORAGE_KEY), before);
  store.setItem = write;
  assert.equal(registerEntries(rows, lc.id).count, 2);
  assert.deepEqual(blockIn('LC').words.map((w) => [w.word, !!w.isSentence]),
    [['Wait.', false], ['Ready', false], ['Wait.', true]]);
});

test('renaming and removing the last word retain group identity and quiz indices', () => {
  const initial = loadRegisteredBlocks();
  const lc = blockIn('LC');
  const rc = blockIn('RC');
  registerWord(word('listen'), lc.id);
  registerWord(word('read'), rc.id);
  renameRegisteredBlock(lc.id, '듣기 복습');
  removeRegisteredWord(lc.id, 'listen');
  assert.deepEqual(loadRegisteredBlocks().map((b) => b.id), initial.map((b) => b.id));
  assert.equal(blockIn('LC').name, '듣기 복습');
  assert.equal(blockIn('LC').words.length, 0);
  assert.equal(registeredLabelForDay(-2), 'LC 듣기 복습');
  assert.deepEqual(registeredToQuizWords([-3]).map((w) => w.word), ['read']);
});

test('calls without a block ID continue registering in the general group', () => {
  registerWord(word('original'));
  assert.deepEqual(blockIn('general').words.map((w) => w.word), ['original']);
  assert.equal(blockIn('LC').words.length, 0);
  assert.equal(blockIn('RC').words.length, 0);
});

test('card deletion requires the confirmed RC entry and preserves other copies', () => {
  const original = word('draft', '초안');
  const other = word('draft', '외풍');
  const blocks = loadRegisteredBlocks();
  const rc = blocks.find((b) => b.category === 'RC');
  const lc = blocks.find((b) => b.category === 'LC');
  rc.words = [original, other];
  lc.words = [original];
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify({ version: 2, blocks }));

  assert.equal(removeRegisteredWord(rc.id, { ...original, meaning: '이전 뜻' }), null);
  assert.deepEqual(blockIn('RC').words, [original, other]);
  removeRegisteredWord(rc.id, original);
  assert.deepEqual(blockIn('RC').words, [other]);
  assert.equal(removeRegisteredWord(rc.id, original), null);
  assert.deepEqual(blockIn('LC').words, [original]);
});

test('LC sentences and words with the same text keep separate meanings in study, quiz and review', () => {
  const lc = blockIn('LC');
  const text = 'Please hold.';
  registerWord({ word: text, meaning: '기존 뜻', example: '기존 예문' }, lc.id);
  const sentence = { word: text, meaning: '기다려 주세요.', example: '', isSentence: true };
  registerWord(sentence, lc.id);
  registerWord({ ...sentence, word: '  Please hold.  ', meaning: '잠시만 기다려 주세요.' }, lc.id);

  assert.equal(blockIn('LC').words.length, 2);
  const [quizSentence, quizWord] = registeredToQuizWords([-2]);
  assert.equal(quizSentence.word, text);
  assert.equal(quizSentence.meaning, '잠시만 기다려 주세요.');
  assert.equal(quizSentence.isSentence, true);
  assert.equal(quizWord.example, '기존 예문');
  assert.equal(toggleImportantWord(quizWord), true);
  assert.equal(toggleImportantWord(quizSentence), true);
  assert.deepEqual(loadImportantWords(), [quizWord, quizSentence]);
  removeRegisteredWord(lc.id, text, true);
  assert.deepEqual(registeredToQuizWords([-2]), [quizWord]);
});

test('quiz dates group only the chosen area by Korean date and preserve block references', () => {
  const at = (value, date) => ({ ...word(value), registeredAt: date });
  const evening = '2026-11-17T14:59:59Z';
  const midnight = '2026-11-17T15:00:00Z';
  const blocks = [
    { id: 'g', name: '일반', category: 'general', words: [at('general', midnight)] },
    { id: 'a', name: '회의', category: 'LC', words: [at('before', evening), at('after', midnight)] },
    { id: 'r', name: '읽기', category: 'RC', words: [at('reading', midnight)] },
    { id: 'b', name: '공지', category: 'LC', words: [{ ...at('Please wait.', midnight), isSentence: true }, at('legacy', 'unknown')] },
  ];
  const dates = registeredQuizDates(blocks, 'LC');
  assert.deepEqual(dates.map(([date]) => date), ['2026-11-18', '2026-11-17', '']);
  assert.deepEqual(dates[0][1].map((range) => [range.name, range.words[0].day, range.words[0].word]), [
    ['회의', -2, 'after'], ['공지', -4, 'Please wait.'],
  ]);
  assert.equal(dates[0][1][1].words[0].isSentence, true);
  assert.notEqual(dates[0][1][0].id, dates[1][1][0].id);
  assert.deepEqual(registeredQuizDates(blocks, 'LC', 'korean-first-sentence'), [['2026-11-18', [dates[0][1][1]]]]);
  assert.deepEqual(registeredQuizDates(blocks, 'LC', 'korean-first-word'), [
    ['2026-11-18', [dates[0][1][0]]], dates[1], dates[2],
  ]);
  for (const area of ['general', 'RC']) {
    assert.deepEqual(registeredQuizDates(blocks, area, 'korean-first-word'), registeredQuizDates(blocks, area));
  }
  assert.deepEqual(registeredQuizDates([], 'RC'), []);
});

test('editing a legacy entry in a full block keeps its position, date and bookmarked quiz content', () => {
  const original = { ...word('reciept'), example: 'Old example.' };
  const words = Array.from({ length: 20 }, (_, i) => i === 7 ? original : word('other-' + i));
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify({ version: 2, blocks: [
    { id: 'old', name: '기존 블록', words },
  ] }));
  toggleImportantWord(registeredToQuizWords([-1])[7]);
  const result = editRegisteredWord('old', original, { word: ' receipt ', meaning: ' 영수증 ', example: ' A receipt. ' });
  assert.equal(result.ok, true);
  assert.equal(result.index, 7);
  const expected = { ...original, word: 'receipt', meaning: '영수증', example: 'A receipt.' };
  assert.deepEqual(blockIn('general').words, words.map((w, i) => i === 7 ? expected : w));
  assert.equal(loadRegisteredBlocks().length, 3);
  assert.deepEqual(loadImportantWords(), [registeredToQuizWords([-1])[7]]);
  assert.equal(registeredQuizDates(loadRegisteredBlocks(), 'general')[0][0], '2026-01-01');
});

test('sentence edits reject same-kind collisions and stale drafts while keeping a same-text word', () => {
  const lc = blockIn('LC');
  const rc = blockIn('RC');
  registerWord({ ...word('Wait.'), isSentence: true }, lc.id);
  const original = blockIn('LC').words[0];
  toggleImportantWord(registeredToQuizWords([-2])[0]);
  registerWord(word('Wait.'), lc.id);
  toggleImportantWord(registeredToQuizWords([-2])[0]);
  registerWord({ ...word('Listen.'), isSentence: true }, lc.id);
  registerWord(word('Please wait.'), rc.id);
  const before = loadRegisteredBlocks();
  assert.equal(editRegisteredWord(lc.id, original, word(' listen. ')).ok, false);
  assert.equal(editRegisteredWord(lc.id, original, word('   ')).ok, false);
  assert.deepEqual(loadRegisteredBlocks(), before);
  const result = editRegisteredWord(lc.id, original, word('Please wait.', '기다려 주세요.'));
  assert.equal(result.index, 2);
  assert.deepEqual(result.block.words[2], { ...original, word: 'Please wait.', meaning: '기다려 주세요.' });
  assert.equal(result.block.words[1].word, 'Wait.');
  assert.equal(editRegisteredWord(lc.id, original, word('Stale')).ok, false);
  const quiz = registeredToQuizWords([-2]);
  assert.deepEqual(loadImportantWords(), [quiz[2], quiz[1]]);
  assert.deepEqual(blockIn('RC'), before.find((b) => b.id === rc.id));
});

test('a failed bookmark write leaves the word and its bookmark available for retry', () => {
  const block = blockIn('RC');
  registerWord(word('banquet'), block.id);
  const original = blockIn('RC').words[0];
  const quizWord = registeredToQuizWords([-3])[0];
  toggleImportantWord(quizWord);
  const store = window.localStorage;
  const setItem = store.setItem;
  store.setItem = (key, value) => {
    if (key === IMPORTANT_STORAGE_KEY) throw new Error('quota');
    setItem(key, value);
  };
  assert.equal(editRegisteredWord(block.id, original, word('banquet', '연회')).ok, false);
  assert.deepEqual(blockIn('RC').words[0], original);
  assert.deepEqual(loadImportantWords(), [quizWord]);
  store.setItem = setItem;
  assert.equal(editRegisteredWord(block.id, original, word('banquet', '연회')).ok, true);
  assert.equal(loadImportantWords()[0].meaning, '연회');
});

test('table edits and additions commit together, preserving dates, order, sentence types and swapped bookmarks', () => {
  const id = blockIn('LC').id;
  registerEntries([word('first'), word('second')], id);
  registerWord({ ...word('Please wait.'), isSentence: true }, id);
  const original = blockIn('LC');
  for (const entry of registeredToQuizWords([-2])) toggleImportantWord(entry);
  const rows = [word('Hold on.', '기다리세요'), word('second', '두 번째'), word('first', '첫 번째'), word('', ''), word('new')];
  const saved = saveRegistrationTable(original, rows);
  assert.equal(saved.ok, true);
  assert.deepEqual([saved.edited, saved.added], [3, 1]);
  const after = blockIn('LC').words;
  assert.deepEqual(after.map((w) => w.word), ['Hold on.', 'second', 'first', 'new']);
  assert.deepEqual(after.slice(0, 3).map((w) => w.registeredAt), original.words.map((w) => w.registeredAt));
  assert.equal(after[0].isSentence, true);
  assert.deepEqual(loadImportantWords(), registeredToQuizWords([-2]).slice(0, 3));
  assert.equal(saveRegistrationTable(original, rows).ok, false);
});

test('invalid, empty and failed table saves preserve the original records and allow a retry', () => {
  const id = blockIn('RC').id;
  registerEntries([word('keep'), word('change')], id);
  const original = blockIn('RC');
  toggleImportantWord(registeredToQuizWords([-3])[1]);
  const blank = word('', '');
  const rows = [blank, word('changed', '수정'), word('added')];
  assert.equal(saveRegistrationTable(original, [blank, blank]).ok, false);
  assert.equal(saveRegistrationTable(original, [...rows, word('bad','')]).rowIndex, 3);
  assert.equal(saveRegistrationTable(original, [...rows, word('changed')]).rowIndex, 3);
  assert.equal(saveRegistrationTable(original, [blank, word('keep')]).rowIndex, 1);
  const store = window.localStorage;
  const write = store.setItem;
  store.setItem = (key, value) => { if (key === IMPORTANT_STORAGE_KEY) throw Error('quota'); write(key, value); };
  assert.equal(saveRegistrationTable(original, rows).ok, false);
  assert.deepEqual(blockIn('RC'), original);
  assert.equal(loadImportantWords()[0].word, 'change');
  store.setItem = write;
  assert.equal(saveRegistrationTable(original, rows).ok, true);
  assert.deepEqual(blockIn('RC').words.map((w) => w.word), ['keep', 'changed', 'added']);
});

test('duplicate lookup lists exact word locations and appends a typed meaning only to the selected entry', () => {
  const lc = blockIn('LC');
  const rc = blockIn('RC');
  const general = blockIn('general');
  registerWord({ ...word('Charge', '충전하다'), example: 'Charge the phone.' }, rc.id);
  renameRegisteredBlock(rc.id, '요금');
  registerWord(word('charge', '요금'), lc.id);
  registerWord({ ...word('charge', '문장 뜻'), isSentence: true }, lc.id);
  const matches = registeredWordLocations(loadRegisteredBlocks()).get('charge');
  assert.deepEqual(matches.map((m) => m.label), ['LC · 등록 1 · 2행', 'RC · 요금 · 1행']);
  const target = matches[1];
  toggleImportantWord(registeredToQuizWords([-3])[0]);
  const row = { word: '  CHARGE  ', meaning: '청구하다' };
  const initial = loadRegisteredBlocks();
  const pending = saveRegistrationTable(general, [row, word('also')]);
  assert.equal(pending.rowIndex, 0);
  assert.match(pending.error, /RC · 요금 · 1행/);
  assert.deepEqual(loadRegisteredBlocks(), initial);
  const result = saveRegistrationTable(general, [{ ...row, meaningTarget: target }, word('also')]);
  assert.equal(result.ok, true);
  assert.deepEqual([result.added, result.meaningsAdded], [1, 1]);
  assert.deepEqual(blockIn('RC').words, [{ ...target.entry, meaning: '충전하다 / 청구하다' }]);
  assert.deepEqual(blockIn('general').words.map((w) => w.word), ['also']);
  assert.deepEqual(blockIn('LC'), initial.find((b) => b.id === lc.id));
  assert.equal(loadImportantWords()[0].meaning, '충전하다 / 청구하다');
  assert.equal(saveRegistrationTable(blockIn('general'), [...blockIn('general').words, { ...row, meaningTarget: target }]).ok, false);
  const refreshed = registeredWordLocations(loadRegisteredBlocks()).get('charge')[1];
  assert.equal(saveRegistrationTable(blockIn('general'), [...blockIn('general').words, { ...row, meaningTarget: refreshed }]).ok, false);
  assert.equal(saveRegistrationTable(blockIn('general'), [...blockIn('general').words, { ...row, meaningTarget: 'separate' }]).ok, true);
});

test('registering from a different block in the same area cannot relocate or overwrite a duplicate', () => {
  const rc = blockIn('RC');
  registerEntries(Array.from({ length: 21 }, (_, i) => word('term' + i)), rc.id);
  const tail = loadRegisteredBlocks().filter((b) => b.category === 'RC')[1];
  const original = blockIn('RC').words[0];
  const target = registeredWordLocations(loadRegisteredBlocks()).get(original.word)[0];
  const row = { word: original.word, meaning: '추가 뜻' };
  assert.equal(saveRegistrationTable(tail, [...tail.words, row]).ok, false);
  assert.equal(saveRegistrationTable(tail, [...tail.words, { ...row, meaningTarget: 'separate' }]).ok, false);
  assert.deepEqual(blockIn('RC').words[0], original);
  const saved = saveRegistrationTable(tail, [...tail.words, { ...row, meaningTarget: target }]);
  assert.equal(saved.ok, true);
  assert.equal(saved.block.id, rc.id);
  assert.deepEqual(loadRegisteredBlocks().filter((b) => b.category === 'RC').map((b) => b.words.length), [20,1]);
  assert.deepEqual(blockIn('RC').words[0], { ...original, meaning: '뜻 / 추가 뜻' });
});
