// @ts-nocheck
import { defaultRulebook, seededState } from './rulebook.js';

export { defaultRulebook, seededState };

/**
 * @typedef {ReturnType<typeof createRun> extends { run: infer R } ? NonNullable<R> : never} GameRun
 * @typedef {{ id: string, name: string, registeredVoters: number, baseTurnout: number, loyaltyIndex: number, insecurityIndex: number, threatType: string }} StateUnit
 */

export const parties = ['APC', 'PDP', 'LP', 'NNPP', 'SDP'];

// Spend levels: the player decides how much muscle to put behind an action.
export const spendLevels = {
	small: { label: 'Small', multiplier: 0.5 },
	medium: { label: 'Medium', multiplier: 1 },
	large: { label: 'Large', multiplier: 2 }
};

// Character builder — background shapes your starting hand. Career sets your
// political capital, wealth sets your war chest, scandal sets your baggage.
export const careers = {
	outsider: { label: 'Outsider / Mogul', blurb: 'Famous and self-funded, but no political machine.', connections: -6, popularity: 10, integrity: -2, trust: -3 },
	business: { label: 'Business / Corporate', blurb: 'Board-room contacts and deep pockets.', connections: 3, popularity: 2, integrity: -1 },
	law_prosecutor: { label: 'Law / Prosecutor', blurb: 'Clean hands and courtroom discipline.', connections: 2, popularity: -2, integrity: 6, trust: 4 },
	community_organizer: { label: 'Community Organiser', blurb: 'Broke, but trusted at the grassroots.', connections: -4, popularity: 2, integrity: 4, trust: 10 },
	governor: { label: 'Governor', blurb: 'A built machine and real patronage.', connections: 12, popularity: 4 },
	senator: { label: 'Senator / Congress', blurb: 'National contacts and legislative reach.', connections: 9, popularity: 2 },
	military_intel: { label: 'Military / Intelligence', blurb: 'Security credibility and quiet discipline.', connections: 5, popularity: 2, integrity: 2, standing: 6 }
};

export const wealths = {
	working_class: { label: 'Working-class origins', blurb: 'Small war chest, but people relate to you.', nairaMult: 0.4, trust: 5, popularity: 2 },
	middle: { label: 'Middle class', blurb: 'A steady, ordinary start.', nairaMult: 1 },
	self_made: { label: 'Self-made millionaire', blurb: 'Built it yourself — and it shows.', nairaMult: 2, popularity: 4 },
	old_money: { label: 'Old money / inherited', blurb: 'Plenty cash, but "born-rich" whispers.', nairaMult: 2.5, trust: -3 },
	billionaire: { label: 'Billionaire', blurb: 'You can outspend anyone — trust is the catch.', nairaMult: 4, trust: -5 }
};

export const scandals = {
	clean: { label: 'Clean record', blurb: 'Nothing on you — for now.', integrity: 5 },
	business_controversy: { label: 'Business controversy', blurb: 'Old deals people still ask about.', efccRisk: 8, integrity: -3 },
	personal_scandal: { label: 'Personal scandal', blurb: 'The gist follows you around.', popularity: -6 },
	corruption_allegations: { label: 'Corruption allegations', blurb: 'EFCC already has a file with your name.', efccRisk: 20, integrity: -12, popularity: -2 },
	no_record: { label: 'No political record', blurb: 'A blank slate nobody knows yet.', popularity: -4 }
};

export const religions = ['Christian', 'Muslim', 'Traditional', 'None'];

/** Starting stats after applying the character build. Shared by createRun and the UI preview. */
/** @param {{ career?: string, wealth?: string, scandal?: string }} [build] */
export function startingProfile({ career = 'outsider', wealth = 'middle', scandal = 'clean' } = {}) {
	const p = defaultRulebook.params;
	const c = careers[career] || careers.outsider;
	const w = wealths[wealth] || wealths.middle;
	const s = scandals[scandal] || scandals.clean;
	return {
		naira: Math.round(p.startingNaira * w.nairaMult),
		popularity: clamp(p.startingPopularity + (c.popularity || 0) + (w.popularity || 0) + (s.popularity || 0)),
		connections: clamp(p.startingConnections + (c.connections || 0)),
		efccRisk: clamp(s.efccRisk || 0),
		integrity: clamp(82 + (c.integrity || 0) + (s.integrity || 0)),
		publicTrust: clamp(35 + (c.trust || 0) + (w.trust || 0)),
		internationalStanding: clamp(48 + (c.standing || 0))
	};
}

