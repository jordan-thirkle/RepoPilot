import assert from 'node:assert/strict';
import { isProtectedBranch, requireProtectedBranch } from './check-main-protection.mjs';

assert.equal(isProtectedBranch({ protected: true }), true);
assert.equal(isProtectedBranch({ protected: false }), false);
assert.equal(isProtectedBranch({}), false);
assert.equal(isProtectedBranch(null), false);
assert.equal(requireProtectedBranch({ protected: true }, 'main'), true);
assert.throws(() => requireProtectedBranch({ protected: false }, 'main'), /main is not reported as protected/);
assert.throws(() => requireProtectedBranch({}, 'main'), /main is not reported as protected/);
console.log('PASS: branch-protection gate fails closed for unprotected or unknown branch metadata.');
