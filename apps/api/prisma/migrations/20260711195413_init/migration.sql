-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loc" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "riskScore" TEXT NOT NULL,
    "riskSrc" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "tierTrend" TEXT NOT NULL,
    "tierFrom" TEXT NOT NULL,
    "aws" TEXT NOT NULL,
    "higg" INTEGER NOT NULL,
    "higgAvg" INTEGER NOT NULL,
    "reuse" INTEGER NOT NULL,
    "pwiAvail" TEXT NOT NULL,
    "pwiConf" TEXT NOT NULL,
    "pwiQuality" TEXT NOT NULL,
    "pwiQConf" TEXT NOT NULL,
    "pwiAccess" TEXT NOT NULL,
    "withdrawal" TEXT NOT NULL,
    "discharge" TEXT NOT NULL,
    "basin" TEXT NOT NULL,
    "auditDate" TEXT NOT NULL,
    "auditor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAlert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meta" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "SupplierAlert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SupplierAlert" ADD CONSTRAINT "SupplierAlert_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
