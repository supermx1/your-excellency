// The isometric world every cutaway is drawn in: the projection, wall signs that lie flat on angled
// walls, and a street kit of our own (zinc and clay roofs, laterite or tarred roads, palms, kiosks,
// compound walls, cars). Coordinates are floor units: x runs down-right, depth runs down-left,
// height goes up. The lot where a scene happens is x 0–153, depth 0–124.
import { box, person, tree } from './town-art.js';

export const W = 216;
export const H = 270;
export const INK = '#302a34';
export const PAPER = '#f1dfb4';
export const SKIN = ['#966041', '#b78054', '#764c3a'];
export const SHIRTS = ['#aa5747', '#536f82', '#6b8261', '#b88148'];
export const mix = (a, b, t) => a + (b - a) * t;
export const ease = (progress, start, end) => {
	const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
	return t * t * (3 - 2 * t);
};

const K = 0.7; // screen pixels per floor unit along each axis; the 2:1 isometric grid
/** The screen point of floor point (x, depth) raised by `height`. */
export const point = (x, depth, height = 0) => [
	98 + (x - depth) * K,
	100 + (x + depth) * K * 0.5 - height
];

function fill(ctx, color, points) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(...points[0]);
	for (const p of points.slice(1)) ctx.lineTo(...p);
	ctx.closePath();
	ctx.fill();
}

/** A flat rectangle on the floor (or raised to `z`). */
export function plane(ctx, color, x, y, w, d, z = 0) {
	fill(ctx, color, [
		point(x, y, z),
		point(x + w, y, z),
		point(x + w, y + d, z),
		point(x, y + d, z)
	]);
}

/** A box: its top, its face towards the viewer along depth, and its face towards the viewer along x. */
export function solid(ctx, x, y, w, d, h, [top, front, side], z = 0) {
	const face = z + h;
	fill(ctx, side, [
		point(x + w, y, z),
		point(x + w, y + d, z),
		point(x + w, y + d, face),
		point(x + w, y, face)
	]);
	fill(ctx, front, [
		point(x, y + d, z),
		point(x + w, y + d, z),
		point(x + w, y + d, face),
		point(x, y + d, face)
	]);
	plane(ctx, top, x, y, w, d, face);
}

/** A rectangle standing on a wall: along x at depth `y` (axis 'x'), or along depth at `x` (axis 'd'). */
export function wallRect(ctx, color, x, y, z, w, h, axis = 'x') {
	const [dx, dy] = axis === 'x' ? [w, 0] : [0, w];
	fill(ctx, color, [
		point(x, y, z),
		point(x + dx, y + dy, z),
		point(x + dx, y + dy, z + h),
		point(x, y, z + h)
	]);
}

/** A framed sign or board on a wall. */
export function plate(ctx, x, y, z, w, h, color, edge = INK, axis = 'x') {
	wallRect(ctx, edge, x, y, z, w, h, axis);
	const [ix, iy] = axis === 'x' ? [x + 1, y] : [x, y + 1];
	wallRect(ctx, color, ix, iy, z + 1, w - 2, h - 2, axis);
}

/** Text written flat on a wall, centred on floor point (x, depth) at height z. */
export function wallText(ctx, text, x, y, z, color, axis = 'x', size = 6) {
	const [sx, sy] = point(x, y, z);
	ctx.save();
	ctx.translate(Math.round(sx), Math.round(sy));
	ctx.transform(1, axis === 'x' ? 0.5 : -0.5, 0, 1, 0, 0);
	ctx.font = `bold ${size}px monospace`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = color;
	ctx.fillText(text, 0, 0);
	ctx.restore();
}

/** Draws `paint` with (0, 0) on floor point (x, depth) raised by `height`, `scale` times bigger. */
export function at(ctx, x, depth, height, scale, paint) {
	const [sx, sy] = point(x, depth, height);
	ctx.save();
	ctx.translate(Math.round(sx), Math.round(sy));
	ctx.scale(scale, scale);
	paint(ctx);
	ctx.restore();
}

