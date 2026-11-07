// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { compositionHtml } from './composition.js';

const cues = [
	{ chapter: 0, start: 6, seconds: 12.5 },
	{ chapter: 2, start: 30.25, seconds: 9 }
];

describe('compositionHtml', () => {
	const html = compositionHtml({ width: 1920, height: 1080, duration: 80.5, cues });

	it('sizes the root and sets its length', () => {
		expect(html).toMatch(/id="root"[^>]*data-width="1920"[^>]*data-height="1080"[^>]*data-duration="80.500"/);
	});

	it('is a standalone root: no template, no crossorigin', () => {
		expect(html).not.toMatch(/<template|crossorigin/);
	});

	it('gives every chapter its own timed voice clip', () => {
		for (const c of cues)
			expect(html).toContain(`<audio id="narr-${c.chapter}" class="clip" src="audio/chapter-${c.chapter}.wav" data-start="${c.start.toFixed(3)}" data-duration="${c.seconds.toFixed(3)}"`);
	});

	it('takes the clip files of a Short', () => {
		const short = compositionHtml({ width: 1080, height: 1350, duration: 10, cues: [{ id: 'line-0', file: 'audio/line-ab12.wav', start: 0, seconds: 3 }] });
		expect(short).toContain('<audio id="narr-line-0" class="clip" src="audio/line-ab12.wav" data-start="0.000" data-duration="3.000"');
	});

	it('takes 4K sizes', () => {
		expect(compositionHtml({ width: 3840, height: 2160, duration: 10, cues: [] })).toMatch(/data-width="3840" data-height="2160"/);
	});
});
