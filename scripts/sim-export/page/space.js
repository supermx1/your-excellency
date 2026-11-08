// Pixel-art cutaways for the run's world firsts: launch pad, booster landing, orbit, Moon, Mars,
// asteroid and deep space. Each draws one frame from the shot's progress (0–1) and elapsed seconds
// only, so any frame can be drawn on its own. Coordinates are view pixels (216 × 270).
import { box, shape, person, tree } from './town-art.js';

const W = 216;
const H = 270;
const INK = '#302c31';
const SPACE = '#0c0e1b';
const CLOTHES = ['#376b65', '#924e4e', '#77638a', '#586c86', '#c58a41', '#647b4c'];
const SKIN = ['#8e5b3d', '#a86e48', '#c28c5a'];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
/** 0 before `a`, 1 after `b`, linear between. */
const phase = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

/** Frames the scene closer: (cx, cy) goes to the middle of the view, `z` times bigger. */
function zoomTo(ctx, z, cx, cy) {
	const scale = ctx.getTransform().a;
	ctx.setTransform(scale * z, 0, 0, scale * z, (W / 2 - cx * z) * scale, (H / 2 - cy * z) * scale);
}

function oval(ctx, color, cx, cy, rx, ry, top = false) {
	for (let dy = -ry; dy <= (top ? 0 : ry); dy++) {
		const w = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
		box(ctx, color, Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
	}
}
const disc = (ctx, color, cx, cy, r) => oval(ctx, color, cx, cy, r, r);

function line(ctx, color, x0, y0, x1, y1, w = 1) {
	const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
	for (let i = 0; i <= n; i++)
		box(ctx, color, Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), w, w);
}

function sky(ctx, bands, bottom) {
	const h = bottom / bands.length;
	bands.forEach((c, i) => box(ctx, c, 0, Math.round(i * h), W, Math.ceil(h) + 1));
}

