// The cutaways that used to be flat side views, redrawn from the raised three-quarter angle of the
// town and the rooms: the clinic and fusion plant as rooms; fields, the phone mast, the launch range
// and the battle as open lots in the same street; the Moon, Mars, the asteroid, orbit and deep space
// as ground (or sky) seen from that angle. Every frame comes from the shot's progress and time only.
import { box, house, person, crates, car, pole, wire } from './town-art.js';
import {
	W,
	H,
	INK,
	PAPER,
	WOOD,
	SKIN,
	point,
	plane,
	solid,
	figure,
	table,
	window as pane,
	captionPlate,
	monitor,
	flag,
	mast,
	ease,
	mix,
	cutaway,
	outdoor,
	landscape
} from './everyday.js';
import {
	rocket,
	astronaut,
	lander,
	smoke,
	flame,
	stars,
	disc,
	oval,
	line,
	earthLimb,
	flag as banner
} from './space.js';

const SPACE = '#0c0e1b';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = (t) => t * t * (3 - 2 * t);

/** Draws `paint` with (0, 0) on the floor point (x, depth) raised by `height`, `scale` times bigger. */
function at(ctx, x, depth, height, scale, paint) {
	const [sx, sy] = point(x, depth, height);
	ctx.save();
	ctx.translate(Math.round(sx), Math.round(sy));
	ctx.scale(scale, scale);
	paint(ctx);
	ctx.restore();
}

/** A person standing on the floor at (x, depth), in the rooms' scale. */
function actor(ctx, x, depth, look, scale = 0.9) {
	at(ctx, x, depth, 0, scale, (c) => person(c, 0, 0, { skin: SKIN[1], cap: PAPER, ...look }));
}

/** A flat ellipse on the floor (or raised): craters, domes' footprints, signal rings. */
function ellipse(ctx, color, x, depth, r, height = 0, top = false) {
	const [sx, sy] = point(x, depth, height);
	oval(ctx, color, sx, sy, r, Math.max(1, Math.round(r * 0.45)), top);
}

/** The outline of a flat ellipse: a ring of dots. */
function ringAt(ctx, color, x, depth, r, height) {
	const [cx, cy] = point(x, depth, height);
	for (let a = 0; a < 48; a++) {
		const angle = (a / 48) * Math.PI * 2;
		box(
			ctx,
			color,
			Math.round(cx + Math.cos(angle) * r),
			Math.round(cy + Math.sin(angle) * r * 0.45),
			1,
			1
		);
	}
}

/** Lit windows in the street's houses (the same houses yard() draws), for night scenes. */
function litStreet(ctx) {
	for (const [x, y, w] of [
		[57, 14, 43],
		[111, 22, 59],
		[-17, 54, 59],
		[172, 58, 66]
	])
		for (let i = 25; i < w - 6; i += 13) box(ctx, '#ffd98a', x + i, y + 18, 7, 6);
}

// --- Rooms -----------------------------------------------------------------------------------

const CLINIC = {
	wall: ['#e9eee4', '#b9c7bd', '#93a69b'],
	floor: '#cfd8cf',
	seam: '#bcc8bf',
	path: '#c98a5e',
	around(ctx, shot) {
		flag(ctx, 72, 236, shot.elapsed * shot.pace, shot.color ?? '#d0a24a');
		car(ctx, 178, 228, '#f1efe8', -1);
	}
};

