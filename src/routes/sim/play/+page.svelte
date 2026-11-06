<script>
	// @ts-nocheck
	import { page } from '$app/state';
	import DioramaCanvas from '$lib/components/sim/DioramaCanvas.svelte';
	import Hud from '$lib/components/sim/Hud.svelte';
	import FamilyCard from '$lib/components/sim/FamilyCard.svelte';
	import PlaybackBar from '$lib/components/sim/PlaybackBar.svelte';
	import { startRun } from '$lib/game/sim/client.js';
	import { decodeInputs } from '$lib/game/sim/inputs.js';
	import { buildTimeline, createClock } from '$lib/game/sim/timeline.js';
	import { frameAt } from '$lib/game/sim/frame.js';
	import { statsAt, captionsAt, familyCardsAt } from '$lib/game/sim/hud.js';
	import { shotsFor, cameraAt, WIDE } from '$lib/game/sim/camera.js';
	import { defaultData } from '$lib/game/sim/data/index.js';
	import { PRESETS } from '$lib/game/sim/switches.js';

	const decoded = decodeInputs(page.url.searchParams.get('s'));
	let run = $state();
	let summary = $state(null);
	let error = $state(decoded.ok ? '' : decoded.error);
	let t = $state(0);
	let playing = $state(true);
	let speed = $state(1);
	let follow = $state(true);
	let showSplit = $state(false);
	let showFamilies = $state(false);

	const clock = createClock();
	const timeline = $derived(run && buildTimeline(run));
	const shots = $derived(run && timeline && shotsFor(run, timeline));
	const year = $derived(timeline ? timeline.yearAt(t) : (decoded.inputs?.startYear ?? 1850));
	const frame = $derived(run && frameAt(run, year));
	const camera = $derived(follow && shots ? cameraAt(shots, t) : WIDE);
	const stats = $derived(run ? statsAt(run, defaultData.national, year) : []);
	const caption = $derived.by(() => {
		if (!run) return null;
		const all = captionsAt(run, year);
		const own = all.find((c) => c.title);
		const ours = all.find((c) => c.ours)?.ours;
		return own || ours ? { year: own?.year ?? year, title: own?.title, ours } : null;
	});
	const families = $derived(run ? familyCardsAt(run, year) : []);
	const ended = $derived(timeline && t >= timeline.duration);
	const label = $derived(
		Object.values(PRESETS).find((p) => Object.entries(p.switches).every(([k, v]) => decoded.inputs?.switches[k] === v))?.label ?? 'What if'
	);

	$effect(() => {
		if (!decoded.ok) return;
		const job = startRun(decoded.inputs, { extraSeeds: 50 });
		job.result.then((r) => (run = r)).catch((e) => (error = e.message));
		job.summary.then((s) => (summary = s));
		return () => job.cancel();
	});

	// One animation loop drives playback time; everything on screen derives from `t`.
	$effect(() => {
		if (!run) return;
		let raf;
		let last = performance.now();
		const loop = (now) => {
			clock.playing = playing && !showSplit;
			clock.speed = speed;
			t = Math.min(clock.tick((now - last) / 1000), timeline.duration);
			last = now;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

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
		<div class="absolute inset-0 bottom-40 md:bottom-14">
			<DioramaCanvas {frame} {camera} label="Map of Nigeria in {Math.floor(year)}" />
		</div>
		<Hud {year} {stats} {caption} {label} />

		<div class="absolute right-4 bottom-36 hidden flex-col gap-2 md:right-8 md:bottom-24 md:flex">
			{#each families as card (card.familyId + card.year + card.member)}<FamilyCard {card} />{/each}
		</div>
		<div class="absolute top-3 left-3 md:hidden">
			<button type="button" class="border-2 border-black bg-white px-2 py-1 text-xs font-black uppercase" onclick={() => (showFamilies = !showFamilies)}>Families</button>
			{#if showFamilies}
				<div class="mt-2 flex flex-col gap-2">
					{#each families as card (card.familyId + card.year + card.member)}<FamilyCard {card} />{/each}
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
	{/if}
</main>
