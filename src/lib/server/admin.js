// @ts-nocheck
// ponytail: one shared password via a Cloudflare secret; falls back to the legacy dev
// password when unset so local admin works out of the box. Set ADMIN_PASSWORD
// (`wrangler secret put ADMIN_PASSWORD`) for real protection.

/** @param {any} platform @param {string} password */
export function isAdmin(platform, password) {
	const expected = platform?.env?.ADMIN_PASSWORD ?? 'emeka-local-admin';
	return typeof password === 'string' && password.length > 0 && password === expected;
}