/** A person standing on the floor. `i` picks their clothes; `look` overrides any of it. */
export function walker(ctx, i, x, y, look = {}, scale = 0.9) {
	at(ctx, x, y, 0, scale, (c) =>
		person(c, 0, 0, {
			color: SHIRTS[i % SHIRTS.length],
			skin: SKIN[i % SKIN.length],
			cap: i % 3 === 0 ? PAPER : '#574039',
			...look
		})
	);
}

// --- The street kit ---------------------------------------------------------------------------

const PLASTER = [
	['#efd3a4', '#dcb27f', '#bb8f62'],
	['#e6cfb4', '#cfae8f', '#ad8c70'],
	['#e9d9b8', '#c9b48c', '#a8936e']
];
const ROOFS = {
	zinc: ['#97a69d', '#7c8b84', '#5f6c66'],
	clay: ['#c4714a', '#a85a3a', '#86462f'],
	rust: ['#a7744f', '#8c5d3e', '#6f4a33']
};

/** A one-storey house with a pitched roof along x, a door and windows on its face to the viewer. */
export function house(
	ctx,
	x,
	d,
	w,
	dd,
	{ plaster = 0, roof = 'zinc', lit = false, height = 16 } = {}
) {
	const [top, front, side] = PLASTER[plaster % PLASTER.length];
	plane(ctx, '#00000022', x + 3, d + 3, w, dd); // shadow
	solid(ctx, x, d, w, dd, height, [top, front, side]);
	const glass = lit ? '#ffd98a' : '#5d6a72';
	for (let wx = x + 6; wx < x + w - 10; wx += 14) plate(ctx, wx, d + dd, 6, 6, 6, glass, INK);
	plate(ctx, x + w - 9, d + dd, 0, 6, 11, '#6a4a3a', INK);
	for (let wd = d + 5; wd < d + dd - 6; wd += 13) plate(ctx, x + w, wd, 6, 6, 6, glass, INK, 'd');
	// The roof: back slope, the gable at the end facing the viewer, then the front slope.
	const [slope, shade, edge] = ROOFS[roof];
	const ridge = d + dd / 2;
	const eave = height - 1;
	const peak = height + dd * 0.38;
	fill(ctx, shade, [
		point(x - 2, d - 2, eave),
		point(x + w + 2, d - 2, eave),
		point(x + w + 2, ridge, peak),
		point(x - 2, ridge, peak)
	]);
	fill(ctx, side, [
		point(x + w, d, height),
		point(x + w, d + dd, height),
		point(x + w, ridge, peak)
	]);
	fill(ctx, edge, [
		point(x - 2, ridge, peak),
		point(x + w + 2, ridge, peak),
		point(x + w + 2, d + dd + 2, eave - 1),
		point(x - 2, d + dd + 2, eave - 1)
	]);
	fill(ctx, slope, [
		point(x - 2, ridge, peak),
		point(x + w + 2, ridge, peak),
		point(x + w + 2, d + dd + 2, eave),
		point(x - 2, d + dd + 2, eave)
	]);
	for (let rx = x + 2; rx < x + w; rx += 4) {
		const [a, b] = [point(rx, ridge, peak), point(rx, d + dd + 2, eave)];
		ctx.fillStyle = shade;
		ctx.fillRect(Math.round(a[0]), Math.round(a[1]), 1, 1);
		ctx.beginPath();
		ctx.moveTo(...a);
		ctx.lineTo(...b);
		ctx.strokeStyle = shade;
		ctx.lineWidth = 0.6;
		ctx.stroke();
	}
}

/** A coconut palm. */
export function palm(ctx, x, d, scale = 1) {
	at(ctx, x, d, 0, scale, (c) => {
		box(c, '#00000022', -2, -1, 12, 3);
		for (let i = 0; i < 9; i++)
			box(
				c,
				i % 2 ? '#7a5d42' : '#8e6c4c',
				Math.round(Math.sin(i * 0.35) * 3) - 1,
				-4 - i * 4,
				3,
				4
			);
		const tx = Math.round(Math.sin(9 * 0.35) * 3);
		const ty = -40;
		for (const [dx, dy, len] of [
			[-1, 0, 14],
			[1, 0, 14],
			[-0.7, -0.6, 11],
			[0.7, -0.6, 11],
			[-0.4, 0.5, 10],
			[0.5, 0.5, 10]
		])
			for (let k = 0; k < len; k++) {
				const droop = (k * k) / len / 3;
				box(
					c,
					k % 3 ? '#4f7a3f' : '#3d6331',
					tx + Math.round(dx * k),
					ty + Math.round(dy * k + droop),
					2,
					2
				);
			}
		box(c, '#6b4d2f', tx - 1, ty, 3, 3);
	});
}

