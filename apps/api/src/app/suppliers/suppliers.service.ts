import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UpdateOwnSupplierDto } from './dto/update-own-supplier.dto';
import { CreateAlertDto } from './dto/create-alert.dto';
import { computeWaterQuality, formatLpd } from './water-quality.util';
import {
  computePlantHealth,
  deriveVerificationSource,
  AlertSeverity,
  MrslTier,
  TierTrend,
  AwsStatus,
} from './plant-health.util';
import { computePwiScore } from './pwi.util';

const SAFE_INCLUDE = {
  alerts: { select: { id: true, title: true, meta: true, severity: true, type: true, createdAt: true } },
} as const;

type SupplierWithAlerts = NonNullable<Awaited<ReturnType<SuppliersService['findRawById']>>>;

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Adds display-formatted / derived fields on top of the raw DB record. */
  private present<
    T extends {
      withdrawalLpd: number;
      dischargeLpd: number;
      reuseVolumeLpd: number;
      tier: string;
      tierTrend: string;
      aws: string;
      higg: number;
      higgAvg: number;
      auditor: string;
      pwiQuality: string;
      alerts: { severity: string; type: string; createdAt: Date }[];
    },
  >(supplier: T) {
    const asOf = new Date();
    return {
      ...supplier,
      withdrawal: formatLpd(supplier.withdrawalLpd),
      discharge: formatLpd(supplier.dischargeLpd),
      reuse:
        supplier.withdrawalLpd > 0
          ? Math.round((supplier.reuseVolumeLpd / supplier.withdrawalLpd) * 100)
          : 0,
      health: computePlantHealth(
        {
          tier: supplier.tier as MrslTier,
          tierTrend: supplier.tierTrend as TierTrend,
          aws: supplier.aws as AwsStatus,
          higg: supplier.higg,
          higgPeerAvg: supplier.higgAvg,
          verificationSource: deriveVerificationSource(supplier.auditor),
          alerts: supplier.alerts.map((a) => ({
            severity: a.severity as AlertSeverity,
            type: a.type,
            openedAt: a.createdAt,
          })),
        },
        asOf,
      ),
      pwi: computePwiScore(
        {
          tier: supplier.tier as MrslTier,
          aws: supplier.aws as AwsStatus,
          pwiQuality: supplier.pwiQuality,
          alerts: supplier.alerts.map((a) => ({
            severity: a.severity as AlertSeverity,
            type: a.type,
            openedAt: a.createdAt,
          })),
        },
        asOf,
      ),
    };
  }

  private findRawById(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: SAFE_INCLUDE,
      omit: { passwordHash: true },
    });
  }

  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({
      include: SAFE_INCLUDE,
      omit: { passwordHash: true },
      orderBy: { name: 'asc' },
    });
    return suppliers.map((s) => this.present(s));
  }

  async findOne(id: string) {
    const supplier = await this.findRawById(id);
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.present(supplier);
  }

  /** Admin: update any supplier's record. */
  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await this.findRawById(id);
    if (!existing) throw new NotFoundException('Supplier not found');
    return this.present(await this.applyUpdate(existing, dto));
  }

  /** Supplier: update their own record only. */
  async updateOwn(supplierId: string, dto: UpdateOwnSupplierDto) {
    const existing = await this.findRawById(supplierId);
    if (!existing) throw new NotFoundException('Supplier not found');
    return this.present(await this.applyUpdate(existing, dto));
  }

  private async applyUpdate(existing: SupplierWithAlerts, dto: UpdateSupplierDto | UpdateOwnSupplierDto) {
    const merged = { ...existing, ...dto };
    const { pwiAvail, pwiConf } = computeWaterQuality({
      withdrawalLpd: merged.withdrawalLpd,
      dischargeLpd: merged.dischargeLpd,
      reuseVolumeLpd: merged.reuseVolumeLpd,
      riskScore: merged.riskScore,
      auditor: merged.auditor,
    });

    return this.prisma.supplier.update({
      where: { id: existing.id },
      data: { ...dto, pwiAvail, pwiConf },
      include: SAFE_INCLUDE,
      omit: { passwordHash: true },
    });
  }

  async addAlert(supplierId: string, dto: CreateAlertDto) {
    await this.prisma.supplierAlert.create({
      data: { ...dto, supplierId },
    });
    return this.findOne(supplierId);
  }

  async removeAlert(supplierId: string, alertId: string) {
    const alert = await this.prisma.supplierAlert.findUnique({ where: { id: alertId } });
    if (!alert || alert.supplierId !== supplierId) {
      throw new ForbiddenException('Alert does not belong to this supplier');
    }
    await this.prisma.supplierAlert.delete({ where: { id: alertId } });
    return this.findOne(supplierId);
  }
}
