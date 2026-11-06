// @ts-nocheck
// One shared password via the ADMIN_PASSWORD secret (`wrangler secret put ADMIN_PASSWORD`; locally in
// .dev.vars). No secret means no admin: there is no built-in fallback, because this repo is public.

/** @param {any} platform @param {string} password */
export function isAdmin(platform, password) {
	const expected = platform?.env?.ADMIN_PASSWORD;
	if (typeof expected !== 'string' || !expected || typeof password !== 'string') return false;
	// Compare every character so the time taken does not reveal how much of the guess was right.
	let diff = expected.length ^ password.length;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (password.charCodeAt(i) || 0);
	return diff === 0;
}
