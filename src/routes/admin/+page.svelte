<script>
	// @ts-nocheck
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';

	let { data, form } = $props();
	// One-time initial value for the editor; edits live in local state thereafter.
	let rulebookJson = $state(
		JSON.stringify(
			untrack(() => data.provisions),
			null,
			2
		)
	);
	let password = $state('');
	let saving = $state(false);

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<svelte:head>
	<title>Rulebook Admin · Your Excellency</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="min-h-screen bg-amber-100 px-4 py-8 text-black md:px-8">
	<div class="mx-auto max-w-4xl space-y-6">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<a href="/campaign" class="text-sm font-black uppercase underline">← Back to game</a>
				<h1 class="mt-2 text-4xl font-black uppercase">Rulebook admin</h1>
				<p class="mt-1 max-w-2xl font-medium">
					Edit the game's rule values — party-registration thresholds, tribunal windows,
					legacy-score weights. Saving takes effect for new runs immediately, with no redeploy.
				</p>
			</div>
		</div>

		{#if !data.configured}
			<div class="border-4 border-black bg-yellow-300 p-4 font-bold shadow-[6px_6px_0_0_#000]">
				⚠ No <code>ADMIN_PASSWORD</code> secret is set — the default dev password is accepted. Run
				<code>wrangler secret put ADMIN_PASSWORD</code> before relying on this in production.
			</div>
		{/if}

		{#if form?.success}
			<div class="border-4 border-black bg-lime-300 p-4 font-black shadow-[6px_6px_0_0_#000]">
				✓ Saved {form.count} provisions. New runs will use them right away.
			</div>
		{:else if form?.error}
			<div class="border-4 border-black bg-rose-400 p-4 font-black shadow-[6px_6px_0_0_#000]">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			class="{card} space-y-4 p-5"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update({ reset: false });
					saving = false;
				};
			}}
		>
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">
					Source: {data.fromDefault
						? 'built-in defaults (nothing saved yet)'
						: 'your saved rulebook'}
				</p>
				<label for="provisions" class="mt-2 block text-sm font-black uppercase"
					>Provisions JSON</label
				>
				<textarea
					id="provisions"
					name="provisions"
					class="{field} mt-2 min-h-96 w-full font-mono text-sm"
					bind:value={rulebookJson}
					spellcheck="false"></textarea>
			</div>

			<div class="flex flex-wrap items-end gap-3">
				<label class="grid gap-1">
					<span class="text-xs font-black uppercase">Admin password</span>
					<input
						class={field}
						type="password"
						name="password"
						bind:value={password}
						placeholder="Admin password"
					/>
				</label>
				<button class="{btn} bg-emerald-400 px-5 py-2" disabled={saving}>
					{saving ? 'Saving…' : 'Save rulebook'}
				</button>
			</div>
		</form>
	</div>
</main>