/** Medicine reaches everyone: the queue comes in from the street, beds along the wall, a nurse. */
function clinic(ctx, shot) {
	const { progress: p, elapsed, pace } = shot;
	captionPlate(ctx, 'CLINIC', 54, 6, 12, 44, '#a8423a');
	pane(ctx, 14, 22, '#9fc0c4');
	pane(ctx, 116, 24, '#9fc0c4');
	// Beds along the back and the right, filling as the day goes on.
	const beds = [
		[12, 14],
		[40, 14],
		[118, 30],
		[118, 62]
	];
	for (const [i, [x, d]] of beds.entries()) {
		const across = x > 100;
		const [w, depth] = across ? [26, 16] : [16, 26];
		solid(ctx, x, d, w, depth, 6, ['#f3f1ea', '#a9b3ad', '#8d9993']);
		plane(ctx, '#d6e2e8', x + 2, d + 2, across ? 6 : 12, across ? 12 : 6, 6.1);
		if (p > 0.18 + i * 0.16) {
			plane(
				ctx,
				'#8fb4c8',
				x + (across ? 8 : 2),
				d + (across ? 2 : 8),
				across ? 16 : 12,
				across ? 12 : 16,
				6.2
			);
			const [hx, hy] = point(x + (across ? 4 : 7), d + (across ? 7 : 4), 8);
			box(ctx, INK, hx - 2, hy - 3, 5, 4);
			box(ctx, SKIN[i % 3], hx - 1, hy - 2, 3, 2);
		}
	}
	// The nurse's desk, and the nurse going from bed to bed.
	table(ctx, 54, 56, 30, 14, ['#f3f1ea', '#a9b3ad', '#8d9993']);
	solid(ctx, 62, 59, 8, 6, 3, ['#d6e2e8', '#c9433b', '#a8423a'], 10);
	const round = (elapsed * pace * 0.09) % 1;
	const go = round < 0.5 ? round * 2 : 2 - round * 2;
	actor(ctx, mix(36, 108, smooth(go)), mix(48, 54, go), {
		color: '#f4f2ec',
		cap: '#f4f2ec',
		skin: SKIN[0],
		facing: round < 0.5 ? 1 : -1,
		stride: Math.round(Math.sin(elapsed * pace * 7))
	});
	// The queue shuffles in through the door, one step at a time.
	for (let i = 0; i < 5; i++) {
		const step = ease(p, 0.04 + i * 0.1, 0.4 + i * 0.1);
		figure(ctx, i, 74 + (i % 2) * 4, mix(168 + i * 14, 80 + i * 13, step), {
			stride: step > 0 && step < 1 ? Math.sin(elapsed * pace * 8 + i) : 0
		});
	}
}

const PLANT = {
	wall: ['#aab3bd', '#76808f', '#5d6573'],
	floor: '#8c939c',
	seam: '#7c838c',
	path: '#b9b5a8',
	dusk: true,
	around(ctx, shot) {
		for (const x of [28, 118]) wire(ctx, x + 1, x + 91, 186);
		for (const x of [28, 118, 209]) pole(ctx, x, 207);
		if (shot.progress > 0.45) litStreet(ctx);
	}
};

/** Fusion power: the reactor ring comes up to full glow, and the street's lights come on. */
function fusion(ctx, shot) {
	const { progress: p, elapsed, pace } = shot;
	const t = elapsed * pace;
	captionPlate(ctx, 'FUSION', 54, 6, 12, 44, '#3a5f8a');
	const on = ease(p, 0.12, 0.4);
	solid(ctx, 40, 26, 72, 48, 6, ['#9aa3ad', '#6a7380', '#596170']);
	const [cx, cy] = point(76, 50, 18);
	oval(ctx, INK, cx, cy, 34, 16);
	oval(ctx, '#d9d6cf', cx, cy, 33, 15);
	oval(ctx, '#b7b2a8', cx, cy + 2, 28, 12);
	const glow = on > 0 ? (Math.sin(t * 5) > 0 ? '#9fe7ff' : '#5fc6f0') : '#4b4a55';
	oval(ctx, glow, cx, cy, 18, 7);
	oval(ctx, '#2b3a4a', cx, cy, 11, 4);
	box(ctx, shot.color ?? '#d0a24a', cx - 4, cy - 17, 8, 3);
	if (on > 0)
		for (let i = 0; i < 8; i++) {
			const a = t * 3 + i * 0.8;
			box(
				ctx,
				'#e8fbff',
				Math.round(cx + Math.cos(a) * 22),
				Math.round(cy + Math.sin(a) * 9),
				2,
				1
			);
		}
	// Operators at their desks.
	for (const [x, d, i] of [
		[12, 84, 1],
		[106, 84, 2]
	]) {
		table(ctx, x, d, 34, 14, ['#b9c4cc', '#7d8994', '#66717c']);
		monitor(ctx, x + 6, d + 1, on > 0, on);
		figure(ctx, i, x + 16, d + 24);
	}
	// The dark lifts as the plant comes on.
	ctx.globalAlpha = 0.45 * (1 - on);
	plane(ctx, '#1d2238', 3, 7, 145, 113, 2.2);
	ctx.globalAlpha = 1;
}

// --- Open lots in the street ---------------------------------------------------------------

