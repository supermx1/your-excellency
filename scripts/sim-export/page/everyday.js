// Roofless rooms viewed from the same elevated angle as the town. Motion is driven by shot time.
import {
	aerial,
	box,
	car,
	crates,
	house,
	person,
	pole,
	shape,
	stall,
	tree,
	wire
} from './town-art.js';

const W = 216;
const H = 270;
const INK = '#302a34';
const PAPER = '#f1dfb4';
const WOOD = ['#cb9563', '#936147', '#724b3c'];
const TEAL = ['#83aaa0', '#597f77', '#425f60'];
const CLAY_ROOF = ['#a86749', '#cb8960', '#784f40'];
const TIN_ROOF = ['#738279', '#a0a993', '#52655e'];
const SKIN = ['#966041', '#b78054', '#764c3a'];
const SHIRTS = ['#aa5747', '#536f82', '#6b8261', '#b88148'];
const mix = (a, b, t) => a + (b - a) * t;
const ease = (progress, start, end) => {
	const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
	return t * t * (3 - 2 * t);
};

// Each place gets its own street, so two cutaways in one Short never look like the same room.
function flag(ctx, x, y, t) {
	box(ctx, INK, x, y - 28, 1, 28);
	for (let i = 0; i < 3; i++) {
		const wave = Math.round(Math.sin(t * 5 - i) * 1.2);
		box(ctx, i === 1 ? '#f4efe2' : '#1f7a3d', x + 1 + i * 4, y - 27 + wave, 4, 9);
	}
}
function mast(ctx, x, y, t) {
	for (let k = 0; k < 7; k++) {
		box(ctx, '#5c6669', x - 4 + k * 0.5, y - k * 5, 1, 5);
		box(ctx, '#5c6669', x + 4 - k * 0.5, y - k * 5, 1, 5);
		box(ctx, '#7d878a', x - 4 + k * 0.5, y - k * 5, 9 - k, 1);
	}
	box(ctx, '#d9dfd5', x - 3, y - 30, 2, 4);
	box(ctx, '#d9dfd5', x + 2, y - 30, 2, 4);
	box(ctx, Math.sin(t * 4) > 0 ? '#ff5a43' : '#6e3a34', x, y - 37, 2, 2);
}
function dish(ctx, x, y) {
	box(ctx, INK, x + 4, y + 2, 1, 5);
	shape(ctx, INK, [
		[x - 1, y - 6],
		[x + 10, y - 2],
		[x + 8, y + 3],
		[x, y + 1]
	]);
	shape(ctx, '#e3e3d8', [
		[x, y - 5],
		[x + 9, y - 2],
		[x + 7, y + 2],
		[x + 1, y]
	]);
}
const lit = (shot) => ease(shot.progress, 0.26, 0.52) > 0.5;

const SCHOOL = {
	wall: ['#f0cc91', '#c39967', '#a07758'],
	floor: '#d8b98c',
	seam: '#c7a77f',
	path: '#c98a5e', // laterite
	around(ctx, shot) {
		flag(ctx, 72, 236, shot.elapsed * shot.pace);
		ctx.save();
		ctx.translate(176, 230);
		ctx.scale(1.5, 1.2);
		car(ctx, 0, 0, '#e8b437', -1);
		ctx.restore();
	}
};
const LAB = {
	wall: ['#b9c4a4', '#879e90', '#668477'],
	floor: '#a5afa0',
	seam: '#97a495',
	path: '#b9b5a8', // tarred
	around(ctx, shot) {
		mast(ctx, 105, 62, shot.elapsed * shot.pace);
		car(ctx, 40, 228, '#3f5e86');
	}
};
const STUDIO = {
	wall: ['#e6bd9a', '#a87776', '#855b62'],
	floor: '#b58d84',
	seam: '#a37d76',
	around(ctx) {
		aerial(ctx, 195, 54);
		dish(ctx, 150, 26);
		car(ctx, 182, 228, '#e9e4d6', -1);
	}
};
const HOME = {
	wall: ['#e2bc8b', '#ad8369', '#795e57'],
	floor: '#a68c77',
	seam: '#947e6d',
	dusk: true,
	around(ctx, shot) {
		// The street gets power with the house: poles, wires, and the neighbours' windows light up.
		for (const x of [28, 118]) wire(ctx, x + 1, x + 91, 186);
		for (const x of [28, 118, 209]) pole(ctx, x, 207);
		if (!lit(shot)) return;
		for (const [x, y, w] of [
			[57, 14, 43],
			[111, 22, 59],
			[-17, 54, 59],
			[172, 58, 66]
		])
			for (let i = 25; i < w - 6; i += 13) box(ctx, '#ffd98a', x + i, y + 18, 7, 6);
	}
};
const SHOP = {
	wall: ['#efc992', '#b48866', '#90664d'],
	floor: '#cfa878',
	seam: '#bb946e',
	around(ctx) {
		stall(ctx, 28, 222, ['#ad4e43', '#efd9a8']);
		stall(ctx, 158, 222, ['#3d7a5c', '#efd9a8']);
		crates(ctx, 170, 180);
	}
};

