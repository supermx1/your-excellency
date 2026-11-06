// Text front end for the KittenTTS Nano voice (runs in tts.worker.js).
// Symbol table and [0, …, 10, 0] padding are from KittenTTS (Apache-2.0, KittenML), via kitten-tts-js.

const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = [
	[1e12, 'trillion'],
	[1e9, 'billion'],
	[1e6, 'million'],
	[1e3, 'thousand']
];

/** 312 → "three hundred and twelve" (Nigerian and British English keep the "and"). */
function under1000(/** @type {number} */ n) {
	const h = Math.floor(n / 100);
	const r = n % 100;
	const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : '');
	if (!h) return rest;
	return `${ONES[h]} hundred${r ? ` and ${rest}` : ''}`;
}

/** @param {number} n a whole number */
export function numberWords(n) {
	if (n < 1000) return under1000(n);
	for (const [size, name] of SCALES) {
		if (n >= size) {
			const r = n % size;
			return `${numberWords(Math.floor(n / size))} ${name}${r ? (r < 100 ? ' and ' : ' ') + numberWords(r) : ''}`;
		}
	}
	return String(n);
}

/** 1914 → "nineteen fourteen", 1900 → "nineteen hundred", 1905 → "nineteen oh five", 2005 → "two thousand and five". */
export function yearWords(/** @type {number} */ y) {
	if (y >= 2000 && y < 2010) return numberWords(y);
	const lo = y % 100;
	return `${numberWords(Math.floor(y / 100))} ${lo === 0 ? 'hundred' : lo < 10 ? `oh ${ONES[lo]}` : numberWords(lo)}`;
}

/** Spells out what the voice can't read: years, numbers, decimals, %, ₦. */
export function speakable(/** @type {string} */ text) {
	return text
		.replace(/₦\s?([\d,.]+)(\s*(?:thousand|million|billion|trillion))?/g, '$1$2 naira')
		.replace(/(\d)\s?%/g, '$1 percent')
		.replace(/\b(1[1-9]\d\d|20\d\d)s\b/g, (_, y) => yearWords(+y).replace(/y$/, 'ie') + 's')
		.replace(/\b(1[1-9]\d\d|20\d\d)\b(?![.,]\d)/g, (y) => yearWords(+y))
		.replace(/\d+(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g, (n) => {
			const [whole, frac] = n.replace(/,/g, '').split('.');
			return numberWords(+whole) + (frac ? ` point ${[...frac].map((d) => ONES[+d]).join(' ')}` : '');
		})
		.replace(/\s+/g, ' ')
		.trim();
}

const PUNCT = ';:,.!?¡¿—…"«»"" ';
const IPA =
	"ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";
const SYMBOLS = ['$', ...PUNCT, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', ...IPA];
const ID = new Map(SYMBOLS.map((s, i) => [s, i])); // later duplicates win, as in the Python dict

/** Splits text into word runs and punctuation runs, so punctuation reaches the model untouched. */
export function chunks(/** @type {string} */ text) {
	return text.match(/[^;:,.!?¡¿—…"«»()[\]{}]+|[;:,.!?¡¿—…"«»()[\]{}\s]+/g) ?? [];
}

/** IPA string (from espeak-ng, en-us) → model input ids. */
export function tokenIds(/** @type {string} */ phonemes) {
	const spaced = (phonemes.match(/[\p{L}\p{M}\p{N}_]+|[^\p{L}\p{M}\p{N}_\s]/gu) ?? []).join(' ');
	/** @type {number[]} */
	const ids = [];
	for (const ch of spaced) {
		const id = ID.get(ch);
		if (id !== undefined) ids.push(id);
	}
	return [0, ...ids, 10, 0];
}

/**
 * Cleans one sentence of model output in place: no clicks at the edges, the same loudness every
 * sentence, never clipping.
 * @param {Float32Array} s @param {number} rate
 */
export function polish(s, rate) {
	let peak = 0;
	for (const x of s) peak = Math.max(peak, Math.abs(x));
	const gain = peak ? Math.min(0.8 / peak, 3) : 1;
	const fade = Math.min(Math.round(rate * 0.01), s.length >> 1);
	for (let i = 0; i < s.length; i++) {
		const edge = Math.min(i, s.length - 1 - i);
		s[i] *= gain * (edge < fade ? edge / fade : 1);
	}
	return s;
}
