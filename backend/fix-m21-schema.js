const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf-8');

const m21Models = `

// ════════════════════════════════════════════════════════════════════════════
// M21: Super Admin Panel
// ════════════════════════════════════════════════════════════════════════════

model SubscriptionPlan {
  id                String              @id @default(uuid())
  code              String              @unique
  nameFa            String
  nameEn            String
  descriptionFa     String?
  price             BigInt
  annualPrice       BigInt?
  currency          String              @default("IRR")
  billingCycle      BillingCycle        @default(MONTHLY)
  isActive          Boolean             @default(true)
  isCustom          Boolean             @default(false)
  sortOrder         Int                 @default(0)
  maxCompanies      Int                 @default(50)
  maxUsers          Int                 @default(500)
  maxGates          Int                 @default(5)
  maxDevices        Int                 @default(20)
  storageGb         Int                 @default(50)
  apiCallsPerDay    Int                 @default(10000)
  smsCredits        Int                 @default(1000)
  features          Json
  subscriptions     ZoneSubscription[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}

model ZoneSubscription {
  id                String              @id @default(uuid())
  zoneId            String              @unique
  planId            String
  status            SubscriptionStatus  @default(ACTIVE)
  startDate         DateTime
  endDate           DateTime?
  autoRenew         Boolean             @default(true)
  trialEndsAt       DateTime?
  isTrial           Boolean             @default(false)
  usageCompanies    Int                 @default(0)
  usageUsers        Int                 @default(0)
  usageStorageGb    Decimal             @db.Decimal(10,2) @default(0)
  usageApiCalls     Int                 @default(0)
  usageSmsCredits   Int                 @default(0)
  lastBilledAt      DateTime?
  nextBillingAt     DateTime?
  customLimits      Json?
  customFeatures    Json?
  notes             String?
  createdBy         String
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  zone              Zone                @relation(fields: [zoneId], references: [id])
  plan              SubscriptionPlan    @relation(fields: [planId], references: [id])
  invoices          ZoneInvoice[]
}

model ZoneInvoice {
  id              String          @id @default(uuid())
  zoneId          String
  subscriptionId  String
  invoiceNumber   String          @unique
  period          String
  amount          BigInt
  status          String          @default("DRAFT")
  issuedAt        DateTime?
  paidAt          DateTime?
  dueDate         DateTime?
  notes           String?
  createdAt       DateTime        @default(now())
  subscription    ZoneSubscription @relation(fields: [subscriptionId], references: [id])
}

model FeatureFlag {
  id              String    @id @default(uuid())
  code            String    @unique
  nameFa          String
  descriptionFa   String?
  module          String?
  defaultValue    Boolean   @default(false)
  isGlobal        Boolean   @default(false)
  overrides       FeatureFlagOverride[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model FeatureFlagOverride {
  id          String      @id @default(uuid())
  flagId      String
  zoneId      String?
  companyId   String?
  value       Boolean
  reason      String?
  setBy       String
  setAt       DateTime    @default(now())
  expiresAt   DateTime?
  flag        FeatureFlag @relation(fields: [flagId], references: [id])
  @@unique([flagId, zoneId, companyId])
}

model SystemConfiguration {
  id          String    @id @default(uuid())
  category    String
  key         String    @unique
  value       String    @db.Text
  isEncrypted Boolean   @default(false)
  description String?
  updatedBy   String?
  updatedAt   DateTime  @updatedAt
  createdAt   DateTime  @default(now())
}

model SystemAnnouncement {
  id              String              @id @default(uuid())
  title           String
  body            String              @db.Text
  type            AnnouncementType
  severity        AlertSeverity
  targetZoneIds   String[]
  targetRoles     String[]
  publishAt       DateTime            @default(now())
  expiresAt       DateTime?
  isActive        Boolean             @default(true)
  channels        String[]
  isDelivered     Boolean             @default(false)
  deliveredAt     DateTime?
  recipientCount  Int?
  createdBy       String
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

model MaintenanceWindow {
  id              String    @id @default(uuid())
  title           String
  description     String?
  startAt         DateTime
  endAt           DateTime
  affectedZoneIds String[]
  affectedModules String[]
  isActive        Boolean   @default(false)
  notifyBefore    Int       @default(60)
  createdBy       String
  createdAt       DateTime  @default(now())
}

model SystemHealthSnapshot {
  id              String    @id @default(uuid())
  recordedAt      DateTime  @default(now())
  apiResponseMs   Decimal   @db.Decimal(8,2)
  apiSuccessRate  Decimal   @db.Decimal(5,2)
  apiRequestsMin  Int
  activeSockets   Int
  dbResponseMs    Decimal   @db.Decimal(8,2)
  dbConnections   Int
  dbPoolSize      Int
  dbQueriesMin    Int
  dbSlowQueries   Int
  redisResponseMs Decimal   @db.Decimal(8,2)
  redisMemoryMb   Decimal   @db.Decimal(10,2)
  redisHitRate    Decimal   @db.Decimal(5,2)
  redisConnections Int
  queueWaiting    Int
  queueActive     Int
  queueCompleted  Int
  queueFailed     Int
  queueDelayed    Int
  storageUsedGb   Decimal   @db.Decimal(10,2)
  storageTotalGb  Decimal   @db.Decimal(10,2)
  storageObjects  Int
  mqttConnected   Boolean
  mqttClients     Int
  mqttMessages    Int
  cpuPercent      Decimal   @db.Decimal(5,2)
  memoryPercent   Decimal   @db.Decimal(5,2)
  diskPercent     Decimal   @db.Decimal(5,2)
  @@index([recordedAt])
}

model GlobalAuditLog {
  id            String    @id @default(uuid())
  zoneId        String?
  userId        String?
  userRole      String?
  action        String
  module        String
  entityType    String?
  entityId      String?
  metadata      Json      @default("{}")
  ipAddress     String?
  userAgent     String?
  isSuper       Boolean   @default(false)
  timestamp     DateTime  @default(now())
  @@index([timestamp])
  @@index([zoneId, timestamp])
  @@index([userId, timestamp])
  @@index([action, timestamp])
  @@index([isSuper, timestamp])
}

model PlatformMetric {
  id          String    @id @default(uuid())
  date        String
  metric      String
  value       Decimal   @db.Decimal(15,4)
  recordedAt  DateTime  @default(now())
  @@unique([date, metric])
  @@index([date])
  @@index([metric, date])
}

// ─── M21 Enums ──────────────────────────────────────────────────────────────

enum BillingCycle {
  MONTHLY
  QUARTERLY
  ANNUAL
  CUSTOM
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
  EXPIRED
  PENDING_PAYMENT
}

enum AnnouncementType {
  INFO
  WARNING
  MAINTENANCE
  EMERGENCY
  FEATURE
}
`;

content += m21Models;

// Add reverse relations to Zone
content = content.replace(
  "  geofenceZones           GeofenceZone[]\n}",
  "  geofenceZones           GeofenceZone[]\n  // M21\n  subscription            ZoneSubscription?\n}"
);

fs.writeFileSync('prisma/schema.prisma', content, 'utf-8');
console.log('M21 Prisma models added');
