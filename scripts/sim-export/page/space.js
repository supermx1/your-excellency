// Pixel-art pieces for the space and launch cutaways: rockets, landers, astronauts, flame, smoke,
// stars and the Earth's limb. The scenes that use them are in raised.js. Coordinates are view pixels.
import { box, shape } from './town-art.js';

const W = 216;
const H = 270;
const INK = '#302c31';
const SPACE = '#0c0e1b';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

export function oval(ctx, color, cx, cy, rx, ry, top = false) {
	for (let dy = -ry; dy <= (top ? 0 : ry); dy++) {
		const w = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
		box(ctx, color, Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
	}
}
export const disc = (ctx, color, cx, cy, r) => oval(ctx, color, cx, cy, r, r);

export function line(ctx, color, x0, y0, x1, y1, w = 1) {
	const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
	for (let i = 0; i <= n; i++)
		box(ctx, color, Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), w, w);
}

/** Fixed stars that twinkle; `drift` slides them left (deep space), with streaks when fast. */
/** A fixed scatter in [0, 1) for star `i`: the same every frame. */
const scatter = (i, k) => {
	const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

/** Fixed stars that twinkle; `drift` slides them left (deep space), with streaks when fast. */
export function stars(ctx, elapsed, { count = 80, drift = 0, bottom = H } = {}) {
	for (let i = 0; i < count; i++) {
		const speed = drift * (1 + (i % 3));
		const x = (((scatter(i, 1) * W - speed) % W) + W) % W;
		const y = Math.floor(scatter(i, 2) * bottom);
		const bright = Math.sin(elapsed * 2 + i * 1.7) > 0.55 || i % 9 === 0;
		box(ctx, bright ? '#f4ecd2' : '#77779a', Math.round(x), y, i % 13 === 0 ? 2 : 1, 1);
		if (drift > 40) box(ctx, '#55557a', Math.round(x) + 1, y, Math.min(14, drift / 30) | 0, 1);
	}
}

export function smoke(
	ctx,
	x,
	y,
	amount,
	elapsed,
	{ spread = 1, colors = ['#ebe3d4', '#cdc1b0'] } = {}
) {
	if (amount <= 0) return;
	for (let i = 0; i < 16; i++) {
		const side = i % 2 ? 1 : -1;
		const dist = amount * (6 + ((i * 7) % 28)) * spread;
		const cx = x + side * dist * (0.5 + (i % 3) * 0.3);
		const cy = y - ((i % 4) * 3 + 2) * amount + Math.sin(elapsed * 2 + i);
		disc(ctx, colors[i % 3 ? 0 : 1], cx, cy, Math.round(2 + amount * (4 + (i % 4) * 2)));
	}
}

export function flame(ctx, x, y, length, elapsed) {
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
export function rocket(ctx, x, y, { color, crewed = false, booster = false, legs = 0 }) {
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

export function astronaut(ctx, x, y, { color, stride = 0, facing = 1 }) {
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

export function lander(ctx, x, y, color) {
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

export function flag(ctx, x, y, color, height = 24) {
	if (height <= 0) return;
	box(ctx, INK, x, y - height, 1, height);
	if (height < 24) return;
	box(ctx, INK, x + 1, y - 24, 15, 10);
	box(ctx, color, x + 1, y - 23, 14, 8);
	box(ctx, '#f4ecd2', x + 1, y - 20, 14, 2);
}

export function earthLimb(ctx, t, top) {
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
