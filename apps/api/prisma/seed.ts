import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { computeWaterQuality } from '../src/app/suppliers/water-quality.util';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

function slugEmail(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}@example.com`;
}

const suppliers = [
  {
    name: 'Anchor Dye Works', loc: 'Tirupur, India', region: 'India', risk: 'high', riskScore: '4.2', riskSrc: 'WRI Aqueduct',
    tier: 'Level 2', tierTrend: 'down', tierFrom: 'Level 3', aws: 'Core', higg: 68, higgAvg: 61,
    pwiQuality: '+0.31 idx', pwiQConf: '±10%', pwiAccess: 'Not assessed',
    alerts: [{ title: 'MRSL chemical flag — InCheck', meta: 'Restricted azo dye detected, lot #2291 · 3 days open' }],
    withdrawalLpd: 820_000, dischargeLpd: 540_000, reuseVolumeLpd: 336_200,
    basin: 'Noyyal sub-basin', auditDate: '12 Jun 2026', auditor: 'Bureau Veritas (3rd-party)',
  },
  {
    name: 'Delta River Textiles', loc: 'Dhaka, Bangladesh', region: 'Bangladesh', risk: 'high', riskScore: '4.5', riskSrc: 'WRI Aqueduct',
    tier: 'Level 1', tierTrend: 'down', tierFrom: 'Level 2', aws: 'Uncertified', higg: 52, higgAvg: 58,
    pwiQuality: '-0.08 idx', pwiQConf: '±22%', pwiAccess: 'Not assessed',
    alerts: [
      { title: 'Tier downgrade — ClearStream', meta: 'BOD exceeded limit by 30 mg/L · audit 04 Jul 2026' },
      { title: 'Certification expiring', meta: 'ZDHC InCheck valid until 02 Aug 2026 (29 days)' },
    ],
    withdrawalLpd: 1_150_000, dischargeLpd: 980_000, reuseVolumeLpd: 207_000,
    basin: 'Buriganga basin', auditDate: '04 Jul 2026', auditor: 'Self-reported',
  },
  {
    name: 'Song Ha Garment Co.', loc: 'Bien Hoa, Vietnam', region: 'Vietnam', risk: 'med', riskScore: '3.1', riskSrc: 'WRI Aqueduct',
    tier: 'Level 3', tierTrend: 'up', tierFrom: 'Level 2', aws: 'Gold', higg: 81, higgAvg: 66,
    pwiQuality: '+0.44 idx', pwiQConf: '±9%', pwiAccess: '+340 households',
    alerts: [],
    withdrawalLpd: 640_000, dischargeLpd: 390_000, reuseVolumeLpd: 364_800,
    basin: 'Dong Nai basin', auditDate: '29 Jun 2026', auditor: 'SGS (3rd-party)',
  },
  {
    name: 'Marmara Weaving', loc: 'Bursa, Turkey', region: 'Turkey', risk: 'med', riskScore: '2.8', riskSrc: 'WRI Aqueduct',
    tier: 'Level 2', tierTrend: 'flat', tierFrom: 'Level 2', aws: 'Core', higg: 64, higgAvg: 60,
    pwiQuality: '+0.12 idx', pwiQConf: '±14%', pwiAccess: 'Not assessed',
    alerts: [{ title: 'Permit renewal due', meta: 'Groundwater extraction license · 41 days remaining' }],
    withdrawalLpd: 410_000, dischargeLpd: 300_000, reuseVolumeLpd: 143_500,
    basin: 'Nilüfer basin', auditDate: '18 Jun 2026', auditor: 'Intertek (3rd-party)',
  },
  {
    name: 'Pearl River Finishing', loc: 'Foshan, China', region: 'China', risk: 'low', riskScore: '1.9', riskSrc: 'WRI Aqueduct',
    tier: 'Level 3', tierTrend: 'flat', tierFrom: 'Level 3', aws: 'Platinum', higg: 88, higgAvg: 66,
    pwiQuality: '+0.51 idx', pwiQConf: '±6%', pwiAccess: '+1,120 households',
    alerts: [],
    withdrawalLpd: 390_000, dischargeLpd: 180_000, reuseVolumeLpd: 280_800,
    basin: 'Pearl River delta', auditDate: '02 Jul 2026', auditor: 'Bureau Veritas (3rd-party)',
  },
  {
    name: 'Ganga Blue Processing', loc: 'Kanpur, India', region: 'India', risk: 'high', riskScore: '4.7', riskSrc: 'WRI Aqueduct',
    tier: 'Level 1', tierTrend: 'flat', tierFrom: 'Level 1', aws: 'Uncertified', higg: 44, higgAvg: 61,
    pwiQuality: '-0.19 idx', pwiQConf: '±30%', pwiAccess: 'Not assessed',
    alerts: [
      { title: 'MRSL chemical flag — InCheck', meta: 'Heavy metal (Cr VI) above threshold · 11 days open' },
      { title: 'Tier downgrade — ClearStream', meta: 'Discharge/withdrawal mismatch flagged as anomaly' },
    ],
    withdrawalLpd: 960_000, dischargeLpd: 890_000, reuseVolumeLpd: 115_200,
    basin: 'Ganga basin (Kanpur stretch)', auditDate: '30 Jun 2026', auditor: 'Self-reported',
  },
  {
    name: 'Chao Phraya Mills', loc: 'Samut Sakhon, Thailand', region: 'Vietnam', risk: 'med', riskScore: '3.4', riskSrc: 'WRI Aqueduct',
    tier: 'Level 2', tierTrend: 'up', tierFrom: 'Level 1', aws: 'Core', higg: 59, higgAvg: 60,
    pwiQuality: '+0.09 idx', pwiQConf: '±18%', pwiAccess: 'Not assessed',
    alerts: [],
    withdrawalLpd: 330_000, dischargeLpd: 250_000, reuseVolumeLpd: 95_700,
    basin: 'Chao Phraya basin', auditDate: '21 Jun 2026', auditor: 'SGS (3rd-party)',
  },
];

async function main() {
  await prisma.supplierAlert.deleteMany();
  await prisma.supplier.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const { alerts, ...supplier } of suppliers) {
    const { pwiAvail, pwiConf } = computeWaterQuality({
      withdrawalLpd: supplier.withdrawalLpd,
      dischargeLpd: supplier.dischargeLpd,
      reuseVolumeLpd: supplier.reuseVolumeLpd,
      riskScore: supplier.riskScore,
      auditor: supplier.auditor,
    });

    await prisma.supplier.create({
      data: {
        ...supplier,
        email: slugEmail(supplier.name),
        passwordHash,
        pwiAvail,
        pwiConf,
        alerts: { create: alerts },
      },
    });
  }

  console.log(`Seeded ${suppliers.length} suppliers.`);
  console.log(`Demo login password for all seeded suppliers: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