export const campaignActions = {
	rally: {
		label: 'Presidential rally',
		blurb: 'Big crowd, big noise. Lifts your name everywhere, builds real support where you hold it.',
		tone: 'clean',
		apCost: 2,
		nairaCost: 80_000_000,
		effect: { popularity: 4, genuineSupport: 5, manufacturedSupport: 0, integrity: 1 }
	},
	media_buy: {
		label: 'National media blitz',
		blurb: 'Radio, TV and social ads across the country. Popularity everywhere, but talk is cheap.',
		tone: 'clean',
		apCost: 1,
		nairaCost: 120_000_000,
		effect: { popularity: 5, genuineSupport: 2, manufacturedSupport: 1, integrity: 0 }
	},
	ground_game: {
		label: 'Ward-by-ward ground game',
		blurb: 'Agents, canvassers and town meetings in the target state. Slow, real support.',
		tone: 'clean',
		apCost: 2,
		nairaCost: 60_000_000,
		effect: { popularity: 3, genuineSupport: 7, manufacturedSupport: 0, integrity: 2 }
	},
	court_traditional_ruler: {
		label: 'Visit traditional rulers',
		blurb: 'Respect goes far. Opens doors and builds connections in the target state.',
		tone: 'clean',
		apCost: 1,
		nairaCost: 40_000_000,
		effect: { popularity: 2, connections: 4, genuineSupport: 2, manufacturedSupport: 0, integrity: 0 }
	},
	grassroots_fund: {
		label: 'Grassroots fundraiser',
		blurb: 'Small-small donations from ordinary people. Raises money AND real trust.',
		tone: 'clean',
		apCost: 2,
		nairaCost: -50_000_000,
		effect: { popularity: 1, genuineSupport: 4, manufacturedSupport: 0, integrity: 3, trust: 2 }
	},
	godfather_deal: {
		label: 'Godfather deal',
		blurb: 'Fast money, no receipts. The offer changes every week — and he will collect later.',
		tone: 'dirty',
		apCost: 1,
		nairaCost: 0, // replaced per-week by godfatherOffer()
		effect: { popularity: 4, connections: 12, genuineSupport: 0, manufacturedSupport: 8, integrity: -9, efccRisk: 7 },
		obligation: 'A patron expects contract access if you win.'
	},
	rest: {
		label: 'End the week',
		blurb: '',
		tone: 'neutral',
		apCost: 0,
		nairaCost: 0,
		effect: {}
	}
};

export const riggingActions = {
	none: { label: 'Run clean', tone: 'clean', nairaCost: 0, votesGained: 0, baseDetection: 0 },
	get_out_the_vote: {
		label: 'Get-out-the-vote drive (clean)',
		tone: 'clean',
		nairaCost: 250_000_000,
		votesGained: 350_000,
		baseDetection: 0
	},
	inec_bribe: {
		label: 'INEC bribe',
		tone: 'dirty',
		nairaCost: 300_000_000,
		votesGained: 400_000,
		baseDetection: 0.28
	},
	ec8_forgery: {
		label: 'EC8 forgery',
		tone: 'dirty',
		nairaCost: 500_000_000,
		votesGained: 750_000,
		baseDetection: 0.42
	},
	intimidation: {
		label: 'Intimidation',
		tone: 'dirty',
		nairaCost: 200_000_000,
		votesGained: 300_000,
		baseDetection: 0.34
	}
};

/** @param {number} value @param {number} [min] @param {number} [max] */
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
/** @param {number} value */
const round = (value) => Math.round(value * 100) / 100;

