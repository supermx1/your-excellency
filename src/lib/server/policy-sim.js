// @ts-nocheck
// AI policy simulator (PRD §5.4/§8, Milestone B): KV cache → provider → strict
// JSON validation. Any failure returns null and the caller uses the engine's
// deterministic fallback, so the policy step always completes.

const SYSTEM =
	'You simulate Nigerian public reaction to a fictional president\'s policy in a satirical game. ' +
	'No real living people. Reply with STRICT JSON only — no prose, no markdown fences.';

const SEGMENTS = ['Market women', 'Youth organisers', 'Traditional leaders'];
const SEGMENT_SET_VERSION = 1;

// Workers AI JSON mode — small models can't hold strict JSON on their own.
const RESPONSE_SCHEMA = {
	type: 'object',
	required: ['segments', 'summary'],
	properties: {
		segments: {
			type: 'array',
			items: {
				type: 'object',
				required: ['segmentId', 'reaction', 'approvalDelta', 'keyConcern', 'protestProbability', 'socialSentiment'],
				properties: {
					segmentId: { type: 'string', enum: SEGMENTS },
					reaction: { type: 'string', enum: ['supportive', 'hostile', 'skeptical', 'indifferent'] },
					approvalDelta: { type: 'number' },
					keyConcern: { type: 'string' },
					protestProbability: { type: 'number' },
					socialSentiment: {
						type: 'string',
						enum: ['trending_positive', 'trending_negative', 'neutral', 'viral_backlash']
					}
				}
			}
		},
		summary: {
			type: 'object',
			required: ['netApprovalDelta', 'mostAffectedSegment', 'implementationViability', 'unintendedConsequences', 'mediaNarrative', 'twitterTrend'],
			properties: {
				netApprovalDelta: { type: 'number' },
				mostAffectedSegment: { type: 'string' },
				implementationViability: { type: 'string', enum: ['high', 'medium', 'low'] },
				unintendedConsequences: { type: 'array', items: { type: 'string' } },
				mediaNarrative: { type: 'string' },
				twitterTrend: { type: 'string' }
			}
		}
	}
};

/** Grounded prompt: policy + player context + insecurity + rulebook provisions. */
export function buildPrompt(policy, ctx, provisions) {
	const law = (provisions ?? [])
		.slice(0, 6)
		.map((p) => `- [${p.id}] ${p.title}: ${String(p.body ?? '').slice(0, 200)}`)
		.join('\n');
	return `POLICY: "${policy.title}" | sector: ${policy.sector} | scope: ${policy.scope ?? 'national'}
DESCRIPTION: ${String(policy.description ?? '').slice(0, 600)}
PRESIDENT: party ${ctx.party}, from ${ctx.origin}, ${ctx.religion ?? 'undisclosed'} faith.
NATIONAL INSECURITY INDEX: ${ctx.insecurity}/100 — security-priority citizens judge implementation viability on the ground, not announcements.
RELEVANT LAW:\n${law || '- none on file'}
Return JSON exactly matching:
{"segments":[{"segmentId":"Market women"|"Youth organisers"|"Traditional leaders","reaction":"supportive"|"hostile"|"skeptical"|"indifferent","approvalDelta":-40..40,"keyConcern":"<=20 words, Nigerian voice","protestProbability":0..100,"socialSentiment":"trending_positive"|"trending_negative"|"neutral"|"viral_backlash"}] (all 3 segments),
"summary":{"netApprovalDelta":number,"mostAffectedSegment":string,"implementationViability":"high"|"medium"|"low","unintendedConsequences":[string],"mediaNarrative":"one fictional-outlet headline","twitterTrend":"#OneHashtag"}}`;
}

/** PolicySimResponse (§8) → null when the shape is wrong. */
export function validateResponse(raw) {
	let data = raw;
	if (typeof raw === 'string') {
		const match = raw.match(/\{[\s\S]*\}/); // tolerate stray prose around the JSON
		if (!match) return null;
		try {
			data = JSON.parse(match[0]);
		} catch {
			return null;
		}
	}
	if (!Array.isArray(data?.segments) || data.segments.length < 3) return null;
	const s = data.summary;
	if (!s || typeof s.netApprovalDelta !== 'number' || typeof s.mediaNarrative !== 'string') return null;
	for (const seg of data.segments) {
		if (typeof seg?.segmentId !== 'string' || typeof seg.approvalDelta !== 'number') return null;
		if (typeof seg.keyConcern !== 'string' || typeof seg.protestProbability !== 'number') return null;
		seg.approvalDelta = Math.max(-40, Math.min(40, Math.round(seg.approvalDelta)));
		seg.protestProbability = Math.max(0, Math.min(100, Math.round(seg.protestProbability)));
	}
	return data;
}

/** PRD PolicySimResponse → the shape the game UI already renders. */
export function toUiResponse(sim) {
	return {
		headline: sim.summary.mediaNarrative,
		netApproval: Math.max(-20, Math.min(20, Math.round(sim.summary.netApprovalDelta))),
		trendingHashtag: sim.summary.twitterTrend || '#NaijaDelivery',
		unintendedConsequence: sim.summary.unintendedConsequences?.[0] ?? '',
		segments: sim.segments.slice(0, 3).map((seg, i) => ({
			name: SEGMENTS.includes(seg.segmentId) ? seg.segmentId : SEGMENTS[i],
			approvalDelta: seg.approvalDelta,
			concern: seg.keyConcern,
			protestProbability: seg.protestProbability,
			sentiment: seg.reaction ?? seg.socialSentiment ?? 'watchful'
		}))
	};
}

async function cacheKey(policy, ctx, provisions) {
	const material = JSON.stringify({
		t: policy.title,
		s: policy.sector,
		sc: policy.scope,
		d: policy.description,
		p: (provisions ?? []).map((x) => x.id),
		v: SEGMENT_SET_VERSION
	});
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
	return 'policy:' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cache → provider → validate. Returns UI-shaped response, or null → fallback. */
export async function runPolicySim(platform, policy, ctx, provisions) {
	const env = platform?.env;
	if (!env) return null;

	const key = await cacheKey(policy, ctx, provisions);
	const cached = await env.AI_CACHE?.get(key);
	if (cached) return JSON.parse(cached); // zero neurons on a hit (§5.4)

	const prompt = buildPrompt(policy, ctx, provisions);
	let raw;
	try {
		if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-api-key': env.ANTHROPIC_API_KEY,
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-haiku-4-5-20251001',
					max_tokens: 1024,
					system: SYSTEM,
					messages: [{ role: 'user', content: prompt }]
				})
			});
			raw = (await res.json())?.content?.[0]?.text;
		} else if (env.AI) {
			// llama-3.1-8b (PRD default) deprecated 2026-05; glm-4.7-flash 504s. 3.2-3b is fast + cheap.
			const out = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
				messages: [
					{ role: 'system', content: SYSTEM },
					{ role: 'user', content: prompt }
				],
				max_tokens: 1024,
				response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA }
			});
			raw = out?.response ?? out;
		} else {
			return null;
		}
	} catch (err) {
		console.warn('policy-sim: provider error, using fallback —', err?.message ?? err);
		return null;
	}

	const sim = validateResponse(raw);
	if (!sim) {
		console.warn('policy-sim: invalid model output, using fallback —', String(raw).slice(0, 2000));
		return null;
	}

	const ui = toUiResponse(sim);
	await env.AI_CACHE?.put(key, JSON.stringify(ui), { expirationTtl: 60 * 60 * 24 * 30 });
	return ui;
}
