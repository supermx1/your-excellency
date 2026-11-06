<script>
	// @ts-nocheck
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import LiveView from '$lib/components/sim/LiveView.svelte';
	import { unpackOutput } from '$lib/game/sim/recording.js';

	let { data } = $props();

	const recording = $derived(browser && data.output ? unpackOutput(data.output) : null);
	const notice = $derived(
		data.olderEngine && !data.output
			? "This run was made with an older version of the simulation. It's replayed with today's rules, so details may differ."
			: ''
	);
</script>

<svelte:head>
	<title>{data.title} · The Timeline</title>
	<meta property="og:title" content="{data.title} · The Timeline" />
	<meta property="og:description" content="A simulated alternate history of Nigeria — The Timeline" />
	<meta property="og:url" content={page.url.href} />
	<meta name="description" content="A simulated alternate history of Nigeria — The Timeline" />
</svelte:head>

{#if browser}
	{#if recording}
		{#await recording}
			<p class="flex h-screen items-center justify-center bg-[#0e1116] font-serif text-xl text-[#f2efe6]">Loading the recording…</p>
		{:then recorded}
			<LiveView inputs={data.inputs} {recorded} runId={data.id} />
		{:catch}
			<LiveView inputs={data.inputs} runId={data.id} notice="The saved recording couldn't be read, so this run is replayed with today's rules." />
		{/await}
	{:else}
		<LiveView inputs={data.inputs} runId={data.id} {notice} />
	{/if}
{/if}