// x and depth are positions on the floor. Height raises an object towards the back of the image.
const point = (x, depth, height = 0) => [23 + x + depth * 0.14, 92 + depth * 0.76 - height];

function plane(ctx, color, x, y, w, d, z = 0) {
	shape(ctx, color, [
		point(x, y, z),
		point(x + w, y, z),
		point(x + w, y + d, z),
		point(x, y + d, z)
	]);
}

function solid(ctx, x, y, w, d, h, [top, front, side], z = 0) {
	const face = z + h;
	shape(ctx, side, [point(x, y, z), point(x, y + d, z), point(x, y + d, face), point(x, y, face)]);
	shape(ctx, front, [
		point(x, y + d, z),
		point(x + w, y + d, z),
		point(x + w, y + d, face),
		point(x, y + d, face)
	]);
	plane(ctx, top, x, y, w, d, face);
}

function plate(ctx, x, y, z, w, h, color, edge = INK) {
	const [left, bottom] = point(x, y, z);
	box(ctx, edge, left, bottom - h, w, h);
	box(ctx, color, left + 1, bottom - h + 1, w - 2, h - 2);
}

function label(ctx, text, x, y, color) {
	ctx.font = 'bold 6px monospace';
	ctx.textAlign = 'center';
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function captionPlate(ctx, text, x, y, z, width, fill, ink = PAPER) {
	plate(ctx, x, y, z, width, 10, fill);
	const [left, bottom] = point(x, y, z);
	label(ctx, text, left + width / 2, bottom - 3, ink);
}

function window(ctx, x, w, glass) {
	plate(ctx, x, 6, 7, w, 14, glass);
	const [left, bottom] = point(x, 6, 7);
	box(ctx, '#4f534e', left + w / 2, bottom - 13, 1, 12);
	box(ctx, '#4f534e', left + 1, bottom - 7, w - 2, 1);
	box(ctx, PAPER, left - 1, bottom, w + 2, 2);
}

function figure(ctx, i, x, y, { scale = 0.9, stride = 0, facing = 1, hero = false } = {}) {
	const [left, bottom] = point(x, y);
	ctx.save();
	ctx.translate(left, bottom);
	ctx.scale(scale, scale);
	person(ctx, 0, 0, {
		color: SHIRTS[i % SHIRTS.length],
		skin: SKIN[i % SKIN.length],
		cap: i % 3 === 0 ? PAPER : '#574039',
		stride,
		facing,
		hero
	});
	ctx.restore();
}

function table(ctx, x, y, w, d, colors = WOOD) {
	for (const leg of [x + 2, x + w - 4])
		solid(ctx, leg, y + d - 3, 2, 2, 7, ['#755043', '#634437', '#51403b']);
	solid(ctx, x, y, w, d, 3, colors, 7);
}

function book(ctx, x, y, color) {
	solid(ctx, x, y, 9, 6, 1, [PAPER, color, '#9b7761'], 10);
	plane(ctx, '#b69b77', x + 4, y, 0.7, 6, 11.05);
}

function yard(ctx, site, shot) {
	const grass = site.dusk ? '#6f796e' : '#a6a76e';
	const path = site.path ?? (site.dusk ? '#a39480' : '#dfc08d');
	box(ctx, grass, -24, -24, W + 48, H + 48);
	box(ctx, site.dusk ? '#8c8877' : '#c9af7f', -24, 49, W + 48, 25);
	box(ctx, site.dusk ? '#7b796d' : '#b8a276', -24, 73, W + 48, 2);
	box(ctx, path, -24, 206, W + 48, 36);
	box(ctx, site.dusk ? '#8d8174' : '#ba9b6e', -24, 241, W + 48, 2);
	plane(ctx, path, 62, 120, 29, 38);
	plane(ctx, site.dusk ? '#756d61' : '#988260', -4, -1, 163, 131);
	for (let i = 0; i < 135; i++) {
		const x = ((i * 97) % 227) - 5;
		const y = (i * 53) % 267;
		if (y > 202 && y < 242) box(ctx, site.dusk ? '#afa08b' : '#e9cf9e', x, y, 2, 0.7);
		else box(ctx, site.dusk ? '#82867a' : '#b6b47c', x, y, 2, 0.7);
	}
	house(ctx, 57, 14, 43, CLAY_ROOF);
	house(ctx, 111, 22, 59, TIN_ROOF);
	house(ctx, -17, 54, 59, TIN_ROOF);
	house(ctx, 172, 58, 66, CLAY_ROOF);
	tree(ctx, 46, 50, 0.59);
	tree(ctx, 14, 132, 0.67);
	tree(ctx, 202, 130, 0.73);
	tree(ctx, 8, 202, 0.84);
	tree(ctx, 206, 202, 0.85);
	crates(ctx, 7, 177);
	site.around(ctx, shot);
}

function room(ctx, site, shot) {
	yard(ctx, site, shot);
	solid(ctx, 0, 0, 153, 124, 2, [site.floor, site.seam, '#8e785e']);
	for (let y = 13; y < 120; y += 10) plane(ctx, site.seam, 3, y, 147, 0.7, 2);
	solid(ctx, 0, 0, 153, 6, 29, site.wall);
	// The near and side walls are cut low so the floor plan remains visible.
	solid(ctx, 0, 6, 4, 117, 8, site.wall);
	solid(ctx, 149, 6, 4, 117, 8, site.wall);
}

function frontage(ctx, site, shot) {
	solid(ctx, 0, 121, 63, 4, 8, site.wall);
	solid(ctx, 91, 121, 62, 4, 8, site.wall);
	for (let i = 0; i < Math.min(3, shot.crowd); i++) {
		const travel = (shot.elapsed * shot.pace * 0.07 + 0.33 * i) % 1;
		const east = i % 2 === 0;
		figure(ctx, i + 1, mix(-54, 191, east ? travel : 1 - travel), 159 + 9 * (i % 2), {
			scale: 0.74,
			facing: east ? 1 : -1,
			stride: Math.sin(shot.elapsed * shot.pace * 7 + i)
		});
	}
}

function school(ctx, shot) {
	window(ctx, 14, 20, '#93b4ac');
	window(ctx, 120, 20, '#93b4ac');
	plate(ctx, 41, 6, 6, 69, 20, '#36584e', '#6f4f3b');
	const [chalkX, chalkY] = point(49, 6, 14);
	const lesson = ease(shot.progress, 0.09, 0.66);
	label(
		ctx,
		['A', 'A   B', 'A   B   C'][Math.min(2, Math.floor(lesson * 3))].padEnd(9),
		chalkX + 24,
		chalkY - 3,
		'#eee6bc'
	);
	box(ctx, '#bbcaad', chalkX, chalkY + 3, 48 * lesson, 0.9);
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

function monitor(ctx, x, y, lit, activity) {
	solid(ctx, x, y, 23, 12, 15, ['#a4b4a5', '#778e86', '#586f6d'], 10);
	plate(ctx, x + 3, y + 12, 12, 17, 11, lit ? '#25474e' : '#354b51');
	const [left, bottom] = point(x + 6, y + 12, 15);
	for (let i = 0; i < 3; i++)
		box(ctx, '#a9dec1', left, bottom - i * 2, (10 - i) * ease(activity, i / 4, i / 4 + 0.42), 0.8);
}

function internet(ctx, shot) {
	const { progress, elapsed, pace } = shot;
	captionPlate(ctx, progress < 0.5 ? 'LINKING' : 'CONNECTED', 48, 6, 11, 57, '#325e61');
	for (const x of [15, 122]) {
		solid(ctx, x, 12, 14, 13, 24, ['#b6c4ad', '#4d6764', '#405557']);
		const [left, bottom] = point(x + 2, 25, 5);
		for (let i = 0; i < 5; i++) {
			box(ctx, '#769e8a', left, bottom - 4 * i, 10, 2);
			box(ctx, '#c0e5ae', left + 2, bottom - 4 * i, 1, 1);
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
	const [doorX, doorY] = point(22, 7, 3);
	box(ctx, '#a7785a', doorX, doorY - 19, 17, 18 * (1 - opening));
	for (const offset of [4, 8, 12, 16])
		if (offset < 18 * (1 - opening)) box(ctx, '#c18d66', doorX, doorY - 19 + offset, 17, 1);
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

function cutaway(site, draw) {
	return (ctx, shot) => {
		// Open on the room filling the frame, then push in: the people are the subject, not the yard.
		const travel = ease(shot.progress, 0, 0.94);
		const zoom = 1.14 + (shot.zoom - 1) * travel * 0.5;
		ctx.save();
		ctx.translate(W / 2 + 2 * (1 - travel), 132);
		ctx.scale(zoom, zoom);
		ctx.translate(-W / 2 - 2, -126);
		room(ctx, site, shot);
		draw(ctx, shot);
		frontage(ctx, site, shot);
		ctx.restore();
	};
}

export const EVERYDAY_SCENES = {
	school: cutaway(SCHOOL, school),
	internet: cutaway(LAB, internet),
	broadcast: cutaway(STUDIO, broadcast),
	'home-power': cutaway(HOME, homePower),
	workshop: cutaway(SHOP, workshop)
};
