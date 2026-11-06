// Read-aloud for the chapter card, using the browser's own speech (no service, no cost).

const RANK = [/^en[-_]NG/i, /^en[-_]GB/i, /^en[-_]US/i, /^en/i];

/**
 * The best English voice on this device: Nigerian English first, then British, American, any English;
 * within a language, a "Natural"/"Neural" voice first, then the system default (Macs list joke voices too).
 * @template {{ lang: string, name: string, default?: boolean }} V
 * @param {V[]} voices
 * @returns {V | null}
 */
export function pickVoice(voices) {
	for (const re of RANK) {
		const match = voices.filter((v) => re.test(v.lang));
		if (match.length)
			return match.find((v) => /natural|neural/i.test(v.name)) ?? match.find((v) => v.default) ?? match[0];
	}
	return null;
}