/** A small tractor, in the state's colour, driving across the floor. */
function tractor(ctx, x, d, color) {
	solid(ctx, x, d, 18, 10, 6, [color, '#4e4a46', '#3d3a37'], 3);
	solid(ctx, x + 11, d + 1, 7, 8, 7, ['#bfd6e0', '#55606a', '#46505a'], 9);
	for (const [wx, big] of [
		[x + 1, false],
		[x + 13, true]
	])
		for (const wd of [d - 1, d + 10])
			solid(ctx, wx, wd, big ? 6 : 4, 2, big ? 7 : 5, [INK, '#2a2629', INK]);
}

const FARM = {
	lot: '#9b7a4c',
	path: '#c98a5e',
	around(ctx, shot) {
		flag(ctx, 72, 236, shot.elapsed * shot.pace, shot.color ?? '#d0a24a');
	}
};

/** Farming: rows of crops grow green; people work the rows, and from 1950 a tractor joins them. */
function fields(ctx, shot) {
	const { progress: p, elapsed, pace, year } = shot;
	const t = elapsed * pace;
	const grow = ease(p, 0.05, 0.8);
	const ripe = grow > 0.55;
	const workers = [
		[24, 22],
		[70, 48],
		[120, 35],
		[40, 87],
		[104, 100]
	];
	for (let r = 0; r < 9; r++) {
		const d = 4 + r * 13;
		plane(ctx, '#7f5f3c', -2, d + 7, 158, 3);
		for (let x = 2 + (r % 2) * 4; x < 152; x += 8) {
			const h = 2 + grow * (4 + (r % 3));
			solid(ctx, x, d + 4, 3, 3, h, [
				ripe ? '#7bab4f' : '#a3a356',
				ripe ? '#4f7e3a' : '#858a48',
				ripe ? '#3f6630' : '#6c7038'
			]);
			if (grow > 0.85) plane(ctx, '#e1c45a', x, d + 4, 3, 1.2, h + 0.1);
		}
		// Workers stand on the row behind them, so the near rows can hide their feet.
		for (const [i, [x, wd]] of workers.entries())
			if (wd >= d && wd < d + 13)
				actor(ctx, x + Math.sin(t * 0.6 + i) * 6, wd, {
					color: ['#376b65', '#924e4e', '#77638a', '#c58a41', '#586c86'][i],
					cap: i % 2 ? '#d0b081' : '#574039',
					skin: SKIN[i % 3],
					stride: Math.round(Math.sin(t * 5 + i)),
					facing: Math.sin(t * 0.6 + i + 1.5) > 0 ? 1 : -1
				});
		if (year >= 1950 && r === 4)
			tractor(ctx, mix(-40, 170, (t * 0.05) % 1), d + 9, shot.color ?? '#b4513f');
	}
	if ((shot.techs ?? []).includes('fertiliser')) crates(ctx, 160, 176);
}

const SQUARE = {
	lot: '#8d8a84',
	path: '#a39480',
	dusk: true,
	around(ctx) {
		litStreet(ctx);
	}
};

/** Phones and talking machines: a mast in the town square, and phones lighting up around it. */
function signal(ctx, shot) {
	const { progress: p, elapsed, pace } = shot;
	const t = elapsed * pace;
	for (let d = 8; d < 128; d += 12) plane(ctx, '#7f7c77', -2, d, 158, 0.7);
	for (let x = 4; x < 156; x += 16) plane(ctx, '#7f7c77', x, -1, 0.7, 130);
	solid(ctx, 66, 44, 22, 18, 3, ['#a39e95', '#7a756d', '#68635c']);
	at(ctx, 77, 53, 3, 2, (c) => mast(c, 0, 0, t));
	box(ctx, shot.color ?? '#d0a24a', ...point(75, 53, 66).map(Math.round), 5, 3);
	for (let k = 0; k < 3; k++) {
		const r = ((t * 22 + k * 26) % 78) + 6;
		ringAt(ctx, r < 55 ? '#7fd6c8' : '#4f8f88', 77, 53, r, 70);
	}
	// More people come out with phones as it spreads.
	const spots = [
		[18, 24],
		[132, 30],
		[30, 70],
		[112, 76],
		[54, 100],
		[96, 108],
		[10, 110],
		[140, 104],
		[60, 20],
		[124, 58]
	];
	const n = Math.round(mix(3, spots.length, ease(p, 0.05, 0.8)));
	for (const [i, [x, d]] of spots.slice(0, n).entries()) {
		figure(ctx, i, x, d, { facing: x < 77 ? 1 : -1 });
		const [px, py] = point(x, d, 13);
		box(ctx, '#bff3ea', Math.round(px) + (x < 77 ? 3 : -4), Math.round(py), 2, 3);
	}
}

