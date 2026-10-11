import assert from 'node:assert/strict';
import { clerkConfigForHost,clerkIssuerMatches } from '../lib/clerk-server-config.ts';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='pk_live_legacy-test';
process.env.NEXT_PUBLIC_GAPLINE_CUSTOM_CLERK_PUBLISHABLE_KEY='pk_live_custom-test';
process.env.GAPLINE_CUSTOM_CLERK_SECRET_KEY='test-only-secret';
const custom=clerkConfigForHost('trygapline.xyz');
assert.equal(custom.publishableKey,'pk_live_custom-test');
assert.equal(custom.proxyUrl,undefined);
assert.deepEqual(custom.authorizedParties,['https://trygapline.xyz']);
assert.equal(clerkConfigForHost('TRYGAPLINE.XYZ:443').publishableKey,'pk_live_custom-test');
for(const host of ['gapline-mu.vercel.app','localhost:3000','trygapline.xyz.evil.test',null]) {
  const config=clerkConfigForHost(host);
  assert.equal(config.publishableKey,'pk_live_legacy-test');
  assert.equal(config.proxyUrl,'https://gapline-mu.vercel.app/__clerk');
  assert.equal(config.secretKey,undefined);
}
delete process.env.GAPLINE_CUSTOM_CLERK_SECRET_KEY;
assert.throws(()=>clerkConfigForHost('trygapline.xyz'),/not configured/);
process.env.GAPLINE_CUSTOM_CLERK_SECRET_KEY='test-only-secret';
process.env.NEXT_PUBLIC_GAPLINE_CUSTOM_CLERK_PUBLISHABLE_KEY='pk_live_'+Buffer.from('clerk.trygapline.xyz$').toString('base64');
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='pk_live_'+Buffer.from('clerk.gapline-mu.vercel.app$').toString('base64');
assert.equal(clerkIssuerMatches('trygapline.xyz','https://clerk.trygapline.xyz'),true);
assert.equal(clerkIssuerMatches('gapline-mu.vercel.app','https://clerk.trygapline.xyz'),false);
assert.equal(clerkIssuerMatches('trygapline.xyz','https://clerk.gapline-mu.vercel.app'),false);
assert.equal(clerkIssuerMatches('trygapline.xyz',undefined),false);
console.log('Per-host credential isolation and fail-closed checks passed');
