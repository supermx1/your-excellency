import { describe, expect, it } from 'vitest';
import { polish, speakable, tokenIds } from './kitten.js';

describe('kitten voice front end', () => {
	it('reads years, numbers, money and percentages the way a narrator would', () => {
		expect(speakable('In 1914, by 1960, about 45 million.')).toBe(
			'In nineteen fourteen, by nineteen sixty, about forty-five million.'
		);
		expect(speakable('the 1980s, 1905 and 2005')).toBe('the nineteen eighties, nineteen oh five and two thousand and five');
		expect(speakable('3.5% of ₦200 million; 1,250 people')).toBe(
			'three point five percent of two hundred million naira; one thousand two hundred and fifty people'
		);
	});

	it('pads token ids like KittenTTS and keeps punctuation', () => {
		// "$" pad 0 · "," is 3 · end marker 10 (the space symbol) · pad 0
		expect(tokenIds('a,')).toEqual([0, 43, 16, 3, 10, 0]);
	});

	it('fades the edges and levels loudness without clipping', () => {
		const s = polish(new Float32Array(2400).fill(2), 24000);
		expect(s[0]).toBe(0);
		expect(Math.max(...s)).toBeCloseTo(0.8);
	});
});
