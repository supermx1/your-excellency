import {
	aerial,
	box,
	car,
	crates,
	house,
	person,
	pole,
	solarRoof,
	stall,
	train,
	tree,
	wire
} from './town-art.js';
import { SPACE_SCENES } from './space.js';
import { EVERYDAY_SCENES } from './everyday.js';

const CUTAWAY_VIEWS = { ...SPACE_SCENES, ...EVERYDAY_SCENES };

const VIEW = [216, 270];
const WORLD = [336, 392];
const OUTPUT_SCALE = 5;
const OCHRE = ['#9a593f', '#bc7650', '#77473b'];
const RUST = ['#a76b49', '#cd8c59', '#805541'];
const TIN = ['#697e75', '#91a095', '#4f625c'];
const AWNINGS = [
	['#b95345', '#edc98b'],
	['#547b72', '#f2d098'],
	['#d09b49', '#eee0a9']
];
const CLOTHES = ['#376b65', '#924e4e', '#77638a', '#586c86', '#c58a41', '#647b4c'];
const SKIN = ['#8e5b3d', '#a86e48', '#c28c5a'];
const LETTERS = {
	A: [2, 5, 7, 5, 5],
	D: [6, 5, 5, 5, 6],
	E: [7, 4, 6, 4, 7],
	I: [7, 2, 2, 2, 7],
	K: [5, 5, 6, 5, 5],
	L: [4, 4, 4, 4, 7],
	M: [5, 7, 7, 5, 5],
	R: [6, 5, 6, 5, 5],
	T: [7, 2, 2, 2, 2],
	W: [5, 5, 7, 7, 5],
	Y: [5, 5, 2, 2, 2]
};

const SETS = {
	station: {
		rail: true,
		hero: [
			[0, 99, 250],
			[0.28, 130, 227],
			[0.64, 155, 176],
			[0.86, 179, 147],
			[1, 179, 147]
		],
		extraStalls: [
			[227, 163, 2],
			[263, 161, 1]
		]
	},
	market: {
		rail: false,
		hero: [
			[0, 103, 250],
			[0.33, 134, 224],
			[0.65, 177, 191],
			[0.85, 191, 166],
			[1, 191, 166]
		],
		extraStalls: [
			[88, 125, 2],
			[128, 122, 0],
			[173, 122, 1],
			[220, 122, 2],
			[227, 163, 0]
		]
	}
};

// Each path is a lane clear of buildings. These same extras can dress either set.
const LANES = [
	[54, 283, 293, 284],
	[281, 216, 65, 215],
	[69, 189, 269, 193],
	[240, 260, 105, 264],
	[125, 279, 151, 151],
	[218, 143, 202, 277]
];
const CROWD = Array.from({ length: 24 }, (_, i) => ({
	lane: LANES[i % LANES.length],
	offset: (i * 0.371) % 1,
	pace: 0.055 + (i % 5) * 0.012,
	yOffset: Math.floor(i / LANES.length) * 5,
	color: CLOTHES[(i + Math.floor(i / LANES.length) * 3) % CLOTHES.length],
	skin: SKIN[i % SKIN.length],
	cap: ['#d0b081', '#4f4f4c', '#a36a49'][i % 3],
	sack: i % 7 === 0
}));

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function makeCanvas([width, height]) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function sign(ctx, label, x, y, width, fill, ink) {
	box(ctx, '#302c31', x, y, width, 10);
	box(ctx, fill, x + 1, y + 1, width - 2, 8);
	const left = x + Math.floor((width - label.length * 4) / 2);
	for (const [i, letter] of [...label].entries()) {
		for (const [row, bits] of LETTERS[letter].entries()) {
			for (let col = 0; col < 3; col++) {
				if (bits & (4 >> col)) box(ctx, ink, left + i * 4 + col, y + 2 + row, 1, 1);
			}
		}
	}
}

