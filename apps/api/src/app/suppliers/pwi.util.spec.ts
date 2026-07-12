import { computePwiScore } from './pwi.util';

const ASOF = new Date('2026-07-12T00:00:00Z');

describe('computePwiScore', () => {
  it('scores a top-tier, fully-certified, clean-alert supplier near 100', () => {
    const result = computePwiScore(
      { tier: 'Level 3', aws: 'Platinum', pwiQuality: '+0.51 idx', alerts: [] },
      ASOF,
    );
    // 0.4*100 + 0.2*100 + 0.25*100 + 0.15*100 = 100 (quality index clamps at 100)
    expect(result.score).toBe(100);
    expect(result.band).toBe('Strong');
  });

  it('applies the exact weighted formula from the spec', () => {
    const result = computePwiScore(
      { tier: 'Level 2', aws: 'Core', pwiQuality: '-0.08 idx', alerts: [] },
      ASOF,
    );
    const tierScore = 65; // Level 2
    const permitScore = 60; // Core, no permit_expiry alerts
    const waterQualityScore = 50 - 8; // 50 + (-0.08 * 100)
    const correctiveActionScore = 100; // no alerts
    const expected = 0.4 * tierScore + 0.2 * permitScore + 0.25 * waterQualityScore + 0.15 * correctiveActionScore;
    expect(result.score).toBeCloseTo(expected, 5);
    expect(result.breakdown.tierScore.value).toBe(tierScore);
    expect(result.breakdown.permitScore.value).toBe(permitScore);
    expect(result.breakdown.waterQualityScore.value).toBe(waterQualityScore);
    expect(result.breakdown.correctiveActionScore.value).toBe(correctiveActionScore);
  });

  it('penalizes the Permit Score per open permit_expiry alert, floored at 0', () => {
    const result = computePwiScore(
      {
        tier: 'Level 1',
        aws: 'Uncertified',
        pwiQuality: '0 idx',
        alerts: [
          { severity: 'Minor', type: 'permit_expiry', openedAt: ASOF },
          { severity: 'Minor', type: 'permit_expiry', openedAt: ASOF },
        ],
      },
      ASOF,
    );
    // base 20 - 2*15 = -10 -> clamped to 0
    expect(result.breakdown.permitScore.value).toBe(0);
  });

  it('reduces the Corrective Action Score for older, more severe open alerts', () => {
    const fresh = computePwiScore(
      { tier: 'Level 3', aws: 'Platinum', pwiQuality: '0 idx', alerts: [{ severity: 'Critical', type: 'other', openedAt: ASOF }] },
      ASOF,
    );
    const stale = computePwiScore(
      {
        tier: 'Level 3',
        aws: 'Platinum',
        pwiQuality: '0 idx',
        alerts: [{ severity: 'Critical', type: 'other', openedAt: new Date('2026-06-01T00:00:00Z') }],
      },
      ASOF,
    );
    expect(stale.breakdown.correctiveActionScore.value).toBeLessThan(fresh.breakdown.correctiveActionScore.value);
  });

  it('parses negative and unusual quality-index formatting without throwing', () => {
    const result = computePwiScore({ tier: 'Level 1', aws: 'Uncertified', pwiQuality: 'not a number', alerts: [] }, ASOF);
    expect(result.breakdown.waterQualityScore.value).toBe(50); // unparseable -> neutral 0 idx
  });
});