const RANGE = {
	lot: '#b9b2a2',
	path: '#c9b8a0',
	around(ctx, shot) {
		flag(ctx, 180, 236, shot.elapsed * shot.pace, shot.color ?? '#d0a24a');
	}
};

/** The launch range: a pad with its tower, and a fence with the town crowded along it. */
function range(ctx, shot) {
	plane(ctx, '#a19a8a', 34, 18, 86, 70);
	solid(ctx, 52, 34, 48, 34, 4, ['#cfc9bd', '#8e8a86', '#77736f']);
	plane(ctx, '#3d3a37', 70, 44, 12, 14, 4.1);
	// The tower beside the pad.
	solid(ctx, 96, 36, 8, 8, 82, ['#c45a45', '#b4513f', '#8c3b31']);
	for (let h = 8; h < 82; h += 9) {
		const [x0, y0] = point(96, 44, h);
		line(ctx, '#6e2c25', x0, y0, x0 + 8, y0 - 8);
	}
}
/** The crowd at the fence, cheering once the rocket moves. */
function fence(ctx, shot, cheer) {
	for (let x = -4; x < 158; x += 10) solid(ctx, x, 112, 2, 2, 9, ['#8b8b84', '#5e5e58', '#4d4d48']);
	plane(ctx, '#5e5e58', -4, 112, 162, 0.6, 7);
	plane(ctx, '#5e5e58', -4, 112, 162, 0.6, 4);
	for (let i = 0; i < Math.min(12, shot.crowd ?? 12); i++) {
		const bob = cheer ? Math.round(Math.max(0, Math.sin(shot.elapsed * 6 + i)) * 3) : 0;
		at(ctx, 4 + ((i * 13) % 148), 122 + (i % 3) * 6, bob, 0.9, (c) =>
			person(c, 0, 0, {
				color: ['#376b65', '#924e4e', '#77638a', '#586c86', '#c58a41', '#647b4c'][i % 6],
				skin: SKIN[i % 3],
				cap: ['#d0b081', '#4f4f4c', '#a36a49'][i % 3],
				facing: i % 2 ? 1 : -1
			})
		);
	}
}

/** A launch: vapour on the pad, ignition, then lift-off with smoke rolling over the range. */
function launch(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	range(ctx, shot);
	const ignite = ease(p, 0.3, 0.42);
	const climb = clamp((p - 0.42) / 0.58, 0, 1);
	const [x, y] = point(76, 51, 4);
	const lift = climb * climb * 320;
	const shake = ignite > 0 && climb < 0.15 ? Math.round(Math.sin(t * 60)) : 0;
	smoke(ctx, x, y + 4, Math.min(1, ignite * 0.7 + climb), t, { spread: 1.5 });
	rocket(ctx, x + shake, y - lift, { color, crewed: shot.tech === 'crewed-spaceflight' });
	if (ignite > 0) flame(ctx, x + shake, y - lift + 5, 10 + 22 * ignite + 12 * climb, t);
	fence(ctx, shot, p > 0.42);
}

/** A reusable booster comes back down, opens its legs and lands on the pad. */
function landing(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	range(ctx, shot);
	const fall = smooth(clamp(p / 0.75, 0, 1));
	const [x, y] = point(76, 51, 4);
	const height = (1 - fall) * 260;
	const dust = ease(p, 0.6, 0.8) * (1 - 0.6 * ease(p, 0.85, 1));
	smoke(ctx, x, y + 4, dust, t, { spread: 1.4 });
	rocket(ctx, x, y - height, { color, booster: true, legs: ease(p, 0.5, 0.65) });
	if (p < 0.78) flame(ctx, x, y - height + 5, 12 + 16 * (1 - fall), t);
	fence(ctx, shot, p > 0.78);
}

const FIELD = {
	lot: '#9fa26a',
	path: '#c98a5e',
	around() {}
};

