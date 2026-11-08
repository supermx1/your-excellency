// Roofless rooms on the isometric street: the school, the internet lab, the studio, a home getting
// power, a workshop, and the shared room, framing and furniture the other cutaways use too.
import {
	W,
	H,
	INK,
	PAPER,
	SKIN,
	SHIRTS,
	mix,
	ease,
	point,
	plane,
	solid,
	wallRect,
	plate,
	wallText,
	walker,
	street,
	streetFront
} from './street.js';
import { box } from './town-art.js';

export { W, H, INK, PAPER, SKIN, SHIRTS, mix, ease, point, plane, solid, plate };
export const WOOD = ['#cb9563', '#936147', '#724b3c'];
const TEAL = ['#83aaa0', '#597f77', '#425f60'];

/** A sign with its text, on the back wall (axis 'x') or the left wall (axis 'd'). */
export function captionPlate(ctx, text, x, y, z, width, fill, ink = PAPER, axis = 'x') {
	plate(ctx, x, y, z, width, 10, fill, INK, axis);
	const [cx, cy] = axis === 'x' ? [x + width / 2, y] : [x, y + width / 2];
	wallText(ctx, text, cx, cy, z + 5, ink, axis);
}

/** A window with its frame and sill. */
export function window(ctx, x, w, glass, { y = 6, axis = 'x' } = {}) {
	plate(ctx, x, y, 7, w, 14, glass, INK, axis);
	const [mx, my] = axis === 'x' ? [x + w / 2, y] : [x, y + w / 2];
	wallRect(ctx, '#4f534e', mx, my, 8, 1, 12, axis);
	wallRect(
		ctx,
		'#4f534e',
		x + (axis === 'x' ? 1 : 0),
		y + (axis === 'd' ? 1 : 0),
		13,
		w - 2,
		1,
		axis
	);
	wallRect(
		ctx,
		PAPER,
		x - (axis === 'x' ? 1 : 0),
		y - (axis === 'd' ? 1 : 0),
		5.5,
		w + 2,
		1.5,
		axis
	);
}

export function figure(ctx, i, x, y, { scale = 0.9, stride = 0, facing = 1, hero = false } = {}) {
	walker(ctx, i, x, y, { stride, facing, hero }, scale);
}

export function table(ctx, x, y, w, d, colors = WOOD) {
	for (const leg of [x + 2, x + w - 4])
		solid(ctx, leg, y + d - 3, 2, 2, 7, ['#755043', '#634437', '#51403b']);
	solid(ctx, x, y, w, d, 3, colors, 7);
}

function book(ctx, x, y, color) {
	solid(ctx, x, y, 9, 6, 1, [PAPER, color, '#9b7761'], 10);
	plane(ctx, '#b69b77', x + 4, y, 0.7, 6, 11.05);
}

export function monitor(ctx, x, y, lit, activity) {
	solid(ctx, x, y, 23, 12, 15, ['#a4b4a5', '#778e86', '#586f6d'], 10);
	plate(ctx, x + 3, y + 12, 12, 17, 11, lit ? '#25474e' : '#354b51');
	for (let i = 0; i < 3; i++)
		wallRect(
			ctx,
			'#a9dec1',
			x + 6,
			y + 12,
			15 + i * 2,
			(10 - i) * ease(activity, i / 4, i / 4 + 0.42),
			0.8
		);
}

/** The room: floor, two tall back walls, and the near walls cut low so the floor stays in view. */
function room(ctx, site, shot) {
	street(ctx, site, shot);
	solid(ctx, 0, 0, 153, 124, 2, [site.floor, site.seam, '#8e785e']);
	for (let y = 13; y < 120; y += 10) plane(ctx, site.seam, 3, y, 147, 0.7, 2);
	solid(ctx, 0, 0, 4, 124, 29, site.wall);
	solid(ctx, 0, 0, 153, 6, 29, site.wall);
	solid(ctx, 149, 6, 4, 117, 8, site.wall);
}

/** The near wall with its doorway, then the street in front. */
function frontage(ctx, site, shot) {
	solid(ctx, 0, 121, 63, 4, 8, site.wall);
	solid(ctx, 91, 121, 62, 4, 8, site.wall);
	streetFront(ctx, site, shot);
}

const SCHOOL = {
	wall: ['#f0cc91', '#c39967', '#a07758'],
	floor: '#d8b98c',
	seam: '#c7a77f',
	flag: true
};
const LAB = { wall: ['#b9c4a4', '#879e90', '#668477'], floor: '#a5afa0', seam: '#97a495' };
const STUDIO = { wall: ['#e6bd9a', '#a87776', '#855b62'], floor: '#b58d84', seam: '#a37d76' };
const lit = (shot) => ease(shot.progress, 0.26, 0.52) > 0.5;
const HOME = {
	wall: ['#e2bc8b', '#ad8369', '#795e57'],
	floor: '#a68c77',
	seam: '#947e6d',
	dusk: true,
	lights: lit // the street gets power with the house
};
const SHOP = { wall: ['#efc992', '#b48866', '#90664d'], floor: '#cfa878', seam: '#bb946e' };

