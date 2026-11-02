import {test} from 'node:test';import assert from 'node:assert/strict';import {findPhrase,englishFor,phrases} from '../phrases.js';
test('matches Korean input with spaces and punctuation',()=>assert.equal(findPhrase('나 지금 가는 중이야!').en,'I’m on my way!'));
test('unsupported input is not represented as a translation',()=>assert.equal(findPhrase('양자역학에 대해 설명해주세요'),null));
test('polite tone selects a different expression',()=>{for(const p of phrases){assert.notEqual(englishFor(p,'casual'),englishFor(p,'polite'));assert.ok(p.explain);assert.equal(p.alts.length,2);}});
test('every example resolves to itself',()=>{for(const p of phrases)assert.equal(findPhrase(p.ko),p);});
