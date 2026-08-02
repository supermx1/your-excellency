<script>
	// @ts-nocheck
	let { open = $bindable(false), playerCount = null, onRegistered } = $props();

	let registering = $state(false);
	let reg = $state({ name: '', email: '', country: 'Nigeria', consent: false });
	let regError = $state('');

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';

	async function submitRegister() {
		if (!reg.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email) || !reg.consent) {
			regError = 'Add your name, a valid email, and tick the consent box.';
			return;
		}
		registering = true;
		try {
			const res = await fetch('/api/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: reg.name,
					email: reg.email,
					country: reg.country,
					consent: reg.consent
				})
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				regError = data.error || 'Could not register — please try again.';
				return;
			}
			localStorage.setItem('your-excellency-registered', '1');
			regError = '';
			open = false;
			onRegistered?.();
		} catch {
			regError = 'Network error — please try again.';
		} finally {
			registering = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
		<div class="{card} w-full max-w-md p-6">
			<h2 class="text-2xl font-black uppercase">One quick step</h2>
			<p class="mt-1 text-sm font-medium">
				Sign up to play — it saves your progress and lets us tell you when new seasons drop. Free,
				no spam.{playerCount ? ` Join ${playerCount.toLocaleString()} others.` : ''}
			</p>
			<div class="mt-4 grid gap-3">
				<label class="grid gap-1">
					<span class="text-xs font-black uppercase">Name</span>
					<input class={field} bind:value={reg.name} placeholder="Your name" />
				</label>
				<label class="grid gap-1">
					<span class="text-xs font-black uppercase">Email</span>
					<input class={field} type="email" bind:value={reg.email} placeholder="you@example.com" />
				</label>
				<label class="grid gap-1">
					<span class="text-xs font-black uppercase">Country</span>
					<select class={field} bind:value={reg.country}>
						{#each ['Nigeria', 'United States', 'United Kingdom', 'Canada', 'Ghana', 'South Africa', 'Germany', 'United Arab Emirates', 'Other'] as c (c)}
							<option value={c}>{c}</option>
						{/each}
					</select>
				</label>
				<label class="flex items-start gap-2 text-sm font-medium">
					<input
						type="checkbox"
						class="mt-1 h-4 w-4 border-2 border-black"
						bind:checked={reg.consent}
					/>
					<span>I agree to receive occasional emails about Your Excellency.</span>
				</label>
			</div>
			{#if regError}
				<p class="mt-3 border-2 border-black bg-rose-300 p-2 text-sm font-bold">{regError}</p>
			{/if}
			<div class="mt-5 flex gap-3">
				<button
					class="{btn} bg-emerald-400 px-4 py-2 disabled:opacity-50"
					disabled={registering}
					onclick={submitRegister}
				>
					{registering ? 'Saving…' : 'Play now'}
				</button>
				<button class="{btn} bg-white px-4 py-2" onclick={() => (open = false)}>Cancel</button>
			</div>
		</div>
	</div>
{/if}
