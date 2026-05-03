-- CreateTable
CREATE TABLE "Region" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "kvaCapacity" DOUBLE PRECISION NOT NULL,
    "averageDieselConsumption" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "generatorGroupId" UUID NOT NULL,

    CONSTRAINT "Generator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratorGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "regionId" UUID NOT NULL,

    CONSTRAINT "GeneratorGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generatorId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "generatorGroupId" UUID NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingFloor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "floorNumber" INTEGER NOT NULL,
    "apartmentSide" TEXT NOT NULL,
    "buildingId" UUID NOT NULL,
    "customerId" UUID NOT NULL,

    CONSTRAINT "BuildingFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionStatus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "Status" TEXT NOT NULL,

    CONSTRAINT "ConsumptionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "specialMonthlyFee" DOUBLE PRECISION,
    "specialKwhPrice" DOUBLE PRECISION,
    "specialPeriod" INTEGER,
    "isCounter" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "consumptionStatusId" UUID NOT NULL,
    "consumptionTypeId" UUID NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyConsumption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "previousCounter" INTEGER NOT NULL,
    "currentCounter" INTEGER NOT NULL,
    "monthlyFee" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "kwhPrice" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "isCut" BOOLEAN NOT NULL,
    "consumptionStatusId" UUID NOT NULL,
    "closedBalance" BOOLEAN NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "monthlyPriceId" UUID NOT NULL,
    "consumptionTypeId" UUID NOT NULL,

    CONSTRAINT "MonthlyConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPrice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generatorGroupId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kwhPrice" DOUBLE PRECISION NOT NULL,
    "FixedPricePerAmp" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MonthlyPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionType" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT NOT NULL,
    "Ampere" INTEGER NOT NULL,
    "isCounter" BOOLEAN NOT NULL,
    "ThreePhase" BOOLEAN NOT NULL,
    "generatorGroupId" UUID NOT NULL,

    CONSTRAINT "ConsumptionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionPriceHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consumptionTypeId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ConsumptionPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingFloor_customerId_key" ON "BuildingFloor"("customerId");

-- AddForeignKey
ALTER TABLE "Generator" ADD CONSTRAINT "Generator_generatorGroupId_fkey" FOREIGN KEY ("generatorGroupId") REFERENCES "GeneratorGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratorGroup" ADD CONSTRAINT "GeneratorGroup_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_generatorId_fkey" FOREIGN KEY ("generatorId") REFERENCES "Generator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_generatorGroupId_fkey" FOREIGN KEY ("generatorGroupId") REFERENCES "GeneratorGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingFloor" ADD CONSTRAINT "BuildingFloor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingFloor" ADD CONSTRAINT "BuildingFloor_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_consumptionStatusId_fkey" FOREIGN KEY ("consumptionStatusId") REFERENCES "ConsumptionStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_consumptionTypeId_fkey" FOREIGN KEY ("consumptionTypeId") REFERENCES "ConsumptionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsumption" ADD CONSTRAINT "MonthlyConsumption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsumption" ADD CONSTRAINT "MonthlyConsumption_consumptionStatusId_fkey" FOREIGN KEY ("consumptionStatusId") REFERENCES "ConsumptionStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsumption" ADD CONSTRAINT "MonthlyConsumption_monthlyPriceId_fkey" FOREIGN KEY ("monthlyPriceId") REFERENCES "MonthlyPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsumption" ADD CONSTRAINT "MonthlyConsumption_consumptionTypeId_fkey" FOREIGN KEY ("consumptionTypeId") REFERENCES "ConsumptionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPrice" ADD CONSTRAINT "MonthlyPrice_generatorGroupId_fkey" FOREIGN KEY ("generatorGroupId") REFERENCES "GeneratorGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionType" ADD CONSTRAINT "ConsumptionType_generatorGroupId_fkey" FOREIGN KEY ("generatorGroupId") REFERENCES "GeneratorGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionPriceHistory" ADD CONSTRAINT "ConsumptionPriceHistory_consumptionTypeId_fkey" FOREIGN KEY ("consumptionTypeId") REFERENCES "ConsumptionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