/** A raised flag on the floor; `raise` 0–1 lowers it (a lost battle). */
function standard(ctx, x, d, color, raise, t) {
	const [sx, sy] = point(x, d);
	const height = Math.round(28 * raise);
	if (height <= 0) return;
	box(ctx, INK, Math.round(sx), Math.round(sy) - height, 1, height);
	if (height < 20) return;
	flag(ctx, Math.round(sx), Math.round(sy) - height + 28, t, color);
}

/**
 * A small battle at the edge of a town: two lines in their states' colours close in, smoke and
 * flashes where they meet, a roof burning behind; then the losing side falls back and its flag goes
 * down. `shot.rivals` are the two colours, `shot.winner` 0 or 1 (or -1 when the war never ended).
 */
function battle(ctx, shot) {
	const { progress: p, elapsed, pace } = shot;
	const t = elapsed * pace;
	const [a, b] = shot.rivals?.length === 2 ? shot.rivals : [shot.color ?? '#3d6fa8', '#b4513f'];
	const close = ease(p, 0.04, 0.32);
	const fighting = p > 0.3 && p < 0.74;
	const loser = shot.winner === 0 ? 1 : shot.winner === 1 ? 0 : -1;
	const retreat = ease(p, 0.72, 0.98);
	// Smoke from a roof behind the field.
	for (let i = 0; i < 6; i++) {
		const age = (t * 0.4 + i / 6) % 1;
		ctx.globalAlpha = 0.7 * (1 - age);
		disc(ctx, i % 2 ? '#5e5a58' : '#7d7874', 140 + Math.sin(i + t) * 4, 18 - age * 40, 3 + age * 6);
	}
	ctx.globalAlpha = 1;
	for (let i = 0; i < 4; i++)
		box(
			ctx,
			['#e0592a', '#f6a33a'][i % 2],
			128 + i * 6,
			22 - (Math.sin(t * 9 + i) > 0 ? 3 : 0),
			4,
			5
		);
	plane(ctx, '#b09a6a', 60, -1, 34, 131); // trampled ground between the lines
	standard(ctx, 6, 66, a, loser === 0 ? 1 - retreat : 1, t);
	standard(ctx, 148, 60, b, loser === 1 ? 1 - retreat : 1, t);
	const soldiers = [];
	for (const [side, color] of [
		[0, a],
		[1, b]
	])
		for (let i = 0; i < 6; i++) {
			const rank = i % 2;
			const home = side === 0 ? 16 + rank * 10 : 138 - rank * 10;
			const front = side === 0 ? 58 + rank * 8 : 96 - rank * 8;
			let x = mix(home, front, close);
			if (fighting) x += Math.sin(t * 9 + i * 1.7) * 2;
			if (side === loser) x = mix(x, side === 0 ? -50 : 210, retreat);
			soldiers.push({ side, color, x, d: 24 + Math.floor(i / 2) * 30 + rank * 9, i });
		}
	soldiers.sort((m, n) => m.d - n.d);
	for (const { side, color, x, d, i } of soldiers) {
		const facing = side === 0 ? 1 : -1;
		const running = side === loser && retreat > 0;
		actor(ctx, x, d, {
			color,
			cap: side ? '#5a2f2a' : '#2c3550',
			skin: SKIN[i % 3],
			facing: running ? -facing : facing,
			stride: close < 1 || running ? Math.round(Math.sin(t * 9 + i)) : 0
		});
		// A spear held up, thrust forward while they fight.
		const [sx, sy] = point(x, d, 10);
		const thrust = fighting ? Math.max(0, Math.sin(t * 7 + i)) * 4 : 0;
		const tip = Math.round(sx + facing * (5 + thrust));
		line(ctx, '#5b4636', Math.round(sx + facing * 2), Math.round(sy), tip, Math.round(sy) - 11, 1);
		box(ctx, '#cfd2d6', tip - 1, Math.round(sy) - 13, 2, 2);
	}
	if (fighting)
		for (let i = 0; i < 5; i++) {
			const [sx, sy] = point(77, 20 + i * 22, 8);
			const puff = (t * 1.3 + i * 0.37) % 1;
			ctx.globalAlpha = 0.75 * (1 - puff);
			disc(ctx, '#e7e2d6', sx + Math.sin(i * 3) * 6, sy - puff * 10, 2 + puff * 5);
			ctx.globalAlpha = 1;
			if (Math.sin(t * 13 + i * 2.1) > 0.85)
				box(ctx, '#fff0b2', Math.round(sx) - 1, Math.round(sy) - 1, 3, 2);
		}
}

