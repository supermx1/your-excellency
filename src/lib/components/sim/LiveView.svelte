<script>
	// @ts-nocheck
	import DioramaCanvas from '$lib/components/sim/DioramaCanvas.svelte';
	import Hud from '$lib/components/sim/Hud.svelte';
	import FamilyCard from '$lib/components/sim/FamilyCard.svelte';
	import PlaybackBar from '$lib/components/sim/PlaybackBar.svelte';
	import TwoNigerias from '$lib/components/sim/TwoNigerias.svelte';
	import Ending from '$lib/components/sim/Ending.svelte';
	import Narration from '$lib/components/sim/Narration.svelte';
	import { encodeInputs } from '$lib/game/sim/inputs.js';
	import { startRun } from '$lib/game/sim/client.js';
	import { chaptersFor, digestChapter, fallbackNarration, scenarioLabel } from '$lib/game/sim/narration.js';
	import { buildTimeline, createClock } from '$lib/game/sim/timeline.js';
	import { frameAt } from '$lib/game/sim/frame.js';
	import { statsAt, captionsAt, familyCardsAt } from '$lib/game/sim/hud.js';
	import { shotsFor, cameraAt, WIDE } from '$lib/game/sim/camera.js';
	import { INTRO, OUTRO, introCamera, outroCamera } from '$lib/game/sim/intro.js';
	import { defaultData } from '$lib/game/sim/data/index.js';

	/** inputs: run these in the worker; recorded: play a saved recording instead; runId: the saved run, if any. */
	let { inputs, recorded = null, runId = null, notice = '', loadError = '' } = $props();

	let workerRun = $state.raw(null);
	const run = $derived(recorded ?? workerRun);
	let summary = $state.raw(null);
	let workerError = $state('');
	const error = $derived(loadError || workerError);
	let narrations = $state({});
	let t = $state(0);
	let playing = $state(true);
	let speed = $state(1);
	let follow = $state(true);
	let showSplit = $state(false);
	let showFamilies = $state(false);
	let autoSplit = $state(false);
	const shownKeys = new Set();

	const clock = createClock();
	const timeline = $derived(run && buildTimeline(run));
	const shots = $derived(run && timeline && shotsFor(run, timeline));
	const year = $derived(timeline ? timeline.yearAt(t) : (inputs?.startYear ?? 1850));
	const frame = $derived(run && frameAt(run, year));
	const camera = $derived.by(() => {
		if (t < INTRO) return introCamera(t);
		if (timeline && t > timeline.duration) return outroCamera(t - timeline.duration);
		return follow && shots ? cameraAt(shots, t) : WIDE;
	});
	const stats = $derived(run ? statsAt(run, defaultData.national, year) : []);
	const caption = $derived.by(() => {
		if (!run) return null;
		const all = captionsAt(run, year);
		const own = all.find((c) => c.title);
		const ours = all.find((c) => c.ours)?.ours;
		return own || ours ? { year: own?.year ?? year, title: own?.title, ours } : null;
	});
	const families = $derived(run ? familyCardsAt(run, year) : []);
	// The outro plays for OUTRO seconds after the last year; then the ending panel.
	const ended = $derived(timeline && t >= timeline.duration + OUTRO);
	const label = $derived(scenarioLabel(inputs));
	const chapters = $derived(run ? chaptersFor(run) : []);
	const chapter = $derived(chapters.findLast((c) => c.from <= Math.floor(year)) ?? chapters[0]);
	const narration = $derived(chapter && (narrations[chapter.index] ?? fallbackFor(chapter)));

	function fallbackFor(ch) {
		return fallbackNarration(digestChapter(run, ch));
	}

	/** Ask the server for a chapter's narration once; the built-in text shows until (unless) it arrives. */
	const requested = new Set();
	function loadNarration(ch) {
		if (!ch || requested.has(ch.index)) return;
		requested.add(ch.index);
		fetch('/api/sim/narrate', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runId: runId ?? undefined, chapterIndex: ch.index, digest: digestChapter(run, ch) })
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((body) => {
				if (body?.narration) narrations[ch.index] = body.narration;
			})
			.catch(() => {});
	}

	$effect(() => {
		if (!chapter) return;
		loadNarration(chapter);
		loadNarration(chapters[chapter.index + 1]);
	});

	$effect(() => {
		if (recorded || !inputs) return;
		const job = startRun(inputs, { extraSeeds: 50 });
		job.result.then((r) => (workerRun = r)).catch((e) => (workerError = e.message));
		job.summary.then((s) => (summary = s));
		return () => job.cancel();
	});

	// One animation loop drives playback time; everything on screen derives from `t`.
	$effect(() => {
		if (!run) return;
		let raf;
		let last = performance.now();
		const loop = (now) => {
			clock.playing = playing && !showSplit && !autoSplit;
			clock.speed = speed;
			t = Math.min(clock.tick((now - last) / 1000), timeline.duration + OUTRO);
			last = now;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	// At each key year reached during playback, pause for a Two Nigerias split screen (4 s, or until Continue).
	// Scrubbing or jumping while paused never triggers it.
	let splitTimer;
	$effect(() => {
		if (!timeline || ended || !playing) return;
		const y = Math.floor(year);
		if (y === timeline.keyYears[0] || shownKeys.has(y) || !timeline.keyYears.includes(y)) return;
		shownKeys.add(y);
		autoSplit = true;
		clearTimeout(splitTimer);
		splitTimer = setTimeout(() => (autoSplit = false), 4000);
	});
	$effect(() => () => clearTimeout(splitTimer));

	function runAgain() {
		const seed = crypto.getRandomValues(new Uint32Array(1))[0];
		location.href = `/sim/play?s=${encodeInputs({ ...inputs, seed })}`;
	}

	function skipIntro() {
		clock.set(INTRO);
		t = clock.t;
	}

	function seek(y) {
		clock.set(timeline.timeAt(y));
		t = clock.t;
	}

	function onKey(e) {
		if (e.code === 'Space' && e.target === document.body) {
			e.preventDefault();
			playing = !playing;
		}
	}
</script>

<svelte:window onkeydown={onKey} />
<svelte:head><title>The Timeline · Your Excellency</title></svelte:head>

<main class="relative h-[100dvh] overflow-hidden bg-[#0e1116]">
	{#if error}
		<div class="flex h-full items-center justify-center p-4">
			<div role="alert" class="max-w-md border-4 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
				<h1 class="text-2xl font-black uppercase">This run couldn't load</h1>
				<p class="mt-2 font-medium">{error}</p>
				<a href="/sim" class="mt-4 inline-block border-2 border-black bg-emerald-400 px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_#000]">Back to setup</a>
			</div>
		</div>
	{:else if !run}
		<p class="flex h-full items-center justify-center font-serif text-xl text-[#f2efe6]" aria-live="polite">Running history…</p>
	{:else}
		<div class="absolute inset-0 bottom-40 md:bottom-14" data-testid="view" data-camera={camera.mode ?? 'diorama'} data-dip={camera.dip ?? 0}>
			<DioramaCanvas {frame} {camera} label={camera.mode === 'globe' ? 'The Earth, turning towards Nigeria' : `Map of Nigeria in ${Math.floor(year)}`} />
		</div>
		{#if camera.title > 0}
			<div class="pointer-events-none absolute inset-0 bottom-40 flex flex-col items-center justify-center text-[#f2efe6] md:bottom-14" style:opacity={camera.title}>
				<p class="font-serif text-7xl font-black md:text-9xl">{run.history[0].year}</p>
				<p class="mt-2 text-sm font-black tracking-[0.3em] uppercase">{label}</p>
			</div>
		{/if}
		{#if t < INTRO}
			<button type="button" class="absolute right-3 bottom-44 z-20 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] md:right-8 md:bottom-20" onclick={skipIntro}>Skip intro</button>
		{/if}
		<Hud {year} {stats} {caption} {label} />
		{#if narration}<Narration {narration} {chapter} />{/if}
		{#if notice}
			<p class="absolute top-14 left-3 max-w-sm border-2 border-black bg-yellow-200 px-2 py-1 text-xs font-bold md:top-3">{notice}</p>
		{/if}

		<div class="absolute right-4 bottom-36 hidden flex-col gap-2 md:right-8 md:bottom-24 md:flex">
			{#each families as card (card.key)}<FamilyCard {card} />{/each}
		</div>
		<div class="absolute top-3 left-3 md:hidden">
			<button type="button" class="border-2 border-black bg-white px-2 py-1 text-xs font-black uppercase" onclick={() => (showFamilies = !showFamilies)}>Families</button>
			{#if showFamilies}
				<div class="mt-2 flex flex-col gap-2">
					{#each families as card (card.key)}<FamilyCard {card} />{/each}
				</div>
			{/if}
		</div>

		<PlaybackBar
			{playing}
			{speed}
			{year}
			{follow}
			startYear={run.history[0].year}
			endYear={run.history.at(-1).year}
			keyYears={timeline.keyYears}
			onToggle={() => (playing = !playing)}
			onSpeed={(s) => (speed = s)}
			onSeek={seek}
			onFollow={() => (follow = !follow)}
			onSplit={() => (showSplit = !showSplit)}
		/>

		{#if (showSplit || autoSplit) && !ended}
			<TwoNigerias {run} {year} onContinue={() => (showSplit = autoSplit = false)} />
		{/if}
		{#if ended}
			<div class="absolute inset-0 z-10"><TwoNigerias {run} year={run.history.at(-1).year} /></div>
			<Ending {run} {summary} onRunAgain={runAgain} changeHref="/sim?s={encodeInputs(inputs)}" {inputs} {runId} />
		{/if}
	{/if}
</main>