function buildTown(set, techs) {
	const canvas = makeCanvas(WORLD);
	const ctx = canvas.getContext('2d');
	box(ctx, '#a5a063', 0, 0, ...WORLD);
	box(ctx, '#b1a166', 34, 39, 266, 299);
	box(ctx, '#d8b784', 38, 136, 260, 145);
	box(ctx, '#e0c390', 116, 41, 86, 324);
	box(ctx, '#e4c899', 0, 203, WORLD[0], 31);
	box(ctx, '#c9a978', 0, 233, WORLD[0], 3);
	box(ctx, '#d4b481', 0, 272, WORLD[0], 23);
	box(ctx, '#e5c58f', 0, 275, WORLD[0], 3);
	// Small clay and grass flecks, seeded by their indices so the ground stays still.
	for (let i = 0; i < 1000; i++) {
		const x = (i * 137 + Math.floor(i / 29) * 19) % WORLD[0];
		const y = (i * 97 + Math.floor(i / 13) * 17) % WORLD[1];
		const ground =
			(x > 38 && x < 298 && y > 136 && y < 281) ||
			(y > 203 && y < 234) ||
			(x > 116 && x < 202 && y > 41 && y < 365);
		box(
			ctx,
			ground ? (i % 2 ? '#d2ae7d' : '#ecd1a0') : i % 2 ? '#8f9259' : '#beb077',
			x,
			y,
			1 + (i % 3),
			1
		);
	}

	for (const [x, y, w, roof] of [
		[7, 37, 51, TIN],
		[63, 33, 38, RUST],
		[210, 29, 51, OCHRE],
		[269, 46, 62, TIN],
		[11, 156, 34, OCHRE],
		[282, 152, 48, RUST],
		[11, 241, 43, RUST],
		[275, 240, 49, TIN],
		[30, 309, 63, TIN],
		[219, 304, 55, OCHRE],
		[273, 337, 53, RUST],
		[92, 352, 42, OCHRE]
	]) {
		house(ctx, x, y, w, roof);
		if (techs.has('solar-power')) solarRoof(ctx, x, y, w);
		if (techs.has('television')) aerial(ctx, x + (w >> 1), y - 4);
	}

	for (const [x, y, scale] of [
		[25, 88, 1.2],
		[91, 79, 0.9],
		[222, 78, 0.8],
		[279, 93, 1.15],
		[323, 133, 1],
		[55, 157, 1],
		[304, 205, 0.9],
		[18, 215, 0.95],
		[77, 254, 0.95],
		[264, 258, 0.95],
		[115, 310, 1.15],
		[199, 302, 0.95],
		[314, 303, 1.2],
		[24, 359, 1.2],
		[242, 368, 1],
		[145, 367, 1.05]
	])
		tree(ctx, x, y, scale);

	// Telegraph or power lines along the road, once the state has them.
	if (techs.has('telegraph') || techs.has('electricity')) {
		const poles = [12, 62, 112, 162, 212, 262, 312];
		for (const [i, x] of poles.entries()) {
			if (i) wire(ctx, poles[i - 1] + 1, x + 1, 183);
			pole(ctx, x, 203);
		}
	}

	if (set.rail) {
		box(ctx, '#99826a', 0, 102, WORLD[0], 26);
		box(ctx, '#ac967b', 0, 105, WORLD[0], 19);
		for (let x = 2; x < WORLD[0]; x += 8) box(ctx, '#67584e', x, 106, 3, 16);
		for (const y of [109, 118]) {
			box(ctx, '#4c4a49', 0, y, WORLD[0], 3);
			box(ctx, '#b8afa0', 0, y, WORLD[0], 1);
		}
		box(ctx, '#ae8b65', 86, 128, 175, 18);
		box(ctx, '#ebc790', 86, 128, 175, 4);
		house(ctx, 92, 67, 118, OCHRE);
		sign(ctx, 'RAILWAY', 133, 82, 38, '#efcf94', '#302c31');
		crates(ctx, 104, 132);
		crates(ctx, 220, 134);
	} else {
		house(ctx, 105, 70, 94, RUST);
		sign(ctx, 'MARKET', 133, 85, 38, '#efcf94', '#302c31');
		box(ctx, '#c7a477', 59, 102, 214, 15);
	}

	for (const [x, y, color] of [
		[55, 164, 0],
		[93, 166, 1],
		[193, 163, 0],
		[54, 239, 2],
		[214, 242, 1],
		[245, 233, 0],
		...set.extraStalls
	])
		stall(ctx, x, y, AWNINGS[color]);
	for (const [x, y] of [
		[61, 183],
		[100, 186],
		[224, 187],
		[247, 251],
		[70, 306]
	])
		crates(ctx, x, y);
	return canvas;
}