// --- Other worlds ----------------------------------------------------------------------------

/** Ground seen from the same angle with its horizon at the top: sky, a ridge, rocks and craters. */
function ground(ctx, shot, look) {
	box(ctx, look.ground, -40, -40, W + 80, H + 80);
	box(ctx, look.sky, -40, -40, W + 80, 98);
	if (look.stars) stars(ctx, shot.elapsed, { count: 50, bottom: 56 });
	look.inSky?.(ctx, shot);
	ctx.fillStyle = look.ridge;
	ctx.beginPath();
	ctx.moveTo(-40, 60);
	for (const [x, y] of [
		[-10, 48],
		[20, 54],
		[52, 38],
		[86, 52],
		[118, 44],
		[150, 56],
		[184, 40],
		[220, 52],
		[256, 48]
	])
		ctx.lineTo(x, y);
	ctx.lineTo(256, 64);
	ctx.lineTo(-40, 64);
	ctx.fill();
	box(ctx, look.light, -40, 62, W + 80, 2);
	for (let i = 0; i < 90; i++)
		box(
			ctx,
			i % 2 ? look.light : look.dark,
			((i * 97) % 260) - 20,
			68 + ((i * 53) % 212),
			2 + (i % 3),
			1
		);
	for (const [x, d, r] of [
		[-10, 10, 10],
		[130, 4, 12],
		[20, 96, 9],
		[150, 110, 14],
		[60, 132, 7]
	]) {
		ellipse(ctx, look.dark, x, d, r);
		ellipse(ctx, look.light, x, d + 2, r - 3, 0, true);
	}
}

const MOON = {
	ground: '#8d8c93',
	sky: SPACE,
	ridge: '#6f6e76',
	light: '#b9b8bf',
	dark: '#6f6e76',
	stars: true,
	inSky(ctx) {
		disc(ctx, '#2c5f98', 168, 28, 10);
		disc(ctx, '#5d8a4a', 164, 25, 4);
		box(ctx, '#e7eef4', 160, 23, 7, 1);
	}
};

/** The Moon base: lit domes, a parked lander, a flag, and astronauts walking between them. */
function moon(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	for (const [x, d, r] of [
		[44, 40, 20],
		[86, 34, 13]
	]) {
		const [cx, cy] = point(x, d);
		oval(ctx, INK, cx, cy, r + 1, r + 1, true);
		oval(ctx, '#dcdbe1', cx, cy, r, r, true);
		oval(ctx, '#bfbec6', cx + 3, cy, r - 5, r - 6, true);
		for (let i = -r + 5; i < r - 4; i += 6)
			box(ctx, '#f2d36b', Math.round(cx + i), Math.round(cy - 5), 2, 2);
	}
	solid(ctx, 56, 44, 22, 4, 4, ['#c9c8ce', '#8d8c93', '#77767d']); // the tunnel between them
	at(ctx, 122, 64, 0, 1, (c) => lander(c, 0, 0, color));
	at(ctx, 102, 82, 0, 1, (c) => banner(c, 0, 0, color));
	const walk = ease(p, 0.08, 0.85);
	const hop = Math.round(Math.abs(Math.sin(t * 3)) * 3 * (walk > 0 && walk < 1 ? 1 : 0));
	at(ctx, mix(118, 96, walk), 86, hop, 1, (c) =>
		astronaut(c, 0, 0, { color, stride: walk < 1 ? Math.round(Math.sin(t * 6)) : 0, facing: -1 })
	);
	at(ctx, 40, 70, 0, 1, (c) => astronaut(c, 0, 0, { color, facing: 1 }));
}

const MARS = {
	ground: '#c0613f',
	sky: '#e2b089',
	ridge: '#a65a43',
	light: '#d27a55',
	dark: '#8e3f2c',
	inSky(ctx) {
		disc(ctx, '#f7ead0', 40, 26, 4);
	}
};