function school(ctx, shot) {
	window(ctx, 14, 20, '#93b4ac');
	window(ctx, 120, 20, '#93b4ac');
	window(ctx, 30, 20, '#93b4ac', { y: 4, axis: 'd' });
	plate(ctx, 41, 6, 6, 69, 20, '#36584e', '#6f4f3b');
	const lesson = ease(shot.progress, 0.09, 0.66);
	wallText(
		ctx,
		['A', 'A  B', 'A  B  C'][Math.min(2, Math.floor(lesson * 3))],
		75,
		6,
		17,
		'#eee6bc'
	);
	wallRect(ctx, '#bbcaad', 49, 6, 11, 48 * lesson, 0.9);
	figure(ctx, 1, mix(87, 67, lesson), 23, { stride: Math.sin(lesson * Math.PI * 3) });
	for (const [row, y] of [39, 65, 91].entries()) {
		for (const [col, x] of [17, 61, 105].entries()) {
			table(ctx, x, y, 26, 11);
			const open = ease(shot.progress, 0.23 + col * 0.05, 0.54 + col * 0.05);
			book(ctx, x + 7 + open * 3, y + 3, '#a65342');
			figure(ctx, col + row * 2, x + 12, y + 17, { scale: 0.67, hero: row === 1 && col === 1 });
		}
	}
}

function internet(ctx, shot) {
	const { progress, elapsed, pace } = shot;
	captionPlate(ctx, progress < 0.5 ? 'LINKING' : 'CONNECTED', 48, 6, 11, 57, '#325e61');
	for (const x of [15, 122]) {
		solid(ctx, x, 12, 14, 13, 24, ['#b6c4ad', '#4d6764', '#405557']);
		for (let i = 0; i < 5; i++) {
			wallRect(ctx, '#769e8a', x + 2, 25, 5 + 4 * i, 10, 2);
			wallRect(ctx, '#c0e5ae', x + 4, 25, 5 + 4 * i, 1, 1);
		}
	}
	const send = ease(progress, 0.14, 0.49);
	const receive = ease(progress, 0.47, 0.81);
	plane(ctx, '#637975', 32, 71, 85, 2, 2);
	const pulse = (elapsed * pace * 0.72) % 1;
	plane(ctx, '#ceefb7', mix(34, 111, pulse), 71, 5, 2, 2.2);
	for (const [x, active] of [
		[18, send],
		[91, receive]
	]) {
		table(ctx, x, 41, 43, 22, TEAL);
		monitor(ctx, x + 8, 42, active > 0, active);
		plane(ctx, '#4b635e', x + 10, 58, 21, 4, 10.1);
		figure(ctx, x === 18 ? 2 : 1, x + 22, 70);
	}
	table(ctx, 93, 89, 37, 15, TEAL);
	book(ctx, 106, 93, '#526f68');
	figure(ctx, 3, mix(65, 81, ease(progress, 0.36, 0.86)), 101, {
		stride: Math.sin(elapsed * pace * 7)
	});
}

function broadcast(ctx, shot) {
	window(ctx, 15, 27, '#ad9a9b');
	window(ctx, 116, 23, '#ad9a9b');
	const active = ease(shot.progress, 0.12, 0.32);
	captionPlate(ctx, 'ON AIR', 54, 6, 10, 42, active > 0.5 ? '#ad4e43' : '#76535a');
	solid(ctx, 86, 9, 3, 77, 6, STUDIO.wall);
	plane(ctx, '#9f7776', 94, 33, 45, 48, 2);
	table(ctx, 101, 41, 30, 19);
	figure(ctx, 0, 116, 66, { hero: true });
	solid(ctx, 112, 47, 2, 2, 12, ['#a69c91', '#5e555c', '#51494e'], 10);
	solid(ctx, 110, 46, 6, 4, 5, ['#d0c1aa', '#968983', '#6a6263'], 20);
	table(ctx, 16, 49, 59, 20);
	solid(ctx, 22, 52, 46, 11, 5, ['#747781', '#4b525f', '#414855'], 10);
	for (let i = 0; i < 10; i++) {
		const [x, y] = point(25 + i * 4, 62, 15.1);
		const height = 1 + active * (2 + Math.sin(shot.elapsed * shot.pace * 6 + i * 1.2) * 2);
		box(ctx, i > 6 ? '#e8bf79' : '#a8d3a9', x, y - height, 2, height);
	}
	figure(ctx, 2, 43, 77);
	if (shot.tech === 'television') {
		solid(ctx, 103, 89, 3, 3, 11, ['#67696d', '#4c4b56', '#383846']);
		solid(ctx, 99, 86, 14, 9, 8, ['#939694', '#626775', '#4a4e5a'], 11);
	}
}

