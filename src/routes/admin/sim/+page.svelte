<script>
	// @ts-nocheck
	import { scenarioLabel } from '$lib/game/sim/narration.js';

	let { data, form } = $props();

	const card = 'border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]';
	const btn = 'border-2 border-black px-3 py-1 font-black uppercase shadow-[3px_3px_0_0_#000]';
	const field = 'border-2 border-black px-2 py-1';

	let password = $state('');
	let ownerTools = $state(false);
	$effect(() => {
		try {
			ownerTools = localStorage.getItem('timeline-owner') === '1';
		} catch {
			ownerTools = false;
		}
	});
	function toggleOwner() {
		ownerTools = !ownerTools;
		try {
			localStorage.setItem('timeline-owner', ownerTools ? '1' : '0');
		} catch {
			/* storage blocked: owner tools stay off */
		}
	}
</script>

<svelte:head><title>The Timeline admin · Your Excellency</title></svelte:head>

<main class="min-h-screen bg-amber-100 p-4 text-black md:p-8">
	<div class="mx-auto max-w-4xl space-y-6">
		<header>
			<a href="/admin" class="text-sm font-black uppercase underline">← Admin</a>
			<h1 class="mt-2 text-4xl font-black uppercase">The Timeline: featured runs</h1>
			<p class="mt-2 font-medium">
				Feature a run from its ending screen ("Feature this run"). Here you can rewrite any chapter's narration before
				recording or exporting. Chapter numbers match the label above the narration in the video.
			</p>
		</header>

		<div class="{card} flex flex-wrap items-end gap-4">
			<label class="font-bold">
				Admin password
				<input type="password" class="{field} mt-1 block" bind:value={password} autocomplete="current-password" />
			</label>
			<label class="flex items-center gap-2 font-bold">
				<input type="checkbox" class="size-5 border-2 border-black" checked={ownerTools} onchange={toggleOwner} />
				Show owner tools on this device
			</label>
		</div>

		{#if form?.error}<p role="alert" class="border-2 border-black bg-red-200 p-3 font-bold">{form.error}</p>{/if}
		{#if form?.success}<p role="status" class="border-2 border-black bg-emerald-200 p-3 font-bold">Saved.</p>{/if}

		{#if !data.available}
			<p class={card}>The database isn't available here.</p>
		{:else if !data.runs.length}
			<p class={card}>No featured runs yet.</p>
		{/if}

		{#each data.runs as run (run.id)}
			<section class="{card} space-y-4" aria-labelledby="run-{run.id}">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 id="run-{run.id}" class="text-2xl font-black uppercase">{run.title ?? scenarioLabel(run.inputs)}</h2>
						<p class="text-sm">{scenarioLabel(run.inputs)} · from {run.inputs.startYear} · <a class="underline" href="/sim/run/{run.id}">/sim/run/{run.id}</a></p>
					</div>
					<form method="POST" action="?/unfeature">
						<input type="hidden" name="password" value={password} />
						<input type="hidden" name="id" value={run.id} />
						<button class="{btn} bg-white">Unfeature</button>
					</form>
				</div>

				{#each [...Object.entries(run.narration).map(([i, n]) => [Number(i) + 1, n]), [null, { text: '', vignettes: [] }]] as [number, n] (number ?? 'new')}
					<form method="POST" action="?/narration" class="space-y-2 border-t-2 border-black/20 pt-3">
						<input type="hidden" name="password" value={password} />
						<input type="hidden" name="id" value={run.id} />
						<label class="block font-bold">
							Chapter number
							<input name="chapterNumber" type="number" min="1" required class="{field} ml-2 w-20" value={number ?? ''} />
						</label>
						<label class="block font-bold">
							Narration <span class="font-normal">(empty removes your version)</span>
							<textarea name="text" rows="4" class="{field} mt-1 block w-full font-serif">{n.text}</textarea>
						</label>
						<label class="block font-bold">
							Family vignettes <span class="font-normal">(one per line, up to 4)</span>
							<textarea name="vignettes" rows="3" class="{field} mt-1 block w-full font-serif">{n.vignettes.join('\n')}</textarea>
						</label>
						<button class="{btn} bg-emerald-400">{number ? 'Save chapter' : 'Add chapter'}</button>
					</form>
				{/each}
			</section>
		{/each}
	</div>
</main>
