import { computePlantHealth, deriveVerificationSource, PlantHealthInput } from './plant-health.util';

const ASOF = new Date('2026-07-12T00:00:00Z');

function daysAgo(n: number): Date {
  return new Date(ASOF.getTime() - n * 24 * 60 * 60 * 1000);
}

/** A deliberately unremarkable baseline — individual tests override only what they're exercising. */
const BASE: PlantHealthInput = {
  tier: 'Level 2',
  tierTrend: 'flat',
  aws: 'Core',
  higg: 60,
  higgPeerAvg: 60,
  verificationSource: '3rd-party',
  alerts: [],
};

describe('computePlantHealth', () => {
  it('scores a clean, 3rd-party-verified, Platinum/Level 3 supplier as Healthy in the 90s', () => {
    const result = computePlantHealth(
      { ...BASE, tier: 'Level 3', tierTrend: 'up', aws: 'Platinum', higg: 90, higgPeerAvg: 70 },
      ASOF,
    );
    expect(result.band).toBe('Healthy');
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.hardFailReason).toBeNull();
    expect(result.trustCapApplied).toBe(false);
  });

  it('caps a self-reported supplier that would otherwise score above 70 at exactly 70', () => {
    const uncapped = computePlantHealth(
      { ...BASE, tier: 'Level 3', tierTrend: 'up', aws: 'Platinum', higg: 90, higgPeerAvg: 70, verificationSource: '3rd-party' },
      ASOF,
    );
    expect(uncapped.score).toBeGreaterThan(70); // sanity check on the fixture itself

    const capped = computePlantHealth(
      { ...BASE, tier: 'Level 3', tierTrend: 'up', aws: 'Platinum', higg: 90, higgPeerAvg: 70, verificationSource: 'Self-reported' },
      ASOF,
    );
    expect(capped.score).toBe(70);
    expect(capped.trustCapApplied).toBe(true);
  });

  it('does not mark the trust cap as applied when a self-reported score is already under 70', () => {
    const weak: PlantHealthInput = {
      ...BASE,
      tier: 'Level 1',
      tierTrend: 'down',
      aws: 'Uncertified',
      higg: 50,
      higgPeerAvg: 50,
      verificationSource: 'Self-reported',
    };
    const result = computePlantHealth(weak, ASOF);
    expect(result.score).toBeLessThan(70);
    expect(result.trustCapApplied).toBe(false);
  });

  it('forces Critical band on an open Critical alert at 14 days, even though the weighted score alone would land in Watch', () => {
    const input: PlantHealthInput = {
      ...BASE,
      alerts: [{ severity: 'Critical', type: 'chemical_exceedance', openedAt: daysAgo(14) }],
    };
    const result = computePlantHealth(input, ASOF);

    // Confirm the fixture actually would have landed in Watch on score alone —
    // otherwise this test wouldn't be proving the override does anything.
    const withoutTheAlert = computePlantHealth({ ...input, alerts: [] }, ASOF);
    expect(withoutTheAlert.band).toBe('Watch');

    expect(result.band).toBe('Critical');
    expect(result.hardFailReason).not.toBeNull();
    expect(result.hardFailReason).toMatch(/14 days/);
  });

  it('does not hard-fail a Critical alert that is 10 days old or younger', () => {
    const result = computePlantHealth(
      { ...BASE, alerts: [{ severity: 'Critical', type: 'chemical_exceedance', openedAt: daysAgo(10) }] },
      ASOF,
    );
    expect(result.hardFailReason).toBeNull();
  });

  it('forces Critical band on a data_anomaly alert regardless of otherwise-excellent inputs', () => {
    const result = computePlantHealth(
      {
        tier: 'Level 3',
        tierTrend: 'up',
        aws: 'Platinum',
        higg: 90,
        higgPeerAvg: 70,
        verificationSource: '3rd-party',
        alerts: [{ severity: 'Minor', type: 'data_anomaly', openedAt: daysAgo(0) }],
      },
      ASOF,
    );
    expect(result.score).toBeGreaterThanOrEqual(90); // the raw score is still excellent...
    expect(result.band).toBe('Critical'); // ...but the band is overridden
    expect(result.hardFailReason).toBe('Data anomaly flagged in an open alert');
  });

  it('forces Critical band on an enforcement_action alert regardless of otherwise-excellent inputs', () => {
    const result = computePlantHealth(
      {
        tier: 'Level 3',
        tierTrend: 'up',
        aws: 'Platinum',
        higg: 90,
        higgPeerAvg: 70,
        verificationSource: '3rd-party',
        alerts: [{ severity: 'Minor', type: 'enforcement_action', openedAt: daysAgo(0) }],
      },
      ASOF,
    );
    expect(result.band).toBe('Critical');
    expect(result.hardFailReason).toBe('An enforcement action alert is open');
  });

  describe('alert age boundary behavior', () => {
    // Isolate the ageFactor bucket via alertBurden: a single Major alert
    // (severityWeight 25) means alertBurden = 100 - 25 * ageFactor.
    function alertBurdenAt(ageDays: number): number {
      const result = computePlantHealth(
        { ...BASE, alerts: [{ severity: 'Major', type: 'other', openedAt: daysAgo(ageDays) }] },
        ASOF,
      );
      return result.breakdown.alertBurden.value;
    }

    it('uses the < 7 day factor (1.0) at 6 days', () => {
      expect(alertBurdenAt(6)).toBeCloseTo(100 - 25 * 1.0, 5);
    });

    it('uses the 7-30 day factor (1.3), not the < 7 day factor, at exactly 7 days', () => {
      expect(alertBurdenAt(7)).toBeCloseTo(100 - 25 * 1.3, 5);
    });

    it('uses the 7-30 day factor (1.3), not the > 30 day factor, at exactly 30 days', () => {
      expect(alertBurdenAt(30)).toBeCloseTo(100 - 25 * 1.3, 5);
    });

    it('uses the > 30 day factor (1.6) at 31 days', () => {
      expect(alertBurdenAt(31)).toBeCloseTo(100 - 25 * 1.6, 5);
    });
  });

  it('scores alertBurden at 100 when there are no open alerts', () => {
    const result = computePlantHealth({ ...BASE, alerts: [] }, ASOF);
    expect(result.breakdown.alertBurden.value).toBe(100);
  });
});