function heroAt(path, progress, elapsed) {
	const next = path.findIndex(([at]) => at >= progress && at > 0);
	const from = path[next - 1];
	const to = path[next];
	const before = path[next - 2] ?? from;
	const after = path[next + 1] ?? to;
	const duration = to[0] - from[0];
	const t = (progress - from[0]) / duration;
	const blend = smooth(t);
	// Keep the same velocity on either side of a waypoint and ease into the final hold.
	const coordinate = (axis) => {
		if (from[axis] === to[axis]) return from[axis];
		const startSpeed =
			before[axis] === from[axis] ? 0 : (to[axis] - before[axis]) / (to[0] - before[0]);
		const endSpeed =
			after[axis] === to[axis] ? 0 : (after[axis] - from[axis]) / (after[0] - from[0]);
		return (
			lerp(from[axis], to[axis], blend) +
			duration * t * (1 - t) * ((1 - t) * startSpeed - t * endSpeed)
		);
	};
	const walking = clamp((path.at(-2)[0] - progress) * 18, 0, 1);
	return {
		x: coordinate(1),
		y: coordinate(2),
		stride: 2 * Math.sin(elapsed * 2.25 * Math.PI) * walking,
		color: '#30685d',
		skin: '#b37749',
		cap: '#f0d0a0',
		sack: true,
		hero: true
	};
}

function extraAt(actor, elapsed) {
	const [x, y, toX, toY] = actor.lane;
	const cycle = (actor.offset + elapsed * actor.pace) % 2;
	const t = cycle < 1 ? cycle : 2 - cycle;
	return {
		...actor,
		x: lerp(x, toX, t),
		y: lerp(y, toY, t) + actor.yOffset,
		facing: Math.sign(toX - x) * (cycle < 1 ? 1 : -1),
		stride: 2 * Math.sin((elapsed + actor.offset) * 2 * Math.PI)
	};
}

/** Draws a shot entirely from its time, so backwards seeks produce the same frame. */
export function createTownView(canvas) {
	[canvas.width, canvas.height] = VIEW.map((size) => size * OUTPUT_SCALE);
	const ctx = canvas.getContext('2d', { alpha: false });
	ctx.imageSmoothingEnabled = false;
	const backgrounds = new Map();
	return (shot) => {
		const drawCutaway = CUTAWAY_VIEWS[shot.preset];
		if (drawCutaway) {
			ctx.setTransform(OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0);
			drawCutaway(ctx, shot);
			return;
		}
		const set = SETS[shot.preset];
		const techs = new Set(shot.techs ?? []);
		const key = `${shot.preset}|${[...techs].sort().join()}`;
		if (!backgrounds.has(key)) backgrounds.set(key, buildTown(set, techs));
		const elapsed = shot.elapsed * shot.pace;
		const hero = heroAt(set.hero, shot.progress, elapsed);
		const zoom = lerp(1, shot.zoom, smooth(shot.progress));
		const width = VIEW[0] / zoom;
		const height = VIEW[1] / zoom;
		const left = clamp(lerp(157, hero.x, 0.56) - width / 2, 0, WORLD[0] - width);
		const top = clamp(lerp(38, 34, shot.progress), 0, WORLD[1] - height);
		const scale = zoom * OUTPUT_SCALE;
		// Keep the town texture crisp and place it and the actors at output resolution.
		ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
		ctx.drawImage(backgrounds.get(key), 0, 0);
		if (techs.has('motor-car'))
			for (let k = 0; k < 3; k++) {
				const span = WORLD[0] + 40;
				car(ctx, ((elapsed * 26 + k * 130) % span) - 20, 216, CLOTHES[k * 2], 1);
				car(ctx, WORLD[0] + 20 - ((elapsed * 21 + k * 150) % span), 230, CLOTHES[k * 2 + 1], -1);
			}
		if (set.rail) {
			const x = lerp(-100, 202, smooth(clamp(shot.progress / 0.84, 0, 1)));
			train(ctx, x, 117);
			for (let i = 0; i < 4; i++) {
				const age = (elapsed * 1.2 + i / 4) % 1;
				ctx.globalAlpha = 0.65 * (1 - age);
				box(ctx, '#e0cdb1', x + 29 - 24 * age, 94 - 18 * age, 3 + i, 2 + i);
			}
			ctx.globalAlpha = 1;
		}
		const people = CROWD.slice(0, shot.crowd).map((actor) => extraAt(actor, elapsed));
		people.push(hero);
		people.sort((a, b) => a.y - b.y);
		for (const actor of people) person(ctx, actor.x, actor.y, actor);
		sign(ctx, 'TRADER', hero.x - 16, hero.y + 5, 32, '#f1cc65', '#302c31');
	};
}
