// @ts-nocheck
// The export page: HyperFrames sends a time on every seek; we draw that one frame with the live
// site's own Diorama, HUD and cards. Nothing here reads a clock.
import { mount, flushSync } from 'svelte';
import data from 'export-data';
import { Diorama } from '$lib/components/sim/diorama/Diorama.js';
import { planExport, sceneAt } from '$lib/game/sim/export.js';
import { shotsFor, WIDE } from '$lib/game/sim/camera.js';
import { defaultData } from '$lib/game/sim/data/index.js';
import Overlay from './Overlay.svelte';
import './page.css';

const { run, options, audio, texts, summary, card } = data;
const plan = planExport(run, { ...options, audio, texts, summary });
const shots = shotsFor(run, plan.timeline);
const root = document.getElementById('root');
const W = Number(root.dataset.width);
const H = Number(root.dataset.height);
const mapCanvas = document.getElementById('hf-map');
const realCanvas = document.getElementById('hf-real');
const map = new Diorama(mapCanvas, { pixelRatio: 1 });
const real = new Diorama(realCanvas, { pixelRatio: 1 });
real.popLabels = true;

const props = $state({ scene: null, card, label: card.label, startYear: plan.from, endYear: plan.to });
mount(Overlay, { target: document.getElementById('hf-hud'), props });

let split = null;
function layout(isSplit) {
	if (isSplit === split) return;
	split = isSplit;
	const w = isSplit ? W / 2 : W;
	mapCanvas.style.width = `${w}px`;
	realCanvas.style.display = isSplit ? 'block' : 'none';
	map.resize(w, H);
	if (isSplit) real.resize(w, H);
}

function renderAt(time) {
	const scene = sceneAt(run, plan, shots, time, defaultData.national);
	const isSplit = scene.phase === 'split';
	layout(isSplit);
	// The split screen shows our world on the left, as the live site does; here the run moves to the right.
	if (isSplit) {
		real.draw(scene.real, { mode: 'diorama', ...WIDE });
		mapCanvas.style.left = `${W / 2}px`;
		realCanvas.style.left = '0px';
	} else mapCanvas.style.left = '0px';
	// Viewers of a video can't press the live map's Population button, so the figures are always on.
	map.popLabels = true;
	map.draw(scene.frame, isSplit ? { mode: 'diorama', ...WIDE } : scene.camera);
	props.scene = scene;
	flushSync();
}

window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
renderAt(0);
