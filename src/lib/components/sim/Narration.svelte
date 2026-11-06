<script>
	// @ts-nocheck
	import { readWithKitten, readWithBrowser } from '$lib/game/sim/speech.js';

	let { narration, chapter = null } = $props();
	let open = $state(false);
	// Read aloud: once on, each new chapter (or the AI text replacing the built-in one) is read in turn,
	// with the site's own KittenTTS voice; the browser's voice takes over if that can't load or run.
	let reading = $state(false);
	let voice = $state(''); // 'loading' | 'kitten' | 'browser' (shown on the button and for tests)
	let fallback = false;
	let ctx = null;
	const canSpeak = typeof window !== 'undefined' && ('AudioContext' in window || 'speechSynthesis' in window);
	const spoken = $derived([narration.text, ...(narration.vignettes ?? [])].join(' '));

	function toggle() {
		reading = !reading;
		// Phones only allow audio started from a tap, so the AudioContext is made here, not in the effect.
		if (reading && !ctx && 'AudioContext' in window) ctx = new AudioContext();
		ctx?.resume();
	}

	$effect(() => {
		if (!reading) return;
		const text = spoken;
		const stop = new AbortController();
		const browser = () => {
			voice = 'browser';
			readWithBrowser(text, stop.signal);
		};
		if (ctx && !fallback) {
			voice = 'loading';
			readWithKitten(text, ctx, stop.signal, () => (voice = 'kitten')).catch((err) => {
				if (stop.signal.aborted) return;
				console.warn('KittenTTS unavailable, using the browser voice:', err);
				fallback = true;
				browser();
			});
		} else browser();
		return () => stop.abort();
	});
</script>

<aside
	class="absolute right-4 bottom-56 left-4 max-w-lg bg-black/75 px-3 py-2 font-serif text-sm text-[#f2efe6] shadow-[0_8px_20px_rgba(0,0,0,0.5)] md:right-auto md:bottom-40 md:left-8 md:text-base"
	aria-label="Narration"
>
	{#if chapter}<p class="text-[10px] font-black tracking-[0.15em] text-amber-300 uppercase">Chapter {chapter.index + 1} · {chapter.from}–{chapter.to}</p>{/if}
	<p data-testid="narration" aria-live="polite" class={open ? '' : 'line-clamp-3'}>{narration.text}</p>
	{#if open}
		{#each narration.vignettes as v, i (i)}<p class="mt-2 text-sm italic opacity-80">{v}</p>{/each}
	{/if}
	<div class="mt-1 flex gap-4 text-xs font-black tracking-wider text-amber-300 uppercase">
		<button type="button" aria-expanded={open} onclick={() => (open = !open)}>{open ? 'Less' : 'More'}</button>
		{#if canSpeak}
			<button type="button" aria-pressed={reading} data-voice={reading ? voice : ''} onclick={toggle}>
				{!reading ? '▶ Listen' : voice === 'loading' ? 'Loading voice…' : '■ Stop reading'}
			</button>
		{/if}
	</div>
</aside>
