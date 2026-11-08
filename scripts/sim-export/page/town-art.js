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






