// @ts-nocheck
// The Short's page: a 4:5 map clip the owner plays and reacts to in Cap. HyperFrames sends a time on
// every seek; we draw that frame with the live site's Diorama. Nothing here reads a clock.
import { mount, flushSync } from 'svelte';
import data from 'export-data';
import { Diorama } from '$lib/components/sim/diorama/Diorama.js';
import { planShort, shortSceneAt } from '$lib/game/sim/short.js';
import { WIDE } from '$lib/game/sim/camera.js';
import ShortOverlay from './ShortOverlay.svelte';
import './page.css';

const { run, beats, voices, summary, label } = data;
const plan = planShort(run, beats, voices);
const root = document.getElementById('root');
const W = Number(root.dataset.width);
const H = Number(root.dataset.height);
const mapCanvas = document.getElementById('hf-map');
const realCanvas = document.getElementById('hf-real');
const map = new Diorama(mapCanvas, { pixelRatio: 1 });
const real = new Diorama(realCanvas, { pixelRatio: 1 });
map.popLabels = real.popLabels = true;

// The year, figures and captions take the top of the frame, so the map sits lower.
const LOW = { mode: 'diorama', target: [WIDE.target[0], WIDE.target[1] - 70], zoom: 1.08 };
const HALF = { mode: 'diorama', ...WIDE };

const props = $state({ scene: null, label });
mount(ShortOverlay, { target: document.getElementById('hf-hud'), props });

let split = null;
function layout(isSplit) {
	if (isSplit === split) return;
	split = isSplit;
	const h = isSplit ? H / 2 : H;
	Object.assign(mapCanvas.style, { top: `${isSplit ? H / 2 : 0}px`, height: `${h}px`, width: `${W}px`, left: '0px' });
	Object.assign(realCanvas.style, { top: '0px', height: `${H / 2}px`, width: `${W}px`, left: '0px', display: isSplit ? 'block' : 'none' });
	map.resize(W, h);
	if (isSplit) real.resize(W, H / 2);
}

function renderAt(time) {
	const scene = shortSceneAt(run, plan, time, summary);
	const isSplit = scene.phase === 'split';
	layout(isSplit);
	if (isSplit) real.draw(scene.real, HALF); // our world on top, theirs below
	map.draw(scene.frame, isSplit ? HALF : LOW);
	props.scene = scene;
	flushSync();
}

window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
renderAt(0);
