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