/** The first people on Mars: the rocket comes down on its legs in a dust storm, then the flag goes up. */
function mars(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	const down = smooth(clamp(p / 0.45, 0, 1));
	const [x, y] = point(70, 56);
	const height = (1 - down) * 240;
	smoke(ctx, x, y + 2, ease(p, 0.28, 0.45) * (1 - ease(p, 0.5, 0.75)), t, {
		spread: 1.6,
		colors: ['#d99c77', '#b9704f']
	});
	rocket(ctx, x, y - height, { color, crewed: true, legs: ease(p, 0.25, 0.4) });
	if (p < 0.47) flame(ctx, x, y - height + 5, 10 + 10 * (1 - down), t);
	if (p > 0.55) {
		const walk = ease(p, 0.55, 0.78);
		at(ctx, mix(64, 34, walk), mix(62, 84, walk), 0, 1, (c) =>
			astronaut(c, 0, 0, { color, stride: walk < 1 ? Math.round(Math.sin(t * 7)) : 0, facing: -1 })
		);
		at(ctx, 26, 90, 0, 1, (c) => banner(c, 0, 0, color, Math.round(24 * ease(p, 0.78, 0.9))));
	}
}

/** The rock of an asteroid seen from above at an angle: its top face, and its dark side below. */
function asteroidRock(ctx, shot) {
	box(ctx, SPACE, -40, -40, W + 80, H + 80);
	stars(ctx, shot.elapsed, { drift: shot.elapsed * 4 });
	const radii = [64, 58, 70, 56, 62, 72, 57, 66, 61, 59, 68, 60];
	const rim = (grow) =>
		radii.map((r, i) => {
			const a = (i / radii.length) * Math.PI * 2 + shot.progress * 0.2;
			return point(76 + Math.cos(a) * (r + grow), 62 + Math.sin(a) * (r + grow) * 0.9);
		});
	const fill = (color, pts, dy = 0) => {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(pts[0][0], pts[0][1] + dy);
		for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py + dy);
		ctx.closePath();
		ctx.fill();
	};
	fill(INK, rim(2), 16);
	fill('#4f453d', rim(0), 14);
	fill(INK, rim(2));
	fill('#6f6155', rim(0));
	for (const [x, d, r] of [
		[40, 40, 9],
		[104, 86, 7],
		[60, 104, 5],
		[118, 30, 6]
	]) {
		ellipse(ctx, '#5a4e45', x, d, r);
		ellipse(ctx, '#8a7a6b', x, d + 1, Math.max(1, r - 3), 0, true);
	}
}

/** Mining an asteroid: a drill rig on the rock, ore drifting up to a hauler. */
function asteroid(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	solid(ctx, 70, 56, 14, 12, 4, [color, '#5b5560', '#4b4650']);
	for (const [dx, dd] of [
		[0, 0],
		[14, 0],
		[7, 12]
	]) {
		const [x0, y0] = point(70 + dx, 56 + dd, 4);
		const [x1, y1] = point(77, 62, 34);
		line(ctx, INK, x0, y0, x1, y1, 2);
	}
	const [bx, by] = point(77, 62, 0);
	box(
		ctx,
		Math.floor(t * 12) % 2 ? '#c7c0b0' : '#7d7a82',
		Math.round(bx) - 1,
		Math.round(by) - 6,
		3,
		8
	);
	for (let i = 0; i < 4; i++)
		if (Math.sin(t * 30 + i * 2) > 0.3)
			box(ctx, '#f6dc8c', Math.round(bx + Math.sin(t * 17 + i) * 7), Math.round(by) - i, 1, 1);
	const ship = point(mix(118, 132, p), 20, 70);
	const [top, ty] = point(77, 62, 34);
	for (let k = 0; k < 6; k++) {
		const f = (t * 0.35 + k / 6) % 1;
		box(
			ctx,
			'#c9a24a',
			Math.round(mix(top, ship[0], f)),
			Math.round(mix(ty, ship[1] + 4, f)),
			2,
			2
		);
	}
	solid(ctx, mix(108, 122, p), 14, 26, 12, 8, ['#d9d6cf', '#9c9aa3', '#7d7a82'], 64);
	plane(ctx, color, mix(112, 126, p), 14, 14, 3, 72.1);
	if (Math.sin(t * 25) > 0)
		box(ctx, '#f6a33a', Math.round(ship[0]) - 22, Math.round(ship[1]) - 4, 3, 3);
}

