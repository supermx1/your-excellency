// Original pixel-art pieces for the town sets. All coordinates are in world pixels.
const INK = '#302c31';
const SHADOW = '#846b50';

export function box(ctx, color, x, y, w, h) {
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w, h);
}

export function shape(ctx, color, points) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(...points[0]);
	for (const point of points.slice(1)) ctx.lineTo(...point);
	ctx.closePath();
	ctx.fill();
}

export function house(ctx, x, y, w, roof) {
	box(ctx, SHADOW, x + 8, y + 24, w + 8, 11);
	box(ctx, INK, x + 2, y + 10, w - 3, 21);
	box(ctx, '#b77954', x + 4, y + 13, w - 7, 16);
	box(ctx, '#daaa72', x + 4, y + 12, w - 7, 5);
	box(ctx, '#f2ce97', x + 4, y + 23, w - 7, 2);
	box(ctx, INK, x + 11, y + 19, 7, 10);
	box(ctx, '#614738', x + 12, y + 20, 5, 9);
	for (let i = 25; i < w - 6; i += 13) {
		box(ctx, '#67453b', x + i, y + 18, 7, 6);
		box(ctx, '#e1ab72', x + i + 3, y + 18, 1, 6);
	}
	shape(ctx, INK, [
		[x - 2, y + 11],
		[x + 7, y - 5],
		[x + w - 8, y - 5],
		[x + w + 2, y + 11],
		[x + w, y + 14],
		[x, y + 14]
	]);
	shape(ctx, roof[0], [
		[x + 1, y + 11],
		[x + 8, y - 4],
		[x + w - 9, y - 4],
		[x + w - 1, y + 11]
	]);
	box(ctx, roof[1], x + 8, y - 4, w - 16, 2);
	for (let i = 9; i < w - 7; i += 4) box(ctx, roof[1], x + i, y + 1, 1, 10);
	box(ctx, roof[2], x + 1, y + 10, w - 2, 3);
}

export function tree(ctx, x, y, scale = 1) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	box(ctx, '#69664b', -3, 0, 19, 5);
	box(ctx, '#584538', -2, -13, 4, 17);
	shape(ctx, '#405747', [
		[-15, -14],
		[-15, -20],
		[-10, -20],
		[-10, -25],
		[-1, -25],
		[-1, -29],
		[8, -29],
		[8, -26],
		[14, -26],
		[14, -21],
		[17, -21],
		[17, -14],
		[12, -14],
		[12, -11],
		[-8, -11],
		[-8, -14]
	]);
	box(ctx, '#607449', -12, -20, 11, 5);
	box(ctx, '#728654', -7, -24, 15, 6);
	box(ctx, '#84945d', 0, -27, 7, 5);
	box(ctx, '#9da267', -7, -23, 5, 2);
	box(ctx, '#526a47', 3, -17, 12, 4);
	ctx.restore();
}

export function crates(ctx, x, y) {
	box(ctx, SHADOW, x + 2, y + 5, 19, 5);
	box(ctx, INK, x, y, 10, 8);
	box(ctx, '#a97048', x + 1, y + 1, 8, 6);
	box(ctx, '#e1ac66', x + 1, y + 1, 8, 2);
	box(ctx, '#78513a', x + 4, y + 3, 2, 4);
	box(ctx, INK, x + 10, y + 3, 8, 6);
	box(ctx, '#c79156', x + 11, y + 4, 6, 4);
}

export function stall(ctx, x, y, colors) {
	box(ctx, SHADOW, x + 3, y + 12, 29, 7);
	box(ctx, INK, x + 3, y + 7, 2, 11);
	box(ctx, INK, x + 25, y + 7, 2, 11);
	box(ctx, '#936647', x + 5, y + 10, 20, 6);
	box(ctx, '#694637', x + 4, y + 14, 22, 2);
	box(ctx, '#e3aa68', x + 5, y + 10, 20, 2);
	for (let i = 0; i < 4; i++)
		box(ctx, ['#ac603b', '#698255', '#d9a148', '#8e5847'][i], x + 7 + i * 4, y + 9, 3, 3);
	box(ctx, INK, x, y - 2, 30, 10);
	for (let i = 0; i < 7; i++) {
		box(ctx, colors[i % 2], x + 1 + i * 4, y - 1, 4, 7);
		box(ctx, colors[i % 2], x + 1 + i * 4, y + 6, 3, 2);
	}
	box(ctx, '#edce9b', x + 1, y - 1, 28, 1);
}

