<script>
	// @ts-nocheck
	import { pickVoice } from '$lib/game/sim/speech.js';

	let { narration, chapter = null } = $props();
	let open = $state(false);
	// Read aloud: once on, each new chapter (or the AI text replacing the built-in one) is read in turn.
	let reading = $state(false);
	const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
	const spoken = $derived([narration.text, ...(narration.vignettes ?? [])].join(' '));

	$effect(() => {
		if (!canSpeak || !reading) return;
		const voice = pickVoice(speechSynthesis.getVoices());
		speechSynthesis.cancel();
		// One utterance per sentence: Chrome's online voices go silent ~15 s into a long one.
		for (const sentence of spoken.match(/[^.!?]+[.!?]*\s*/g) ?? [spoken]) {
			const say = new SpeechSynthesisUtterance(sentence.trim());
			if (voice) {
				say.voice = voice;
				say.lang = voice.lang;
			}
			say.rate = 0.95;
			speechSynthesis.speak(say);
		}
		return () => speechSynthesis.cancel();
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
			<button type="button" aria-pressed={reading} onclick={() => (reading = !reading)}>
				{reading ? '■ Stop reading' : '▶ Listen'}
			</button>
		{/if}
	</div>
</aside>
