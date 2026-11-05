import ReactDevMode from '../../audits/react-dev-mode.js';
import assert from 'assert/strict';

describe('React is not in development mode audit', () => {
    it('fails when React is in dev mode', () => {
        const artifacts = {
            ReactDevModeGatherer: true,
        };
        const auditResult = ReactDevMode.audit(artifacts);
        assert.equal(auditResult.score, 0);
    });

    it('passes when React is in production mode', () => {
        const artifacts = {
            ReactDevModeGatherer: false,
        };
        const auditResult = ReactDevMode.audit(artifacts);
        assert.equal(auditResult.score, 1);
    });
});