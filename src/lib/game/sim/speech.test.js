// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { pickVoice, sentences } from './speech.js';

const v = (lang, name = lang) => ({ lang, name });

describe('pickVoice', () => {
	it('prefers Nigerian English, then British, then any English', () => {
		expect(pickVoice([v('fr-FR'), v('en-US'), v('en-GB'), v('en-NG')]).lang).toBe('en-NG');
		expect(pickVoice([v('fr-FR'), v('en-US'), v('en-GB')]).lang).toBe('en-GB');
		expect(pickVoice([v('fr-FR'), v('en_AU')]).lang).toBe('en_AU');
	});

	it('prefers a natural voice within the same language', () => {
		expect(pickVoice([v('en-GB', 'Daniel'), v('en-GB', 'Microsoft Sonia Online (Natural)')]).name).toMatch(/Natural/);
	});

	it('otherwise takes the system default over joke voices', () => {
		expect(pickVoice([v('en-US', 'Bad News'), { lang: 'en-US', name: 'Samantha', default: true }]).name).toBe('Samantha');
	});

	it('returns null when there is no English voice', () => expect(pickVoice([v('fr-FR')])).toBeNull());
});

describe('sentences', () => {
	it('splits on full stops, question and exclamation marks, keeping the punctuation', () => {
		expect(sentences('In 1850 Kano grows. War comes!  Who wins? The end')).toEqual([
			'In 1850 Kano grows.',
			'War comes!',
			'Who wins?',
			'The end'
		]);
	});

	it('does not split decimals like 13.5 million', () => {
		expect(sentences('Population reaches 13.5 million. Then more.')).toEqual(['Population reaches 13.5 million.', 'Then more.']);
	});

	it('returns nothing for empty text', () => expect(sentences('  ')).toEqual([]));
});