/** Space with the Earth below, its horizon curving across the top of the view. */
function earthBelow(ctx, shot) {
	box(ctx, SPACE, -40, -40, W + 80, H + 80);
	stars(ctx, shot.elapsed, { bottom: 60 });
	earthLimb(ctx, shot.elapsed, 62);
}

/** The first space station, seen from above at the same angle, with a capsule coming in to dock. */
function orbit(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	const drift = mix(-6, 10, p);
	const z = 40;
	solid(ctx, 10 + drift, 52, 132, 3, 2, ['#9c9aa3', '#6e6c75', '#5b5960'], z + 6); // the truss
	for (const x of [12, 34, 100, 122])
		for (const d of [22, 62]) {
			plane(ctx, INK, x + drift - 1, d - 1, 20, 26, z + 7.9);
			plane(ctx, '#2a3f72', x + drift, d, 18, 24, z + 8);
			for (let g = 4; g < 24; g += 5) plane(ctx, '#5f7fbf', x + drift, d + g, 18, 0.8, z + 8.1);
		}
	solid(ctx, 56 + drift, 44, 30, 18, 14, ['#e8e4da', '#c7c0b0', '#a9a397'], z);
	plane(ctx, color, 68 + drift, 44, 5, 18, z + 14.1);
	solid(ctx, 86 + drift, 49, 8, 8, 8, ['#d6d1c5', '#a9a397', '#8f897e'], z + 3);
	const dock = smooth(clamp(p / 0.72, 0, 1));
	const cx = mix(200, 94 + drift, dock);
	solid(ctx, cx, 48, 12, 10, 9, ['#ece8dc', '#bdb6a6', '#a39c8c'], z + 2);
	plane(ctx, color, cx + 4, 48, 3, 10, z + 11.1);
	if (dock < 1 && Math.sin(t * 20) > 0) {
		const [fx, fy] = point(cx + 13, 53, z + 6);
		box(ctx, '#f6dc8c', Math.round(fx), Math.round(fy), 3, 1);
	}
}

/** Deep space with the Sun shrinking behind and the stars starting to stream past. */
function deepSpace(ctx, shot) {
	box(ctx, SPACE, -40, -40, W + 80, H + 80);
	stars(ctx, shot.elapsed, { drift: shot.elapsed * (8 + 90 * shot.progress * shot.progress) });
	disc(ctx, '#f6c75a', 30, 40, Math.max(2, Math.round(mix(22, 2, smooth(shot.progress)))));
}

/** A probe leaving for the stars, seen from above at the same angle as everything else. */
function probe(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	const x = mix(56, 104, p);
	const d = mix(80, 40, p);
	const z = 40 + Math.sin(t * 1.5) * 2;
	solid(ctx, x, d, 14, 12, 10, ['#e8c66a', '#d8a948', '#b48a35'], z);
	plane(ctx, color, x, d + 5, 14, 2, z + 10.1);
	const [dx, dy] = point(x + 7, d + 6, z + 22);
	oval(ctx, INK, dx, dy, 13, 6);
	oval(ctx, '#e8e4da', dx, dy, 12, 5);
	oval(ctx, '#c7c0b0', dx + 2, dy + 1, 6, 2);
	line(ctx, INK, Math.round(dx), Math.round(dy), Math.round(dx), Math.round(dy) - 8);
	const [bx, by] = point(x + 14, d + 12, z);
	line(ctx, INK, Math.round(bx), Math.round(by), Math.round(bx) + 18, Math.round(by) + 8);
	box(ctx, Math.sin(t * 4) > 0 ? '#e0592a' : '#5b5560', Math.round(dx), Math.round(dy) - 10, 2, 2);
}

export const RAISED_SCENES = {
	clinic: cutaway(CLINIC, clinic),
	fusion: cutaway(PLANT, fusion),
	fields: outdoor(FARM, fields),
	signal: outdoor(SQUARE, signal),
	launch: outdoor(RANGE, launch),
	landing: outdoor(RANGE, landing),
	battle: outdoor(FIELD, battle),
	moon: landscape((ctx, shot) => ground(ctx, shot, MOON), moon),
	mars: landscape((ctx, shot) => ground(ctx, shot, MARS), mars),
	asteroid: landscape(asteroidRock, asteroid),
	orbit: landscape(earthBelow, orbit),
	stars: landscape(deepSpace, probe)
};