export function person(
	ctx,
	x,
	y,
	{ color, skin, cap, stride = 0, facing = 1, sack = false, hero = false }
) {
	if (hero) {
		box(ctx, '#9a683e', x - 10, y - 3, 20, 5);
		box(ctx, '#f7cc5f', x - 8, y - 4, 16, 5);
	}
	box(ctx, '#8b7356', x - 5, y, 10, 2);
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(facing, 1);
	box(ctx, INK, -4 - stride, -5, 4, 5);
	box(ctx, INK, 1 + stride, -5, 4, 5);
	box(ctx, '#58505a', -3 - stride, -4, 2, 2);
	box(ctx, '#58505a', 2 + stride, -4, 2, 2);
	box(ctx, INK, -5, -11, 11, 7);
	box(ctx, color, -4, -11, 9, 6);
	box(ctx, '#ecbf80', -1, -8, 1, 2);
	box(ctx, skin, 4, -8 + stride / 2, 2, 3);
	box(ctx, INK, -4, -17, 9, 7);
	box(ctx, skin, -3, -15, 7, 4);
	box(ctx, INK, 2, -14, 1, 1);
	box(ctx, cap, -4, -18, 9, 4);
	box(ctx, '#eac593', -3, -17, 5, 1);
	if (sack) {
		box(ctx, INK, -8, -13, 6, 7);
		box(ctx, '#c4a371', -7, -12, 5, 5);
		box(ctx, '#edce9b', -6, -12, 3, 1);
	}
	ctx.restore();
}

export function train(ctx, x, y) {
	for (let car = 0; car < 3; car++) {
		const left = x - car * 40;
		const body = car === 0 ? '#384f50' : '#6e593e';
		box(ctx, INK, left - 2, y - 17, 38, 15);
		box(ctx, body, left, y - 16, 34, 11);
		box(ctx, '#ab7750', left, y - 8, 34, 2);
		box(ctx, '#d5ac6d', left + 1, y - 16, 32, 1);
		for (let i = 0; i < 3; i++) box(ctx, '#d2c19d', left + 4 + i * 8, y - 14, 5, 4);
		box(ctx, INK, left + 3, y - 4, 6, 6);
		box(ctx, INK, left + 25, y - 4, 6, 6);
		box(ctx, '#9b8b75', left + 5, y - 3, 2, 3);
		box(ctx, '#9b8b75', left + 27, y - 3, 2, 3);
	}
	box(ctx, INK, x + 27, y - 22, 5, 9);
	box(ctx, '#e8b969', x + 34, y - 11, 3, 3);
}

// Era pieces: a town shows what its state has built by the shot's year.
export function pole(ctx, x, y) {
	box(ctx, SHADOW, x + 2, y, 5, 2);
	box(ctx, INK, x, y - 22, 2, 22);
	box(ctx, INK, x - 5, y - 21, 12, 2);
	box(ctx, '#9b8b75', x - 4, y - 21, 10, 1);
}

export function wire(ctx, x0, x1, y) {
	for (let x = x0; x < x1; x++)
		box(ctx, INK, x, y + Math.round(3 * Math.sin((Math.PI * (x - x0)) / (x1 - x0))), 1, 1);
}

export function aerial(ctx, x, y) {
	box(ctx, INK, x, y - 15, 1, 11);
	box(ctx, INK, x - 4, y - 14, 9, 1);
	box(ctx, INK, x - 3, y - 11, 7, 1);
}

export function solarRoof(ctx, x, y, w) {
	box(ctx, INK, x + 9, y - 3, w - 18, 10);
	box(ctx, '#2a3f72', x + 10, y - 2, w - 20, 8);
	for (let i = x + 13; i < x + w - 10; i += 4) box(ctx, '#5f7fbf', i, y - 2, 1, 8);
	box(ctx, '#5f7fbf', x + 10, y + 2, w - 20, 1);
}

export function car(ctx, x, y, color, facing = 1) {
	ctx.save();
	ctx.translate(Math.round(x), Math.round(y));
	ctx.scale(facing, 1);
	box(ctx, SHADOW, -8, 1, 18, 3);
	box(ctx, INK, -9, -7, 18, 8);
	box(ctx, color, -8, -6, 16, 5);
	box(ctx, INK, -5, -11, 10, 5);
	box(ctx, '#bfd6e0', -4, -10, 8, 3);
	box(ctx, INK, -7, 0, 4, 3);
	box(ctx, INK, 3, 0, 4, 3);
	box(ctx, '#f6dc8c', 7, -5, 2, 2);
	ctx.restore();
}
