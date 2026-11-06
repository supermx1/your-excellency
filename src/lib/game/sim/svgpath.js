// @ts-nocheck
// Parses the @svg-maps/nigeria state paths (they only use relative `m` and `z`).

/** Paths only use `m` (relative, implicit lineto) and `z`. Returns rings of [x,y]. */
export function parsePath(d) {
	const rings = [];
	let ring = null;
	let x = 0;
	let y = 0;
	for (const token of d.match(/[mz]|-?\d*\.?\d+(?:e-?\d+)?,-?\d*\.?\d+(?:e-?\d+)?/gi)) {
		if (token === 'm') {
			ring = [];
			rings.push(ring);
		} else if (token === 'z') {
			ring = null;
		} else {
			const [dx, dy] = token.split(',').map(Number);
			if (!ring) {
				ring = [];
				rings.push(ring);
			}
			x += dx;
			y += dy;
			ring.push([x, y]);
		}
	}
	return rings.filter((r) => r.length > 2);
}
