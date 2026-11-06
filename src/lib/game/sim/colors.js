// @ts-nocheck
// Stable polity colours. The 1850 states (and the British/Nigerian polities) have fixed colours;
// polities born during a run ("<capitalCell>-<year>") get a hue from their capital cell, spread so
// that different capitals land far apart, and a lightness from the year.
import { hashString } from '../engine.js';
import cells from './data/cells.json';

const FIXED = {
	sokoto: '#c9a227',
	borno: '#8a5a2b',
	ibadan: '#2f7d5b',
	// Neighbours get different hues, not four shades of one green.
	'egba-ijebu': '#b5577d',
	lagos: '#4f9fd1',
	ondo: '#a3b83a',
	benin: '#b5432f',
	igala: '#7a6bb0',
	igbo: '#3a6ea5',
	'rivers-states': '#5cc8b8',
	calabar: '#d4766a',
	'middle-belt': '#6b8f3a',
	british: '#9aa4ad',
	nigeria: '#1f7a3d'
};
const CELL_INDEX = new Map(cells.map((c, i) => [c.id, i]));

function hsl(h, s, l) {
	const k = (n) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** @param {string} id */
export function polityColor(id) {
	if (FIXED[id]) return FIXED[id];
	const [, cell, year] = id.match(/^(.*)-(\d{4})$/) ?? [];
	const index = CELL_INDEX.get(cell);
	// ponytail: 11 is coprime with 37, so the 37 capitals map to 37 distinct hues ~9.7° apart minimum.
	const hue = index !== undefined ? ((index * 11) % 37) * (360 / 37) : hashString(id) % 360;
	const light = 0.45 + ((Number(year ?? hashString(id)) % 3) * 0.06);
	return hsl(hue, 0.55, light);
}
