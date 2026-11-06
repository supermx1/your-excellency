// Longitude/latitude → the Nigeria SVG map's coordinates, using the fit written by build-world.mjs.
import region from './data/region.json';

export const SVG_FIT = region.fit;
export const NIGERIA_CENTRE = [8.1, 9.6];

/** @param {number} lat */
const mercator = (lat) => (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** @param {[number, number]} lonLat @returns {[number, number]} */
export function lonLatToSvg([lon, lat]) {
	const { kind, a, b, c, d } = SVG_FIT;
	return [a * lon + b, c * (kind === 'mercator' ? mercator(lat) : lat) + d];
}

// Neighbours aren't simulated, so they keep their real-history names in every run.
// [from year, name] pairs, oldest first. Approximate dates of colonial rule and independence.
/** @type {Record<string, [number, string][]>} */
const NEIGHBOUR_NAMES = {
	BEN: [[1850, 'Dahomey'], [1894, 'French Dahomey'], [1960, 'Dahomey'], [1975, 'Benin']],
	TGO: [[1850, 'Ewe states'], [1884, 'German Togoland'], [1916, 'French Togoland'], [1960, 'Togo']],
	NER: [[1850, 'Damagaram and Aïr'], [1900, 'French Niger'], [1960, 'Niger']],
	TCD: [[1850, 'Baguirmi and Wadai'], [1900, 'French Chad'], [1960, 'Chad']],
	CMR: [[1850, 'Adamawa and Duala lands'], [1884, 'German Kamerun'], [1916, 'French Cameroun'], [1960, 'Cameroon']],
	GNQ: [[1850, 'Fernando Po'], [1968, 'Equatorial Guinea']]
};

/** @param {string} id ISO code @param {number} year @returns {string | undefined} */
export function neighbourName(id, year) {
	return NEIGHBOUR_NAMES[id]?.findLast(([from]) => from <= year)?.[1];
}