/** A neem or mango tree. */
export function shadeTree(ctx, x, d, scale = 1) {
	at(ctx, x, d, 0, scale, (c) => tree(c, 0, 0, 1));
}

/** A roadside kiosk with a striped awning. */
export function kiosk(ctx, x, d, colors = ['#b95345', '#f2d098']) {
	solid(ctx, x, d, 12, 10, 10, ['#d9b07a', '#b8875c', '#9a6f4a']);
	plate(ctx, x + 2, d + 10, 3, 8, 5, '#3d3a37', INK);
	for (let i = 0; i < 4; i++) plane(ctx, colors[i % 2], x - 1, d + 6 + i * 2, 14, 2, 13 - i);
}

/** A car on the road, along x (`facing` 1 drives down-right) or along depth. */
export function car(ctx, x, d, color, axis = 'x') {
	const [w, dd] = axis === 'x' ? [16, 8] : [8, 16];
	plane(ctx, '#00000033', x + 1, d + 1, w, dd);
	solid(ctx, x, d, w, dd, 4, [color, color, color], 1.5);
	const [cx, cd, cw, cdd] = axis === 'x' ? [x + 4, d + 1, 7, 6] : [x + 1, d + 4, 6, 7];
	solid(ctx, cx, cd, cw, cdd, 3, ['#d9e6ea', '#7d93a0', '#6a808c'], 5.5);
	for (const [wx, wd] of axis === 'x'
		? [
				[x + 2, d + 8],
				[x + 12, d + 8]
			]
		: [
				[x + 8, d + 2],
				[x + 8, d + 12]
			])
		solid(ctx, wx, wd, 2, 1, 2, [INK, INK, INK]);
}

/** A low compound wall along x or along depth. */
export function compoundWall(
	ctx,
	x,
	d,
	length,
	axis = 'x',
	colors = ['#e6cfb4', '#cfae8f', '#ad8c70']
) {
	if (axis === 'x') solid(ctx, x, d, length, 2, 6, colors);
	else solid(ctx, x, d, 2, length, 6, colors);
}

/** An electricity pole, with its wire running to the next one. */
export function powerPole(ctx, x, d, next = null) {
	solid(ctx, x, d, 1.5, 1.5, 30, ['#6b5a48', '#5b4a3a', '#4b3c30']);
	const [tx, ty] = point(x, d, 30);
	box(ctx, INK, Math.round(tx) - 4, Math.round(ty), 9, 1);
	if (!next) return;
	const [nx, ny] = point(next[0], next[1], 30);
	ctx.strokeStyle = INK;
	ctx.lineWidth = 0.6;
	ctx.beginPath();
	ctx.moveTo(tx, ty + 1);
	ctx.quadraticCurveTo((tx + nx) / 2, (ty + ny) / 2 + 5, nx, ny + 1);
	ctx.stroke();
}

// --- The street around a lot ------------------------------------------------------------------

/**
 * Behind and beside the lot: ground, the road in front of it and a side road, neighbours' houses,
 * trees and palms. `site.lot` paints an open lot (fields, a square, a pad); `site.dusk` darkens it.
 */