describe('deriveVerificationSource', () => {
  it('maps the literal "Self-reported" auditor value to Self-reported', () => {
    expect(deriveVerificationSource('Self-reported')).toBe('Self-reported');
  });

  it('maps any other auditor string to 3rd-party', () => {
    expect(deriveVerificationSource('Bureau Veritas (3rd-party)')).toBe('3rd-party');
    expect(deriveVerificationSource('SGS (3rd-party)')).toBe('3rd-party');
  });
});

/**
 * Cross-check against the seven suppliers seeded in prisma/seed.ts (fixed
 * reference date 2026-07-12, matching SEED_TODAY there). These pin the
 * formula against real data rather than synthetic fixtures — if the seed
 * data or formula drifts, this is the test that should catch it.
 */
describe('computePlantHealth — seeded supplier fixtures', () => {
  const cases: Array<{ name: string; input: PlantHealthInput; expectedBand: string; expectedScoreApprox: number }> = [
    {
      name: 'Pearl River Finishing',
      input: {
        tier: 'Level 3', tierTrend: 'flat', aws: 'Platinum', higg: 88, higgPeerAvg: 66,
        verificationSource: deriveVerificationSource('Bureau Veritas (3rd-party)'),
        alerts: [],
      },
      expectedBand: 'Healthy',
      expectedScoreApprox: 93,
    },
    {
      name: 'Song Ha Garment Co.',
      input: {
        tier: 'Level 3', tierTrend: 'up', aws: 'Gold', higg: 81, higgPeerAvg: 66,
        verificationSource: deriveVerificationSource('SGS (3rd-party)'),
        alerts: [],
      },
      expectedBand: 'Healthy',
      expectedScoreApprox: 93,
    },
    {
      name: 'Chao Phraya Mills',
      input: {
        tier: 'Level 2', tierTrend: 'up', aws: 'Core', higg: 59, higgPeerAvg: 60,
        verificationSource: deriveVerificationSource('SGS (3rd-party)'),
        alerts: [],
      },
      expectedBand: 'Watch',
      expectedScoreApprox: 74,
    },
    {
      name: 'Marmara Weaving',
      input: {
        tier: 'Level 2', tierTrend: 'flat', aws: 'Core', higg: 64, higgPeerAvg: 60,
        verificationSource: deriveVerificationSource('Intertek (3rd-party)'),
        alerts: [{ severity: 'Minor', type: 'permit_expiry', openedAt: daysAgo(0) }],
      },
      expectedBand: 'Watch',
      expectedScoreApprox: 69,
    },
    {
      name: 'Anchor Dye Works',
      input: {
        tier: 'Level 2', tierTrend: 'down', aws: 'Core', higg: 68, higgPeerAvg: 61,
        verificationSource: deriveVerificationSource('Bureau Veritas (3rd-party)'),
        alerts: [{ severity: 'Major', type: 'chemical_exceedance', openedAt: daysAgo(3) }],
      },
      expectedBand: 'Watch',
      expectedScoreApprox: 61,
    },
    {
      name: 'Delta River Textiles',
      input: {
        tier: 'Level 1', tierTrend: 'down', aws: 'Uncertified', higg: 52, higgPeerAvg: 58,
        verificationSource: deriveVerificationSource('Self-reported'),
        alerts: [
          { severity: 'Major', type: 'chemical_exceedance', openedAt: daysAgo(8) },
          { severity: 'Minor', type: 'permit_expiry', openedAt: daysAgo(0) },
        ],
      },
      expectedBand: 'Critical',
      expectedScoreApprox: 35,
    },
    {
      name: 'Ganga Blue Processing',
      input: {
        tier: 'Level 1', tierTrend: 'flat', aws: 'Uncertified', higg: 44, higgPeerAvg: 61,
        verificationSource: deriveVerificationSource('Self-reported'),
        alerts: [
          { severity: 'Critical', type: 'chemical_exceedance', openedAt: daysAgo(11) },
          { severity: 'Major', type: 'data_anomaly', openedAt: daysAgo(11) },
        ],
      },
      expectedBand: 'Critical',
      expectedScoreApprox: 24,
    },
  ];

  it.each(cases)('$name -> $expectedBand (score approx $expectedScoreApprox)', ({ input, expectedBand, expectedScoreApprox }) => {
    const result = computePlantHealth(input, ASOF);
    expect(result.band).toBe(expectedBand);
    // "Approximate" per the spec — allow a working tolerance rather than pinning exact decimals,
    // since exact alert severity/age wasn't specified for the pre-existing mock alert text and had
    // to be inferred; band correctness (asserted above) is the load-bearing check.
    expect(Math.abs(result.score - expectedScoreApprox)).toBeLessThanOrEqual(6);
  });

  it('flags Ganga Blue Processing as hard-fail eligible via its Cr(VI) alert past 10 days', () => {
    const gangaBlue = cases.find((c) => c.name === 'Ganga Blue Processing')!;
    const result = computePlantHealth(gangaBlue.input, ASOF);
    expect(result.hardFailReason).not.toBeNull();
  });
});