/** @param {string} input */
export function hashString(input) {
	let hash = 2166136261;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** @param {number} seed */
export function rng(seed) {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(1664525, state) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

/** Seeded weekly godfather offer — bigger and hungrier as election day nears. */
/** @param {GameRun} run */
export function godfatherOffer(run) {
	const roll = rng(run.seed + run.week * 7919)();
	const base = 200_000_000 + run.week * 40_000_000;
	return Math.round((base + roll * 400_000_000) / 10_000_000) * 10_000_000;
}

/** @param {{ playerName?: string, party: string, foundingMembers?: number, foundingSpread?: number }} input */
export function createRun({
	playerName,
	party,
	foundingMembers = 0,
	foundingSpread = 0,
	career = 'outsider',
	wealth = 'middle',
	scandal = 'clean',
	religion = 'None',
	origin = 'lagos'
}) {
	const params = defaultRulebook.params;
	const foundingParty = party === 'FOUND';
	const threshold = getPartyThreshold();

	if (foundingParty) {
		const unmet = [];
		if (foundingMembers < threshold.memberThreshold) {
			unmet.push(`Need ${threshold.memberThreshold.toLocaleString()} members`);
		}
		if (foundingSpread < threshold.spreadLgas) {
			unmet.push(`Need spread across ${threshold.spreadLgas} LGAs`);
		}
		if (unmet.length > 0) {
			return { ok: false, error: unmet.join(' and '), provisionId: threshold.provisionId };
		}
	}

	const seed = hashString(`${playerName || 'Reformer'}-${party}-${Date.now()}`);
	const support = Object.fromEntries(
		seededState.states.map((state) => [state.id, { genuine: 0, manufactured: 0, actions: [] }])
	);

	// ponytail: noble-loss carry-over (§5.11D) — clean loss banks a Trust/Standing bonus for the next run.
	let carryover = null;
	if (typeof localStorage !== 'undefined') {
		carryover = JSON.parse(localStorage.getItem('your-excellency-carryover') || 'null');
		localStorage.removeItem('your-excellency-carryover');
	}

	const profile = startingProfile({ career, wealth, scandal });

	return {
		ok: true,
		run: {
			id: crypto.randomUUID(),
			seed,
			playerName: playerName || 'The Reformer',
			party: foundingParty ? 'YEP' : party,
			career,
			religion,
			origin,
			state: seededState,
			phase: 'campaign',
			week: 1,
			ap: params.apPerTurn,
			naira: profile.naira,
			popularity: profile.popularity,
			connections: profile.connections,
			efccRisk: profile.efccRisk,
			inOffice: false,
			cleanChoices: 0,
			dirtyChoices: 0,
			support,
			obligations: [],
			election: null,
			policy: null,
			tribunal: null,
			legacy: {
				nationHealth: 44,
				publicTrust: clamp(profile.publicTrust + (carryover?.trust || 0)),
				integrity: profile.integrity,
				internationalStanding: clamp(profile.internationalStanding + (carryover?.standing || 0)),
				score: 0,
				ending: null
			},
			history: [
				...(carryover ? ['Your last clean run seeded a movement: Trust and Standing start higher.'] : []),
				'The presidential race don open. Six weeks, five actions each week — you no fit reach everywhere.'
			]
		}
	};
}

export function getPartyThreshold() {
	const provision = defaultRulebook.provisions.find((item) => item.id === 'EA-REG-001');
	return {
		memberThreshold: provision?.params.member_threshold ?? defaultRulebook.params.registrationMemberThreshold,
		spreadLgas: provision?.params.spread_lgas ?? defaultRulebook.params.registrationSpreadLgas,
		provisionId: provision?.id ?? 'EA-REG-001'
	};
}

/** @param {GameRun} run @param {keyof campaignActions} actionId @param {string} stateId @param {keyof spendLevels} [spendLevel] */
export function applyCampaignAction(run, actionId, stateId, spendLevel = 'medium') {
	const action = campaignActions[actionId];
	if (!action) return fail(run, 'Unknown action.');
	if (run.phase !== 'campaign') return fail(run, 'Campaign is over.');
	if (actionId === 'rest') return advanceCampaignTurn({ ...run, history: [...run.history, 'You ended the week early.'] });
	if (run.ap < action.apCost) return fail(run, 'No time left this week — rest to move to next week.');

	// Godfather money is his offer, not your budget choice.
	const multiplier = actionId === 'godfather_deal' ? 1 : (spendLevels[spendLevel] || spendLevels.medium).multiplier;
	const nairaCost = actionId === 'godfather_deal' ? -godfatherOffer(run) : Math.round(action.nairaCost * multiplier);
	if (run.naira < nairaCost && nairaCost > 0) return fail(run, 'Not enough naira for that size of spend.');

	const next = clone(run);
	const targetId = stateId || seededState.states[0].id;
	const target = next.support[targetId];
	const scaled = (value) => Math.round((value || 0) * multiplier);
	const effect = action.effect;

	next.ap -= action.apCost;
	next.naira -= nairaCost;
	next.popularity = clamp(next.popularity + scaled(effect.popularity));
	next.connections = clamp(next.connections + scaled(effect.connections));
	next.efccRisk = clamp(next.efccRisk + scaled(effect.efccRisk));
	next.legacy.integrity = clamp(next.legacy.integrity + scaled(effect.integrity));
	next.legacy.publicTrust = clamp(next.legacy.publicTrust + scaled(effect.trust));
	target.genuine = clamp(target.genuine + scaled(effect.genuineSupport), -50, 80);
	target.manufactured = clamp(target.manufactured + scaled(effect.manufacturedSupport), -50, 80);
	target.actions.push(actionId);

	if (action.tone === 'dirty') next.dirtyChoices += 1;
	if (action.tone === 'clean') next.cleanChoices += 1;
	if (action.obligation) next.obligations.push({ actionId, text: action.obligation, stateId: targetId });

	const costLine = nairaCost < 0 ? `+₦${Math.abs(nairaCost).toLocaleString()}` : `-₦${nairaCost.toLocaleString()}`;
	next.history.push(`${action.label} in ${findState(targetId).name} (${costLine}).`);
	return next.ap <= 0 ? advanceCampaignTurn(next) : { ok: true, run: next };
}

/** @param {GameRun} run */
function advanceCampaignTurn(run) {
	const next = clone(run);
	if (next.week >= defaultRulebook.params.campaignWeeks) {
		next.phase = 'election';
		next.ap = 0;
		next.history.push('Campaign don finish. Na election day.');
		return { ok: true, run: next };
	}
	next.week += 1;
	next.ap = defaultRulebook.params.apPerTurn;
	const donations = next.popularity * defaultRulebook.params.donationPerPopularity;
	next.naira += donations;
	next.history.push(`Week ${next.week} begins. Supporters donated ₦${donations.toLocaleString()}.`);
	return { ok: true, run: next };
}

/** @param {GameRun} run */
export function calculateVotes(run) {
	const k = defaultRulebook.params.turnoutInsecurityK;
	const states = run.state.states.map((state) => {
		const support = run.support[state.id] || { genuine: 0, manufactured: 0 };
		const effectiveTurnout = state.baseTurnout * (1 - (k * state.insecurityIndex) / 100);
		const affinity = regionAffinity(run, state);
		const supportModifier =
			1 + (support.genuine + support.manufactured * 0.45 + run.popularity * 0.12 + affinity) / 100;
		const playerVotes = Math.max(
			0,
			Math.round(state.registeredVoters * effectiveTurnout * state.loyaltyIndex * supportModifier)
		);
		const opponentVotes = Math.max(
			0,
			Math.round(state.registeredVoters * effectiveTurnout * (0.3 + state.insecurityIndex / 900))
		);
		return {
			...state,
			effectiveTurnout: round(effectiveTurnout),
			playerVotes,
			opponentVotes
		};
	});

	return {
		states,
		statesCarried: states.filter((state) => state.playerVotes > state.opponentVotes).length,
		playerLegitimate: states.reduce((total, state) => total + state.playerVotes, 0),
		opponentOfficial: states.reduce((total, state) => total + state.opponentVotes, 0)
	};
}

/** @param {keyof riggingActions} actionId @param {StateUnit} state */
export function calculateRiggingDetection(actionId, state) {
	const action = riggingActions[actionId];
	if (!action || action.tone !== 'dirty') return 0;
	const lowObserverAccess = state.insecurityIndex >= 55 ? 0.1 : 0;
	const inecCouldNotDeploy = state.insecurityIndex >= 65 ? 0.08 : 0;
	const insecurityShield = state.insecurityIndex / 260;
	return round(clamp(action.baseDetection - lowObserverAccess - inecCouldNotDeploy - insecurityShield, 0.05, 0.75));
}

/** @param {GameRun} run @param {keyof riggingActions} [actionId] @param {string} [stateId] */
export function resolveElection(run, actionId = 'none', stateId = 'kano') {
	if (run.phase !== 'election') return fail(run, 'Election day is not active.');
	const action = riggingActions[actionId] || riggingActions.none;
	if (run.naira < action.nairaCost) return fail(run, 'Not enough naira for that election-day move.');

	const votes = calculateVotes(run);
	const targetState = findState(stateId);
	const probability = calculateRiggingDetection(actionId, targetState);
	const roll = rng(run.seed + hashString(actionId + stateId))();
	const detected = action.tone === 'dirty' && roll < probability;
	const playerOfficial = votes.playerLegitimate + action.votesGained;
	const won = playerOfficial > votes.opponentOfficial;
	const next = clone(run);

	next.naira -= action.nairaCost;
	next.phase = won ? 'policy' : 'complete';
	next.inOffice = won;
	next.election = {
		actionId,
		targetState: targetState.name,
		detectionProbability: probability,
		detectionRoll: round(roll),
		detected,
		votesLegitimate: votes.playerLegitimate,
		votesRigged: action.votesGained,
		statesCarried: votes.statesCarried,
		playerOfficial,
		opponentOfficial: votes.opponentOfficial,
		won
	};

	if (action.tone === 'clean') next.cleanChoices += 1;
	if (action.tone === 'dirty') {
		next.dirtyChoices += 1;
		next.legacy.integrity = clamp(next.legacy.integrity - 14);
		next.efccRisk = clamp(next.efccRisk + (detected ? 20 : 8));
		if (detected) {
			next.legacy.internationalStanding = clamp(next.legacy.internationalStanding - 12);
		}
	}

	if (!won) {
		next.legacy.publicTrust = clamp(next.legacy.publicTrust + (action.tone === 'clean' ? 8 : -4));
		scoreLegacy(next);
	}

	next.history.push(won ? 'INEC declared you President-elect.' : 'You lost the election.');
	return { ok: true, run: next };
}

/** @param {GameRun} run @param {{ title?: string, sector?: string, scope?: string, description?: string }} policy @param {object|null} [aiResponse] validated AI reaction (§5.4); null → deterministic fallback */
export function simulatePolicy(run, policy, aiResponse = null) {
	if (run.phase !== 'policy') return fail(run, 'Policy simulation is only available after a win.');
	const next = clone(run);
	const sector = policy.sector || 'security';
	const description = policy.description || '';
	const securityPolicy = sector === 'security' || /security|police|bandit|kidnap/i.test(description);
	const delivery = securityPolicy ? 10 : 6;
	const implementationDrag = Math.round(averageInsecurity(run) / 11);
	const approvalDelta = delivery - implementationDrag;

	next.legacy.nationHealth = clamp(next.legacy.nationHealth + Math.max(2, approvalDelta));
	next.legacy.publicTrust = clamp(next.legacy.publicTrust + Math.max(1, approvalDelta - 1));
	next.legacy.internationalStanding = clamp(next.legacy.internationalStanding + (securityPolicy ? 4 : 2));
	next.policy = {
		...policy,
		// ponytail: legacy deltas stay deterministic; AI only narrates the reaction
		response: aiResponse ?? fallbackPolicyResponse(policy, run, approvalDelta)
	};
	next.phase = 'tribunal';
	next.history.push(`Policy announced: ${policy.title || 'Untitled reform'}.`);
	return { ok: true, run: next };
}

/** @param {{ title?: string, sector?: string }} policy @param {GameRun} run @param {number} [approvalDelta] */
export function fallbackPolicyResponse(policy, run, approvalDelta = 3) {
	const insecurity = Math.round(averageInsecurity(run));
	const sector = policy.sector || 'security';
	const hashtag = sector === 'security' ? '#SecureTheNation' : '#NaijaDelivery';
	return {
		headline: `${policy.title || 'The reform'} meets cautious hope`,
		netApproval: clamp(approvalDelta, -20, 20),
		trendingHashtag: hashtag,
		unintendedConsequence:
			insecurity > 55
				? 'Communities want proof that implementation can reach unsafe roads and polling units.'
				: 'Citizens are watching procurement and delivery timelines closely.',
		segments: [
			{
				name: 'Market women',
				approvalDelta: approvalDelta + 2,
				concern: 'Good talk, but let prices and safety improve before we clap.',
				protestProbability: clamp(18 - approvalDelta, 2, 45),
				sentiment: approvalDelta > 3 ? 'hopeful' : 'watchful'
			},
			{
				name: 'Youth organisers',
				approvalDelta,
				concern: 'They want jobs, transparency, and security that is not just press release.',
				protestProbability: clamp(24 - approvalDelta, 4, 55),
				sentiment: approvalDelta > 4 ? 'energised' : 'skeptical'
			},
			{
				name: 'Traditional leaders',
				approvalDelta: approvalDelta - 1,
				concern: 'Local consultation will decide whether this works in the villages.',
				protestProbability: clamp(14 - approvalDelta, 1, 35),
				sentiment: 'measured'
			}
		]
	};
}

/** @param {GameRun} run @param {'self_defence' | 'legal_spend' | 'technicality' | 'delay_motion' | 'judge_bribe'} [counterId] */
export function resolveTribunal(run, counterId = 'legal_spend') {
	if (run.phase !== 'tribunal') return fail(run, 'Tribunal is not active.');
	const next = clone(run);
	const detectedRigging = Boolean(run.election?.detected);
	const riggedDirty =
		run.election?.votesRigged > 0 && riggingActions[run.election.actionId]?.tone === 'dirty';
	// Clean winners face a weak petition; detected rigging hands the petitioner the case.
	const evidenceScore = 24 + (detectedRigging ? 44 : 0) + (riggedDirty ? 10 : 0);
	const counters = {
		// ponytail: free fallback so a broke player is never soft-locked at tribunal.
		self_defence: { label: 'Defend yourself in court', modifier: 8, dirty: false, cost: 0 },
		legal_spend: { label: 'Transparent legal defence', modifier: 24, dirty: false, cost: 180_000_000 },
		technicality: { label: 'Technicality motion', modifier: 15, dirty: false, cost: 90_000_000 },
		delay_motion: { label: 'Delay motion', modifier: 11, dirty: false, cost: 60_000_000 },
		judge_bribe: { label: 'Judge bribe', modifier: 33, dirty: true, cost: 400_000_000 }
	};
	const counter = counters[counterId] || counters.legal_spend;
	if (next.naira < counter.cost) return fail(run, 'Not enough naira for that tribunal counter.');

	const roll = Math.floor(rng(run.seed + hashString(counterId))() * 28);
	const defenceScore = counter.modifier + roll + Math.round(next.connections / 5);
	const outcome =
		defenceScore >= evidenceScore ? 'dismissed' : defenceScore + 12 >= evidenceScore ? 'rerun_ordered' : 'nullified';

	next.naira -= counter.cost;
	next.tribunal = { evidenceScore, defenceScore, counter: counter.label, outcome };
	if (counter.dirty) {
		next.dirtyChoices += 1;
		next.legacy.integrity = clamp(next.legacy.integrity - 10);
		next.efccRisk = clamp(next.efccRisk + 12);
	} else {
		next.cleanChoices += 1;
		next.legacy.integrity = clamp(next.legacy.integrity + 2);
	}
	if (outcome !== 'dismissed') {
		next.inOffice = false;
		next.legacy.publicTrust = clamp(next.legacy.publicTrust - 7);
	}
	next.phase = 'complete';
	scoreLegacy(next);
	next.history.push(`Tribunal outcome: ${outcome.replace('_', ' ')}.`);
	return { ok: true, run: next };
}

/** @param {GameRun} run */
export function scoreLegacy(run) {
	const weights = defaultRulebook.params.legacyWeights;
	const legacy = run.legacy;
	legacy.score = Math.round(
		legacy.nationHealth * weights.nationHealth +
			legacy.publicTrust * weights.publicTrust +
			legacy.integrity * weights.integrity +
			legacy.internationalStanding * weights.internationalStanding
	);

	if (run.efccRisk >= 70 && !run.inOffice) legacy.ending = 'The Cautionary Tale';
	else if (legacy.nationHealth >= 58 && legacy.integrity >= 70 && legacy.publicTrust >= 50) legacy.ending = 'The Statesman';
	else if (!run.inOffice && legacy.integrity >= 70) legacy.ending = 'The Reformer Who Fell';
	else if (run.naira >= 1_600_000_000 && legacy.nationHealth < 55 && legacy.publicTrust < 48) legacy.ending = 'The Big Man';
	else legacy.ending = 'The Unfinished Mandate';

	return legacy;
}

/** @param {GameRun} run */
export function saveRun(run) {
	localStorage.setItem('your-excellency-current', JSON.stringify(run));
	const history = JSON.parse(localStorage.getItem('your-excellency-history') || '[]');
	if (run.phase === 'complete' && !history.some((item) => item.id === run.id)) {
		history.unshift(run);
		localStorage.setItem('your-excellency-history', JSON.stringify(history.slice(0, 8)));
		if (!run.inOffice && run.dirtyChoices === 0) {
			localStorage.setItem('your-excellency-carryover', JSON.stringify({ trust: 6, standing: 4 }));
		}
	}
}

/** @returns {GameRun | null} */
export function loadRun() {
	const raw = localStorage.getItem('your-excellency-current');
	const run = raw ? JSON.parse(raw) : null;
	// Discard saves from the old LGA-based schema.
	return run?.state?.states ? run : null;
}

/** @returns {GameRun[]} */
export function loadHistory() {
	return JSON.parse(localStorage.getItem('your-excellency-history') || '[]');
}

// Rulebook provisions now live in D1 (source) + KV (cache), edited at /admin (§5.7, §6).
// The server load feeds them in; this swaps them into the shared rulebook so
// getPartyThreshold() and any provision-gated logic use the live values.
/** @param {typeof defaultRulebook.provisions | null | undefined} provisions */
export function setRulebookProvisions(provisions) {
	if (Array.isArray(provisions) && provisions.length) defaultRulebook.provisions = provisions;
	return defaultRulebook.provisions;
}

/** @param {GameRun} run */
function averageInsecurity(run) {
	return run.state.states.reduce((total, state) => total + state.insecurityIndex, 0) / run.state.states.length;
}

/** @param {string} id @returns {StateUnit} */
function findState(id) {
	return seededState.states.find((state) => state.id === id) || seededState.states[0];
}

/**
 * Home-state advantage and religious bloc lean, as a modest support nudge — a
 * lean, never a lock (§9A: this satirises patronage politics, it does not caricature groups).
 * @param {GameRun} run @param {StateUnit} state
 */
function regionAffinity(run, state) {
	let affinity = 0;
	if (state.id === run.origin) affinity += 8;
	const group = { Christian: 'christian', Muslim: 'muslim' }[run.religion];
	if (group) {
		if (state.religiousLean === group) affinity += 3;
		else if (state.religiousLean && state.religiousLean !== 'mixed') affinity -= 2;
	}
	return affinity;
}

/** @template T @param {T} value @returns {T} */
function clone(value) {
	// ponytail: JSON round-trip instead of structuredClone — Svelte 5 $state proxies
	// throw DataCloneError in structuredClone; run state is plain JSON anyway.
	return JSON.parse(JSON.stringify(value));
}

/** @param {GameRun} run @param {string} error */
function fail(run, error) {
	return { ok: false, error, run };
}