/** Fixed stars that twinkle; `drift` slides them left (deep space), with streaks when fast. */
/** A fixed scatter in [0, 1) for star `i`: the same every frame. */
const scatter = (i, k) => {
	const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

/** Fixed stars that twinkle; `drift` slides them left (deep space), with streaks when fast. */
function stars(ctx, elapsed, { count = 80, drift = 0, bottom = H } = {}) {
	for (let i = 0; i < count; i++) {
		const speed = drift * (1 + (i % 3));
		const x = (((scatter(i, 1) * W - speed) % W) + W) % W;
		const y = Math.floor(scatter(i, 2) * bottom);
		const bright = Math.sin(elapsed * 2 + i * 1.7) > 0.55 || i % 9 === 0;
		box(ctx, bright ? '#f4ecd2' : '#77779a', Math.round(x), y, i % 13 === 0 ? 2 : 1, 1);
		if (drift > 40) box(ctx, '#55557a', Math.round(x) + 1, y, Math.min(14, drift / 30) | 0, 1);
	}
}

function smoke(ctx, x, y, amount, elapsed, { spread = 1, colors = ['#ebe3d4', '#cdc1b0'] } = {}) {
	if (amount <= 0) return;
	for (let i = 0; i < 16; i++) {
		const side = i % 2 ? 1 : -1;
		const dist = amount * (6 + ((i * 7) % 28)) * spread;
		const cx = x + side * dist * (0.5 + (i % 3) * 0.3);
		const cy = y - ((i % 4) * 3 + 2) * amount + Math.sin(elapsed * 2 + i);
		disc(ctx, colors[i % 3 ? 0 : 1], cx, cy, Math.round(2 + amount * (4 + (i % 4) * 2)));
	}
}

function flame(ctx, x, y, length, elapsed) {
	const f = length * (0.85 + 0.15 * Math.sin(elapsed * 47));
	shape(ctx, '#e0592a', [
		[x - 6, y],
		[x + 6, y],
		[x, y + f]
	]);
	shape(ctx, '#f6a33a', [
		[x - 4, y],
		[x + 4, y],
		[x, y + f * 0.7]
	]);
	shape(ctx, '#fff0b2', [
		[x - 2, y],
		[x + 2, y],
		[x, y + f * 0.4]
	]);
}

/** A rocket standing on its nozzle at (x, y): the state's colour on its fins and bands. */
function rocket(ctx, x, y, { color, crewed = false, booster = false, legs = 0 }) {
	x = Math.round(x);
	y = Math.round(y);
	const h = booster ? 58 : crewed ? 64 : 54;
	const top = y - h;
	if (!booster)
		for (const s of [-1, 1]) {
			shape(ctx, INK, [
				[x + s * 5, y - 19],
				[x + s * 13, y - 3],
				[x + s * 13, y + 1],
				[x + s * 5, y + 1]
			]);
			shape(ctx, color, [
				[x + s * 6, y - 16],
				[x + s * 12, y - 3],
				[x + s * 12, y],
				[x + s * 6, y]
			]);
		}
	if (legs > 0)
		for (const s of [-1, 1]) {
			line(ctx, INK, x + s * 6, y - 12, x + s * (6 + 9 * legs), y + 4, 2);
			box(ctx, INK, x + s * (6 + 9 * legs) - 2, y + 4, 4, 2);
		}
	box(ctx, INK, x - 7, top, 14, h + 1);
	box(ctx, '#ece8dc', x - 6, top + 1, 12, h - 1);
	box(ctx, '#c7c0b0', x + 2, top + 1, 4, h - 1);
	box(ctx, color, x - 6, y - 12, 12, 4);
	box(ctx, color, x - 6, top + Math.round(h * 0.3), 12, 3);
	box(ctx, INK, x - 5, y + 1, 10, 4);
	box(ctx, '#5b5560', x - 4, y + 1, 8, 3);
	if (booster) {
		box(ctx, INK, x - 7, top - 2, 14, 3);
		for (const gx of [x - 11, x + 8]) box(ctx, '#7d7a82', gx, top + 3, 3, 6);
	} else if (crewed) {
		shape(ctx, INK, [
			[x - 8, top + 1],
			[x - 3, top - 15],
			[x + 3, top - 15],
			[x + 8, top + 1]
		]);
		shape(ctx, '#ece8dc', [
			[x - 6, top],
			[x - 2, top - 13],
			[x + 2, top - 13],
			[x + 6, top]
		]);
		box(ctx, INK, x - 2, top - 8, 4, 3);
		box(ctx, '#7fb2d9', x - 1, top - 7, 2, 1);
		box(ctx, INK, x, top - 25, 1, 11);
	} else {
		shape(ctx, INK, [
			[x - 8, top + 1],
			[x, top - 16],
			[x + 8, top + 1]
		]);
		shape(ctx, '#ece8dc', [
			[x - 5, top],
			[x, top - 12],
			[x + 5, top]
		]);
	}
}

function astronaut(ctx, x, y, { color, stride = 0, facing = 1 }) {
	ctx.save();
	ctx.translate(Math.round(x), Math.round(y));
	ctx.scale(facing, 1);
	box(ctx, INK, -4 - stride, -5, 4, 5);
	box(ctx, INK, 1 + stride, -5, 4, 5);
	box(ctx, '#d9d6cf', -3 - stride, -5, 2, 3);
	box(ctx, '#d9d6cf', 2 + stride, -5, 2, 3);
	box(ctx, INK, -7, -13, 3, 8);
	box(ctx, '#bdb8ad', -6, -12, 1, 6);
	box(ctx, INK, -5, -13, 11, 9);
	box(ctx, '#efece4', -4, -12, 9, 7);
	box(ctx, color, -4, -10, 2, 2);
	box(ctx, INK, -4, -20, 9, 8);
	box(ctx, '#efece4', -3, -19, 7, 6);
	box(ctx, '#d9a441', 0, -17, 4, 3);
	box(ctx, '#f6dc8c', 1, -17, 1, 1);
	ctx.restore();
}

function lander(ctx, x, y, color) {
	x = Math.round(x);
	y = Math.round(y);
	for (const s of [-1, 1]) {
		line(ctx, INK, x + s * 6, y - 8, x + s * 13, y, 2);
		box(ctx, INK, x + s * 13 - 2, y, 5, 2);
	}
	box(ctx, INK, x - 9, y - 16, 18, 10);
	box(ctx, '#d8a948', x - 8, y - 15, 16, 8);
	box(ctx, '#f1d283', x - 8, y - 15, 16, 2);
	box(ctx, INK, x - 6, y - 27, 12, 12);
	box(ctx, '#e8e4da', x - 5, y - 26, 10, 10);
	box(ctx, color, x - 5, y - 21, 10, 2);
	box(ctx, INK, x - 2, y - 24, 3, 3);
	box(ctx, '#7fb2d9', x - 1, y - 23, 1, 1);
}

function flag(ctx, x, y, color, height = 24) {
	if (height <= 0) return;
	box(ctx, INK, x, y - height, 1, height);
	if (height < 24) return;
	box(ctx, INK, x + 1, y - 24, 15, 10);
	box(ctx, color, x + 1, y - 23, 14, 8);
	box(ctx, '#f4ecd2', x + 1, y - 20, 14, 2);
}

function crowd(ctx, shot, y) {
	const n = Math.min(12, shot.crowd ?? 12);
	for (let i = 0; i < n; i++) {
		const x = 14 + ((i * 17) % 190);
		const bob = Math.round(
			Math.max(0, Math.sin(shot.elapsed * 6 + i)) * (shot.progress > 0.45 ? 2 : 0)
		);
		person(ctx, x, y + (i % 2) * 6 - bob, {
			color: CLOTHES[i % CLOTHES.length],
			skin: SKIN[i % SKIN.length],
			cap: ['#d0b081', '#4f4f4c', '#a36a49'][i % 3],
			facing: x < 100 ? 1 : -1
		});
	}
}

function skyline(ctx, base) {
	for (let x = 0, i = 0; x < W; i++) {
		const w = 10 + ((i * 7) % 14);
		const h = 16 + ((i * 13) % 34);
		box(ctx, '#3c3a55', x, base - h, w - 1, h);
		for (let wy = base - h + 3; wy < base - 3; wy += 4)
			for (let wx = x + 2; wx < x + w - 3; wx += 3)
				if ((wx * 7 + wy * 3 + i) % 5 < 2) box(ctx, '#f2d36b', wx, wy, 1, 2);
		x += w;
	}
}

function pad(ctx, shot) {
	sky(ctx, ['#2c3157', '#3d4673', '#5b5f8d', '#8a77a0', '#c98a7a', '#efb889'], 190);
	disc(ctx, '#f6d78a', 44, 176, 12);
	skyline(ctx, 190);
	box(ctx, '#b9996c', 0, 188, W, H - 188);
	box(ctx, '#d8b784', 0, 191, W, H - 191);
	for (let i = 0; i < 160; i++)
		box(ctx, i % 2 ? '#c9a978' : '#ecd1a0', (i * 137) % W, 192 + ((i * 53) % 78), 1 + (i % 3), 1);
	tree(ctx, 14, 200, 1.1);
	tree(ctx, 203, 203, 1.25);
	box(ctx, INK, 62, 186, 76, 7);
	box(ctx, '#8e8a86', 63, 187, 74, 5);
	box(ctx, '#b3aea7', 63, 187, 74, 1);
	// The launch tower beside the rocket.
	for (const rx of [118, 126]) {
		box(ctx, INK, rx - 1, 92, 4, 95);
		box(ctx, '#b4513f', rx, 93, 2, 94);
	}
	for (let k = 96; k < 184; k += 8) {
		line(ctx, '#8c3b31', 119, k, 127, k + 7);
		box(ctx, '#8c3b31', 119, k, 9, 1);
	}
}

/** Satellite or crewed launch: vapour on the pad, ignition, then lift-off with a smoke trail. */
function launch(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	pad(ctx, shot);
	const crewed = shot.tech === 'crewed-spaceflight';
	const ignite = phase(p, 0.3, 0.42);
	const climb = phase(p, 0.42, 1);
	const y = 185 - Math.round(climb * climb * 300);
	const shake = ignite > 0 && climb < 0.15 ? Math.round(Math.sin(t * 60)) : 0;
	// Access arm swings away before ignition.
	const arm = Math.round(lerp(0, 9, phase(p, 0.15, 0.3)));
	box(ctx, INK, 108 + arm, 132, 12 - arm, 3);
	for (let i = 0; i < 12; i++) {
		const ty = y + 12 + i * 11;
		if (climb > 0 && ty < 186)
			disc(
				ctx,
				i % 2 ? '#ebe3d4' : '#d8cfbf',
				100 + Math.sin(i + t) * 2,
				ty,
				Math.round(3 + i * 0.7)
			);
	}
	rocket(ctx, 100 + shake, y, { color, crewed });
	if (ignite > 0) flame(ctx, 100 + shake, y + 5, 10 + 22 * ignite + 12 * climb, t);
	if (p < 0.3)
		for (let i = 0; i < 3; i++) disc(ctx, '#f1ece2', 94 - ((t * 9 + i * 5) % 14), 150 + i * 9, 2);
	smoke(ctx, 100, 190, Math.min(1, ignite * 0.7 + climb), t, { spread: 1.4 });
	crowd(ctx, shot, 214);
}

/** Reusable rocket: the booster falls back, fires, opens its legs and lands on the pad. */
function landing(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	pad(ctx, shot);
	const fall = smooth(phase(p, 0, 0.75));
	const y = Math.round(lerp(-30, 185, fall));
	rocket(ctx, 100, y, { color, booster: true, legs: phase(p, 0.5, 0.65) });
	if (p < 0.78) flame(ctx, 100, y + 5, 12 + 16 * (1 - fall), t);
	const dust = phase(p, 0.6, 0.8) * (1 - 0.6 * phase(p, 0.85, 1));
	smoke(ctx, 100, 191, dust, t, { spread: 1.3 });
	crowd(ctx, shot, 214);
}

function earthLimb(ctx, t, top) {
	const cx = 108;
	const r = 360;
	const cy = top + r;
	for (let y = top - 6; y < H; y++) {
		const dy = y - cy;
		for (const [extra, color] of [
			[6, '#1d2b4d'],
			[3, '#7fb7e3'],
			[0, '#2c5f98']
		]) {
			const rr = r + extra;
			if (Math.abs(dy) > rr) continue;
			const half = Math.floor(Math.sqrt(rr * rr - dy * dy));
			box(ctx, color, cx - half, y, half * 2, 1);
		}
		const inside = Math.abs(dy) <= r ? Math.floor(Math.sqrt(r * r - dy * dy)) : -1;
		if (inside < 0) continue;
		// Land and cloud bands drift as the planet turns.
		for (const [lx, ly, w, color] of [
			[30, 30, 70, '#5d8a4a'],
			[140, 55, 90, '#b99a5e'],
			[-40, 75, 80, '#5d8a4a']
		]) {
			const span = w * Math.sqrt(Math.max(0, 1 - ((y - top - ly) / 18) ** 2));
			if (span <= 0) continue;
			const x0 = Math.max(cx - inside, lx - t * 3);
			const x1 = Math.min(cx + inside, lx - t * 3 + span);
			if (x1 > x0) box(ctx, color, Math.round(x0), y, Math.round(x1 - x0), 1);
		}
		if ((y - top) % 23 === 4)
			box(ctx, '#e7eef4', Math.round(cx - inside + ((t * 8 + y * 5) % (inside * 2))), y, 30, 1);
	}
}

/** The first space station, with a capsule coming in to dock. */
function orbit(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	box(ctx, SPACE, 0, 0, W, H);
	stars(ctx, t, { bottom: 170 });
	earthLimb(ctx, t, 172);
	const sx = Math.round(lerp(78, 132, p));
	const sy = 104;
	box(ctx, INK, sx - 40, sy - 1, 80, 3);
	box(ctx, '#9c9aa3', sx - 39, sy, 78, 1);
	for (const dx of [-36, -24, 18, 30]) {
		for (const py of [sy - 20, sy + 4]) {
			box(ctx, INK, sx + dx - 1, py - 1, 12, 18);
			box(ctx, '#2a3f72', sx + dx, py, 10, 16);
			for (let g = 3; g < 16; g += 4) box(ctx, '#5f7fbf', sx + dx, py + g, 10, 1);
		}
	}
	box(ctx, INK, sx - 13, sy - 6, 27, 13);
	box(ctx, '#e8e4da', sx - 12, sy - 5, 25, 11);
	box(ctx, '#c7c0b0', sx - 12, sy + 2, 25, 4);
	box(ctx, color, sx - 3, sy - 5, 4, 11);
	box(ctx, INK, sx + 13, sy - 3, 4, 7);
	const dock = smooth(phase(p, 0, 0.72));
	const cx = Math.round(lerp(W + 14, sx + 22, dock));
	shape(ctx, INK, [
		[cx - 1, sy - 6],
		[cx + 9, sy - 4],
		[cx + 9, sy + 5],
		[cx - 1, sy + 7]
	]);
	shape(ctx, '#ece8dc', [
		[cx, sy - 5],
		[cx + 8, sy - 3],
		[cx + 8, sy + 4],
		[cx, sy + 6]
	]);
	box(ctx, color, cx + 3, sy - 4, 2, 9);
	if (dock < 1 && Math.sin(t * 20) > 0) box(ctx, '#f6dc8c', cx + 10, sy, 3, 1);
}

function moonGround(ctx, t, colors) {
	box(ctx, colors[0], 0, 168, W, H - 168);
	box(ctx, colors[1], 0, 168, W, 2);
	for (const [x, y, rx] of [
		[30, 196, 12],
		[150, 230, 18],
		[88, 248, 9],
		[190, 186, 8],
		[60, 222, 6]
	]) {
		oval(ctx, colors[2], x, y, rx, Math.ceil(rx / 3));
		oval(ctx, colors[1], x, y + 1, rx - 2, Math.max(1, Math.ceil(rx / 3) - 1), true);
	}
}

/** The Moon base: domes lit from inside, a parked lander, a flag, and an astronaut walking out. */
function moon(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	zoomTo(ctx, 1.5, 110, 175);
	box(ctx, SPACE, 0, 0, W, H);
	stars(ctx, t, { bottom: 168 });
	disc(ctx, '#2c5f98', 152, 136, 14);
	disc(ctx, '#5d8a4a', 147, 132, 5);
	disc(ctx, '#5d8a4a', 156, 141, 4);
	box(ctx, '#e7eef4', 142, 128, 9, 1);
	moonGround(ctx, t, ['#8d8c93', '#b9b8bf', '#6f6e76']);
	box(ctx, INK, 52, 175, 44, 5);
	box(ctx, '#c9c8ce', 53, 176, 42, 3);
	for (const [x, r] of [
		[56, 17],
		[96, 12]
	]) {
		oval(ctx, INK, x, 180, r + 1, r + 1, true);
		oval(ctx, '#dcdbe1', x, 180, r, r, true);
		for (let i = -r + 4; i < r - 3; i += 5) box(ctx, '#f2d36b', x + i, 175, 2, 2);
	}
	box(ctx, INK, 40, 150, 1, 14);
	disc(ctx, '#c9c8ce', 40, 150, 3);
	lander(ctx, 160, 200, color);
	flag(ctx, 124, 206, color);
	const walk = smooth(phase(p, 0.08, 0.85));
	const hop = Math.round(Math.abs(Math.sin(t * 3)) * 3 * (walk > 0 && walk < 1 ? 1 : 0));
	astronaut(ctx, lerp(150, 132, walk), 208 - hop, {
		color,
		stride: walk < 1 ? Math.round(Math.sin(t * 6)) : 0,
		facing: -1
	});
	astronaut(ctx, 72, 202, { color, facing: 1 });
}

/** The first people on Mars: the lander comes down in a dust cloud, then the flag goes up. */
function mars(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	zoomTo(ctx, 1.5, 110, 170);
	sky(ctx, ['#e9c29b', '#e2b089', '#d99c77', '#cc8763'], 172);
	disc(ctx, '#f7ead0', 62, 100, 5);
	shape(ctx, '#a65a43', [
		[0, 172],
		[0, 150],
		[40, 138],
		[78, 152],
		[120, 132],
		[170, 150],
		[W, 140],
		[W, 172]
	]);
	box(ctx, '#c0613f', 0, 170, W, H - 170);
	box(ctx, '#d27a55', 0, 170, W, 2);
	for (let i = 0; i < 40; i++)
		box(
			ctx,
			i % 3 ? '#8e3f2c' : '#a9533b',
			(i * 59) % W,
			176 + ((i * 37) % 90),
			2 + (i % 4),
			1 + (i % 2)
		);
	const down = smooth(phase(p, 0, 0.45));
	const ly = Math.round(lerp(-30, 200, down));
	if (p < 0.47) flame(ctx, 128, ly + 1, 10 + 10 * (1 - down), t);
	lander(ctx, 128, ly, color);
	smoke(ctx, 128, 202, phase(p, 0.28, 0.45) * (1 - phase(p, 0.5, 0.75)), t, {
		spread: 1.6,
		colors: ['#d99c77', '#b9704f']
	});
	if (p > 0.55) {
		const walk = smooth(phase(p, 0.55, 0.78));
		astronaut(ctx, lerp(122, 92, walk), 208, {
			color,
			stride: walk < 1 ? Math.round(Math.sin(t * 7)) : 0,
			facing: -1
		});
		flag(ctx, 82, 210, color, Math.round(24 * phase(p, 0.78, 0.9)));
	}
}

/** Mining an asteroid: a drill on the rock, ore drifting up to a hauler. */
function asteroid(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	box(ctx, SPACE, 0, 0, W, H);
	stars(ctx, t, { drift: t * 4 });
	const radii = [52, 46, 56, 44, 50, 58, 45, 54, 49, 47, 55, 48];
	const rock = (grow) =>
		radii.map((r, i) => {
			const a = (i / radii.length) * Math.PI * 2 + p * 0.3;
			return [100 + Math.cos(a) * (r + grow), 168 + Math.sin(a) * (r + grow) * 0.8];
		});
	shape(ctx, INK, rock(2));
	shape(ctx, '#6f6155', rock(0));
	for (const [x, y, r] of [
		[80, 160, 8],
		[118, 186, 6],
		[96, 200, 4],
		[128, 150, 5]
	]) {
		disc(ctx, '#5a4e45', x, y, r);
		disc(ctx, '#8a7a6b', x - 1, y - 1, Math.max(1, r - 3));
	}
	const rigX = 100;
	const rigY = 128;
	line(ctx, INK, rigX - 8, rigY, rigX, rigY - 26, 2);
	line(ctx, INK, rigX + 8, rigY, rigX, rigY - 26, 2);
	box(ctx, '#d0a24a', rigX - 1, rigY - 24, 3, 22);
	box(ctx, color, rigX - 6, rigY - 6, 13, 4);
	box(ctx, Math.floor(t * 12) % 2 ? '#c7c0b0' : '#7d7a82', rigX - 1, rigY - 2, 3, 6);
	for (let i = 0; i < 4; i++)
		if (Math.sin(t * 30 + i * 2) > 0.3)
			box(ctx, '#f6dc8c', rigX + Math.round(Math.sin(t * 17 + i) * 6), rigY + 2 - i, 1, 1);
	const ship = [Math.round(lerp(150, 170, p)), 60];
	for (let k = 0; k < 6; k++) {
		const f = (t * 0.35 + k / 6) % 1;
		box(
			ctx,
			'#c9a24a',
			Math.round(lerp(rigX, ship[0], f)),
			Math.round(lerp(rigY - 26, ship[1] + 6, f)),
			2,
			2
		);
	}
	shape(ctx, INK, [
		[ship[0] - 20, ship[1] - 7],
		[ship[0] + 18, ship[1]],
		[ship[0] - 20, ship[1] + 9]
	]);
	shape(ctx, '#d9d6cf', [
		[ship[0] - 18, ship[1] - 5],
		[ship[0] + 14, ship[1]],
		[ship[0] - 18, ship[1] + 7]
	]);
	box(ctx, color, ship[0] - 14, ship[1] - 1, 18, 3);
	box(ctx, Math.sin(t * 25) > 0 ? '#f6a33a' : '#fff0b2', ship[0] - 23, ship[1] - 1, 3, 3);
}

/** A probe leaving for the stars: the Sun shrinks behind it and the stars start to stream. */
function deep(ctx, shot) {
	const { progress: p, elapsed: t, color } = shot;
	box(ctx, SPACE, 0, 0, W, H);
	stars(ctx, t, { drift: t * (8 + 90 * p * p) });
	disc(ctx, '#f6c75a', 36, 130, Math.max(2, Math.round(lerp(24, 2, smooth(p)))));
	const x = Math.round(lerp(96, 132, p));
	const y = 136 + Math.round(Math.sin(t * 1.5) * 2);
	disc(ctx, INK, x, y - 14, 11);
	disc(ctx, '#e8e4da', x, y - 14, 10);
	disc(ctx, '#c7c0b0', x + 2, y - 13, 6);
	box(ctx, INK, x - 1, y - 16, 3, 3);
	box(ctx, INK, x - 6, y - 4, 13, 10);
	box(ctx, '#d8a948', x - 5, y - 3, 11, 8);
	box(ctx, color, x - 5, y + 1, 11, 2);
	line(ctx, INK, x + 6, y, x + 26, y + 10);
	box(ctx, '#7d7a82', x + 25, y + 8, 5, 5);
	box(ctx, Math.sin(t * 4) > 0 ? '#e0592a' : '#5b5560', x - 1, y - 27, 2, 2);
}

/** The cutaways this file draws, by shot preset. */
export const SPACE_SCENES = { launch, landing, orbit, moon, mars, asteroid, stars: deep };