function homePower(ctx, shot) {
	window(ctx, 15, 27, '#718198');
	window(ctx, 111, 27, '#718198');
	solid(ctx, 101, 11, 3, 69, 6, HOME.wall);
	solid(ctx, 113, 17, 27, 19, 9, ['#bea08c', '#836459', '#70534b']);
	solid(ctx, 124, 24, 9, 6, 1, ['#dbccac', '#b4927c', '#8a7063'], 9);
	const light = ease(shot.progress, 0.26, 0.52); // same timing as lit()
	ctx.globalAlpha = 0.35 * light;
	plane(ctx, '#ffdd95', 10, 13, 90, 88, 2.1);
	ctx.globalAlpha = 1;
	plane(ctx, '#ab7e6b', 28, 49, 53, 31, 2.15);
	table(ctx, 37, 52, 34, 20);
	book(ctx, 49, 59, '#ae594c');
	figure(ctx, 1, 31, 61);
	figure(ctx, 3, 69, 77);
	figure(ctx, 0, mix(86, 76, ease(shot.progress, 0.42, 0.83)), 54);
	const [x, y] = point(53, 36, 30);
	box(ctx, '#524a4b', x, y - 12, 1.5, 12);
	box(ctx, light > 0.5 ? '#fff0bc' : '#8e8378', x - 3, y, 7, 3);
	ctx.globalAlpha = 0.5 * (1 - light);
	plane(ctx, '#272d46', 3, 7, 145, 113, 2.2);
	ctx.globalAlpha = 1;
}

function workshop(ctx, shot) {
	captionPlate(ctx, 'WORKSHOP', 45, 6, 12, 63, '#496f60');
	window(ctx, 119, 19, '#a5afa0');
	const opening = ease(shot.progress, 0.12, 0.61);
	plate(ctx, 21, 7, 3, 19, 20, '#604a3d');
	const shutter = 18 * (1 - opening);
	wallRect(ctx, '#a7785a', 22, 7, 22 - shutter, 17, shutter);
	for (const offset of [4, 8, 12, 16])
		if (offset < shutter) wallRect(ctx, '#c18d66', 22, 7, 22 - offset, 17, 1);
	for (const x of [13, 56, 106]) {
		table(ctx, x, 26, 28, 14);
		for (let i = 0; i < 3; i++)
			solid(ctx, x + 4 + i * 7, 30, 5, 5, 4, [SHIRTS[i], '#ae8567', '#775746'], 10);
	}
	figure(ctx, 2, 41, 60, { hero: true });
	table(ctx, 20, 65, 42, 15);
	plane(ctx, '#764c3a', 29, 70, 16, 2, 10.05);
	solid(ctx, 114, 65, 14, 12, 8, WOOD);
	solid(ctx, 119, 83, 17, 12, 6, WOOD);
	const walk = ease(shot.progress, 0.28, 0.91);
	figure(ctx, 0, mix(78, 72, walk), mix(153, 88, walk), {
		stride: Math.sin(shot.elapsed * shot.pace * 7) * (1 - ease(shot.progress, 0.83, 0.91))
	});
}

/** Opens on the set filling the frame, then pushes in: the people are the subject, not the street. */
function framed(ctx, shot, paint) {
	const travel = ease(shot.progress, 0, 0.94);
	const zoom = 1.14 + (shot.zoom - 1) * travel * 0.5;
	ctx.save();
	ctx.translate(W / 2 + 2 * (1 - travel), 132);
	ctx.scale(zoom, zoom);
	ctx.translate(-W / 2 - 2, -126);
	paint();
	ctx.restore();
}

/** A roofless room in its street. */
export const cutaway = (site, draw) => (ctx, shot) =>
	framed(ctx, shot, () => {
		room(ctx, site, shot);
		draw(ctx, shot);
		frontage(ctx, site, shot);
	});

/** The same street with an open lot where the room would be (`site.lot` is its ground). */
export const outdoor = (site, draw) => (ctx, shot) =>
	framed(ctx, shot, () => {
		street(ctx, site, shot);
		draw(ctx, shot);
		streetFront(ctx, site, shot);
	});

/** Somewhere with no street (the Moon, Mars, orbit): `backdrop` paints the whole ground. */
export const landscape = (backdrop, draw) => (ctx, shot) =>
	framed(ctx, shot, () => {
		backdrop(ctx, shot);
		draw(ctx, shot);
	});

export const EVERYDAY_SCENES = {
	school: cutaway(SCHOOL, school),
	internet: cutaway(LAB, internet),
	broadcast: cutaway(STUDIO, broadcast),
	'home-power': cutaway(HOME, homePower),
	workshop: cutaway(SHOP, workshop)
};