export function street(ctx, site, shot) {
	const dusk = site.dusk;
	const year = shot.year ?? 1990;
	const lit = site.lights?.(shot) ?? false;
	const tarred = year >= 1960;
	box(ctx, dusk ? '#5f6a5c' : '#9fa86a', -60, -60, W + 120, H + 120);
	for (let i = 0; i < 160; i++) {
		const x = ((i * 97) % 300) - 40;
		const y = ((i * 53) % 320) - 30;
		box(ctx, dusk ? '#56604f' : i % 2 ? '#8f9a5d' : '#b0b479', x, y, 3, 1);
	}
	// Roads: one along x in front of the lot, one along depth to its right; laterite before tar.
	const road = tarred ? (dusk ? '#3f3d3c' : '#5d5a57') : dusk ? '#8a6248' : '#c98a5e';
	const verge = dusk ? '#8d8174' : '#d9bf8f';
	plane(ctx, verge, -220, 136, 600, 40);
	plane(ctx, verge, 160, -220, 34, 360);
	plane(ctx, road, -220, 142, 600, 26);
	plane(ctx, road, 166, -220, 22, 362);
	if (tarred)
		for (let x = -200; x < 380; x += 18) {
			plane(ctx, '#e8d27a', x, 154.5, 8, 1);
			if (x < 130) plane(ctx, '#e8d27a', 176.5, x, 1, 8);
		}
	// Neighbours behind the lot and across the side road.
	const houses = [
		[-86, -30, 44, 30, 1, 'clay'],
		[-16, -62, 50, 34, 0, 'zinc'],
		[56, -60, 44, 30, 2, 'rust'],
		[110, -54, 40, 30, 1, 'zinc'],
		[-84, 34, 40, 30, 2, 'zinc'],
		[-80, 82, 40, 28, 0, 'clay'],
		[198, -40, 40, 30, 0, 'clay'],
		[198, 10, 40, 30, 2, 'zinc'],
		[198, 60, 38, 28, 1, 'rust']
	];
	for (const [x, d, w, dd, plaster, roof] of houses)
		house(ctx, x, d, w, dd, { plaster, roof, lit });
	compoundWall(ctx, -96, -4, 70);
	compoundWall(ctx, 190, 96, 46);
	palm(ctx, -30, -18, 1);
	palm(ctx, 160, -70, 0.95);
	shadeTree(ctx, 30, -24, 0.8);
	shadeTree(ctx, -40, 112, 0.9);
	plane(ctx, site.lot ?? (dusk ? '#756d61' : '#988260'), -4, -2, 162, 132);
	if (!site.lot) plane(ctx, verge, 62, 124, 30, 18); // the path from the door to the road
}

/** In front of the lot: the pavement and road traffic, passers-by, and the near verge's trees. */
export function streetFront(ctx, site, shot) {
	const t = shot.elapsed * shot.pace;
	const year = shot.year ?? 1990;
	const techs = new Set(shot.techs ?? []);
	const cars = year >= 1950 || techs.has('motor-car');
	if (year >= 1935 || techs.has('electricity')) {
		const poles = [-120, -70, -20, 30, 80, 130];
		poles.forEach((d, i) =>
			powerPole(ctx, 192, d, poles[i + 1] != null ? [192, poles[i + 1]] : null)
		);
	}
	if (site.flag) at(ctx, 52, 132, 0, 1, (c) => flagPole(c, t, shot.color ?? '#d0a24a'));
	for (let i = 0; i < Math.min(4, shot.crowd ?? 4); i++) {
		const travel = (t * 0.05 + 0.27 * i) % 1;
		const east = i % 2 === 0;
		walker(
			ctx,
			i + 1,
			mix(-60, 200, east ? travel : 1 - travel),
			138 + (i % 2) * 2,
			{
				facing: east ? 1 : -1,
				stride: Math.round(Math.sin(t * 7 + i))
			},
			0.8
		);
	}
	if (cars) {
		car(ctx, ((t * 18) % 340) - 120, 144, '#b4513f');
		car(ctx, 220 - ((t * 14 + 150) % 340), 158, '#e8b437');
		car(ctx, 168, 70 - ((t * 12) % 260) + 100, '#e9e4d6', 'd');
	}
	kiosk(ctx, 104, 176, ['#3d7a5c', '#efd9a8']);
	palm(ctx, 30, 190, 1.1);
	palm(ctx, 190, 180, 1);
	shadeTree(ctx, -10, 200, 1);
}

/** A flag on a pole in the ruling state's colour, waving. */
export function flagPole(ctx, t, color) {
	box(ctx, INK, 0, -28, 1, 28);
	for (let i = 0; i < 4; i++) {
		const top = -27 + Math.round(Math.sin(t * 5 - i) * 1.2);
		box(ctx, INK, 1 + i * 4, top - 1, 4, 10);
		box(ctx, color, 1 + i * 4, top, 4, 8);
		box(ctx, '#f4ecd2', 1 + i * 4, top + 3, 4, 2);
	}
}
