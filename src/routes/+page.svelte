<script>
	// @ts-nocheck
	import PlayerCount from '$lib/components/PlayerCount.svelte';
	import favicon from '$lib/assets/favicon.png';

	let { data } = $props();

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none';
</script>

<svelte:head>
	<title>Your Excellency</title>
	<meta
		name="description"
		content="Two Nigerian political simulators: run for President, or govern a constituency. Corruption pays quickly, reform pays slowly."
	/>
</svelte:head>

<main class="min-h-screen bg-amber-100 text-black">
	<section class="border-b-4 border-black bg-emerald-400">
		<div class="mx-auto max-w-7xl px-4 py-10 md:px-8">
			<p
				class="inline-flex -rotate-1 items-center gap-2 border-2 border-black bg-yellow-300 px-2 py-1 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]"
			>
				<img src={favicon} alt="" class="w-10" />
				Your Excellency
			</p>
			<h1 class="mt-4 max-w-3xl text-4xl font-black uppercase leading-tight md:text-6xl">
				Pick your seat of power.
			</h1>
			<p class="mt-4 max-w-2xl border-l-4 border-black pl-3 text-lg font-medium">
				Two games, one satire. Corruption pays quickly, reform pays slowly — see how far you get
				either way.
			</p>
			<div class="mt-6">
				<PlayerCount count={data.playerCount} />
			</div>
		</div>
	</section>

	<div class="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-2 md:px-8">
		<a href="/campaign" class="{card} block p-6 transition hover:-translate-y-1">
			<p
				class="inline-block border-2 border-black bg-lime-300 px-2 py-0.5 text-xs font-black uppercase"
			>
				Game one
			</p>
			<h2 class="mt-3 text-3xl font-black uppercase">The Campaign</h2>
			<p class="mt-2 font-medium">
				A Nigerian presidential campaign simulator. Corruption pays quickly, reform pays slowly.
			</p>
			<span class="{btn} mt-5 inline-block bg-emerald-400 px-4 py-2">Run for President →</span>
		</a>

		<a href="/city" class="{card} block p-6 transition hover:-translate-y-1">
			<p
				class="inline-block border-2 border-black bg-sky-300 px-2 py-0.5 text-xs font-black uppercase"
			>
				Game two
			</p>
			<h2 class="mt-3 text-3xl font-black uppercase">The Constituency</h2>
			<p class="mt-2 font-medium">
				You're given a budget to develop a fictional constituency — schools, hospitals, roads,
				water, power, security, housing, markets — or embezzle it. One term, then the verdict.
			</p>
			<span class="{btn} mt-5 inline-block bg-black px-4 py-2 text-white"
				>Govern a constituency →</span
			>
		</a>
	</div>
</main>
