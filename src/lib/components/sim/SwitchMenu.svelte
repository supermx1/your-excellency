<script>
	// @ts-nocheck
	import { SWITCHES } from '$lib/game/sim/switches.js';

	let { switches = $bindable() } = $props();

	const groups = Object.entries(SWITCHES).reduce((acc, [key, s]) => {
		(acc[s.group] ??= []).push([key, s]);
		return acc;
	}, {});
	const LABELS = { off: 'Off', history: 'As history', likely: 'Likely', low: 'Low', high: 'High', secular: 'Secular', choose: 'Each state chooses' };
</script>

<div class="grid gap-4 md:grid-cols-2">
	{#each Object.entries(groups) as [group, items] (group)}
		<fieldset class="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
			<legend class="border-2 border-black bg-yellow-300 px-2 text-sm font-black uppercase">{group}</legend>
			<div class="mt-2 space-y-4">
				{#each items as [key, s] (key)}
					<div>
						{#if s.type === 'bool'}
							<label class="flex items-center gap-2 font-bold">
								<input type="checkbox" class="size-5 border-2 border-black" bind:checked={switches[key]} />
								{s.label}
							</label>
						{:else if s.type === 'enum'}
							<p class="font-bold">{s.label}</p>
							<div class="mt-1 flex flex-wrap gap-1" role="radiogroup" aria-label={s.label}>
								{#each s.options as option (option)}
									<label
										class="cursor-pointer border-2 border-black px-2 py-1 text-xs font-black uppercase {switches[key] === option
											? 'bg-black text-white'
											: 'bg-white'}"
									>
										<input type="radio" class="sr-only" name={key} value={option} bind:group={switches[key]} />
										{LABELS[option] ?? option}
									</label>
								{/each}
							</div>
						{:else if s.type === 'number'}
							<label class="block font-bold" for={key}>{s.label}: ×{Number(switches[key]).toFixed(1)}</label>
							<input id={key} type="range" class="w-full accent-black" min={s.min} max={s.max} step="0.1" bind:value={switches[key]} />
						{:else}
							<label class="block font-bold" for={key}>{s.label}</label>
							<input
								id={key}
								type="number"
								class="mt-1 w-32 border-2 border-black px-2 py-1"
								min={s.min}
								max={s.max}
								placeholder="As history"
								value={switches[key] ?? ''}
								oninput={(e) => (switches[key] = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
							/>
						{/if}
						<p class="mt-1 text-sm text-black/70">{s.description}</p>
					</div>
				{/each}
			</div>
		</fieldset>
	{/each}
</div>
