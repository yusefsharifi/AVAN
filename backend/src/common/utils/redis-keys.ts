// ═══════════════════════════════════════════════════════════════════════════════
// Redis Key Constants & TTLs
// ═══════════════════════════════════════════════════════════════════════════════

export const REDIS_KEYS = {
  // M1: Auth
  authBlacklist: (jti: string) => `auth:blacklist:${jti}`,
  authOtp: (phone: string, purpose: string) => `auth:otp:${phone}:${purpose}`,
  authOtpAttempts: (phone: string) => `auth:otp:attempts:${phone}`,
  authFailed: (userId: string) => `auth:failed:${userId}`,
  authLock: (userId: string) => `auth:lock:${userId}`,
  authReset: (token: string) => `auth:reset:${token}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPermissions: (userId: string) => `user:permissions:${userId}`,
  /**
   * SECURITY (SEC-020): short-lived cache of the user's CURRENT auth state
   * (status/role/zoneId/companyId/deletedAt) used by JwtGuard to reject
   * stale tokens. Deliberately nested under the user:profile:${id}: auth
   * namespace so it is invalidated by the existing
   * `user:profile:${id}*` delPattern calls on update/softDelete/suspend.
   */
  userAuthState: (userId: string) => `user:profile:${userId}:auth`,

  // M2: Zone & Company
  zoneSettings: (zoneId: string) => `zone:settings:${zoneId}`,
  zoneStats: (zoneId: string) => `zone:stats:${zoneId}`,
  zoneWorkingHours: (zoneId: string, date: string) => `zone:working-hours:${zoneId}:${date}`,
  companyProfile: (companyId: string) => `company:profile:${companyId}`,
  companyHealth: (companyId: string) => `company:health:${companyId}`,
  plotMap: (zoneId: string) => `plot:map:${zoneId}`,
  plotAvailable: (zoneId: string) => `plot:available:${zoneId}`,

  // M3: Guard Portal
  gateBarrier: (gateId: string) => `gate:barrier:${gateId}`,
  vehicleLookup: (zoneId: string, plate: string) => `vehicle:lookup:${zoneId}:${plate}`,
  blacklistCheck: (zoneId: string, value: string) => `blacklist:${zoneId}:${value}`,
  guardDashboard: (gateId: string) => `guard:dashboard:${gateId}`,
  trafficInside: (zoneId: string) => `traffic:inside:${zoneId}`,
  gatePending: (gateId: string) => `gate:pending:${gateId}`,
  trafficStats: (zoneId: string) => `zone:traffic:stats:${zoneId}:today`,
  anprQueue: (gateId: string) => `anpr:queue:${gateId}`,

  // M5: Visitor Management
  visitorSeq: (zoneId: string, year: string) => `visitor:seq:${zoneId}:${year}`,
  groupSeq: (zoneId: string, year: string) => `group:seq:${zoneId}:${year}`,
  recurringSeq: (zoneId: string, year: string) => `recurring:seq:${zoneId}:${year}`,
  visitorToday: (zoneId: string) => `visitor:today:${zoneId}`,
  visitorInside: (zoneId: string) => `visitor:inside:${zoneId}`,
  visitorHostPending: (hostId: string) => `visitor:host:pending:${hostId}`,
  visitorBlacklist: (zoneId: string, key: string) => `visitor:blacklist:${zoneId}:${key}`,
  visitorWalkinTimeout: (requestId: string) => `visitor:walkin:timeout:${requestId}`,
  visitorStats: (zoneId: string) => `visitor:stats:${zoneId}:today`,
  visitorQrUsed: (qrPayload: string) => `visitor:qr:used:${qrPayload}`,

  // M6: Permit Management
  permitReqSeq: (zoneId: string, year: string) => `permit:req:seq:${zoneId}:${year}`,
  permitIssuedSeq: (zoneId: string, year: string) => `permit:issued:seq:${zoneId}:${year}`,
  permitVerify: (qrHash: string) => `permit:verify:${qrHash}`,
  permitCompanyActive: (companyId: string) => `permit:company:${companyId}:active`,
  permitExpiring: (zoneId: string) => `permit:expiring:${zoneId}`,
  permitPendingReviewer: (reviewerId: string) => `permit:pending:${reviewerId}`,
  permitStats: (zoneId: string) => `permit:stats:${zoneId}`,
  permitTemplate: (type: string, zoneId: string) => `permit:template:${type}:${zoneId}`,

  // M7: Correspondence & Document Automation
  letterRegistryLock: (zoneId: string, year: string) => `letter:registry:lock:${zoneId}:${year}`,
  letterRegistrySeq: (zoneId: string, year: string) => `letter:registry:seq:${zoneId}:${year}`,
  letterVerify: (qrHash: string) => `letter:verify:${qrHash}`,
  letterInboxCount: (userId: string) => `letter:inbox:${userId}:count`,
  letterPending: (userId: string) => `letter:pending:${userId}`,
  letterStats: (zoneId: string) => `letter:stats:${zoneId}:today`,
  archiveShelfMap: (zoneId: string) => `archive:shelf:map:${zoneId}`,
  letterTemplate: (code: string, zoneId: string) => `letter:template:${code}:${zoneId}`,
  letterPdf: (letterId: string) => `letter:pdf:${letterId}`,

  // M8: Workflow Engine
  workflowDef: (code: string, zoneId: string) => `workflow:def:${code}:${zoneId}`,
  workflowInstance: (instanceId: string) => `workflow:instance:${instanceId}`,
  workflowTasksUser: (userId: string, zoneId: string) => `workflow:tasks:user:${userId}:${zoneId}`,
  workflowInbox: (userId: string) => `workflow:inbox:${userId}`,
  workflowDashboard: (zoneId: string) => `workflow:dashboard:${zoneId}`,
  workflowSlaConfig: (code: string, stepId: string) => `workflow:sla:config:${code}:${stepId}`,
  workflowMetrics: (zoneId: string, code: string) => `workflow:metrics:${zoneId}:${code}`,
  workflowGroup: (code: string, zoneId: string) => `workflow:group:${code}:${zoneId}`,
  workflowCompletion: (entityType: string, entityId: string) => `workflow:completion:${entityType}:${entityId}`,

  // M9: Notification Hub
  notifUnread: (userId: string) => `notif:unread:${userId}`,
  notifUnreadModule: (userId: string, module: string) => `notif:unread:module:${userId}:${module}`,
  notifThrottle: (userId: string, groupKey: string) => `notif:throttle:${userId}:${groupKey}`,
  notifDnd: (userId: string) => `notif:dnd:${userId}`,
  notifOnline: (userId: string) => `notif:online:${userId}`,
  notifFcmTokens: (userId: string) => `notif:fcm-tokens:${userId}`,
  notifRules: (module: string, eventType: string) => `notif:rules:${module}:${eventType}`,
  notifTemplate: (code: string, channel: string) => `notif:template:${code}:${channel}`,
  notifWebhook: (zoneId: string) => `notif:webhook:${zoneId}`,
  smsBalanceKaveNegar: () => 'sms:balance:kavenegar',
  smsBalanceMelipayamak: () => 'sms:balance:melipayamak',

  // M10: Finance & ERP
  financeVoucherSeq: (zoneId: string, year: string) => `finance:voucher:seq:${zoneId}:${year}`,
  financeInvoiceSeq: (zoneId: string, year: string) => `finance:invoice:seq:${zoneId}:${year}`,
  financeLeaseSeq: (zoneId: string, year: string) => `finance:lease:seq:${zoneId}:${year}`,
  financeKpi: (zoneId: string) => `finance:kpi:${zoneId}`,
  financeAccountBalance: (accountId: string) => `finance:account:balance:${accountId}`,
  financeBankBalance: (accountId: string) => `bank:balance:${accountId}`,
  financeTrialBalance: (zoneId: string, date: string) => `finance:trial-balance:${zoneId}:${date}`,
  financeAging: (zoneId: string) => `finance:aging:${zoneId}`,
  financeBudgetAvailable: (accountId: string) => `finance:budget:available:${accountId}`,
  financePeriodCurrent: (zoneId: string) => `finance:period:current:${zoneId}`,

  // M11: B2B Exchange
  b2bRfqSeq: (zoneId: string, year: string) => `b2b:rfq:seq:${zoneId}:${year}`,
  b2bRfqBidCount: (rfqId: string) => `b2b:rfq:bidcount:${rfqId}`,
  b2bRfqPublished: (zoneId: string) => `b2b:rfq:published:${zoneId}`,
  b2bRfqMarketplace: (zoneId: string) => `b2b:rfq:marketplace:${zoneId}`,
  b2bBidSealed: (rfqId: string) => `b2b:bid:sealed:${rfqId}`,
  b2bSupplierRanking: (zoneId: string) => `b2b:supplier:ranking:${zoneId}`,
  b2bCatalogSearch: (zoneId: string, hash: string) => `b2b:catalog:search:${zoneId}:${hash}`,
  b2bCategories: (zoneId: string) => `b2b:categories:${zoneId}`,
  b2bSupplierProfile: (companyId: string) => `b2b:supplier:profile:${companyId}`,
  b2bRfqStats: (zoneId: string) => `b2b:rfq:stats:${zoneId}`,

  // M12: Commercial
  commercialProformaSeq: (zoneId: string, dir: string, year: string) => `commercial:proforma:seq:${zoneId}:${dir}:${year}`,
  commercialOrderSeq: (zoneId: string, dir: string, year: string) => `commercial:order:seq:${zoneId}:${dir}:${year}`,
  commercialContractSeq: (zoneId: string, year: string) => `commercial:contract:seq:${zoneId}:${year}`,
  commercialProformaDashboard: (companyId: string) => `commercial:proforma:dashboard:${companyId}`,
  commercialAging: (zoneId: string) => `commercial:aging:${zoneId}`,
  commercialCredit: (partyId: string) => `commercial:credit:${partyId}`,
  commercialExpiring: (zoneId: string) => `commercial:expiring:${zoneId}`,
  commercialOrderStats: (zoneId: string) => `commercial:order:stats:${zoneId}`,

  // M13: CMMS
  cmmsAssetSeq: (zoneId: string) => `cmms:asset:seq:${zoneId}`,
  cmmsWorkOrderSeq: (zoneId: string, year: string) => `cmms:wo:seq:${zoneId}:${year}`,
  cmmsDashboard: (zoneId: string) => `cmms:dashboard:${zoneId}`,
  cmmsCalendar: (zoneId: string) => `cmms:calendar:${zoneId}`,
  cmmsMtbf: (assetId: string) => `cmms:mtbf:${assetId}`,
  cmmsMttr: (assetId: string) => `cmms:mttr:${assetId}`,
  cmmsLowStock: (zoneId: string) => `cmms:lowstock:${zoneId}`,
  cmmsTechnicianWorkload: (zoneId: string) => `cmms:technician:workload:${zoneId}`,
  cmmsUpcoming: (zoneId: string) => `cmms:upcoming:${zoneId}`,
  cmmsAssetMap: (zoneId: string) => `cmms:asset:map:${zoneId}`,

  // M14: HSE
  hseIncidentSeq: (zoneId: string, year: string) => `hse:incident:seq:${zoneId}:${year}`,
  hseCapaSeq: (zoneId: string, year: string) => `hse:capa:seq:${zoneId}:${year}`,
  hseInspectionSeq: (zoneId: string, year: string) => `hse:inspection:seq:${zoneId}:${year}`,
  hseRaSeq: (zoneId: string, year: string) => `hse:ra:seq:${zoneId}:${year}`,
  hseDashboard: (zoneId: string) => `hse:dashboard:${zoneId}`,
  hseStats: (zoneId: string) => `hse:stats:${zoneId}`,
  hseDaysSinceIncident: (zoneId: string) => `hse:days-since-incident:${zoneId}`,
  hseTrir: (zoneId: string, year: string) => `hse:trir:${zoneId}:${year}`,
  hseTrainingCompliance: (companyId: string) => `hse:training:compliance:${companyId}`,
  hseOpenCapas: (userId: string) => `hse:open-capas:${userId}`,

  // M22: Document Verification Portal
  VERIFY_RESULT: (hash: string) => `verify:result:${hash}`,
  VERIFY_RESULT_NUMBER: (type: string, num: string) => `verify:result:number:${type}:${num}`,
  VERIFY_RATE_SESSION: (sessionId: string) => `verify:rate:session:${sessionId}`,
  VERIFY_RATE_IP: (ip: string) => `verify:rate:ip:${ip}`,
  VERIFY_RATE_GLOBAL: 'verify:rate:global',
  VERIFY_BLOCKED_IP: (ip: string) => `verify:blocked:${ip}`,
  VERIFY_BADGE: (code: string) => `verify:badge:${code}`,
  VERIFY_STATS_GLOBAL: 'verify:stats:global',
  VERIFY_STATS_ZONE: (zoneId: string) => `verify:stats:zone:${zoneId}`,
  VERIFY_PORTAL_INFO: 'verify:portal:info',
  VERIFY_RATE_MANUAL: (ip: string) => `verify:rate:manual:${ip}`,

} as const;

// Alias for backwards compatibility
export const RedisKeys = REDIS_KEYS;

export const REDIS_TTL = {
  // M1
  BLACKLIST_TOKEN: 15 * 60,       // 15 min
  OTP_RATE_LIMIT: 10 * 60,        // 10 min
  OTP_TRACKING: 5 * 60,           // 5 min
  FAILED_LOGIN: 24 * 60 * 60,     // 24 hr
  PASSWORD_RESET: 60 * 60,        // 1 hr
  USER_PROFILE: 5 * 60,           // 5 min
  USER_PERMISSIONS: 5 * 60,       // 5 min
  USER_AUTH_STATE: 45,            // 45 sec (SEC-020 staleness window for JwtGuard)

  // M2
  ZONE_SETTINGS: 10 * 60,         // 10 min
  ZONE_STATS: 60,                 // 1 min
  ZONE_WORKING_HOURS: 24 * 60 * 60, // 24 hr
  COMPANY_PROFILE: 5 * 60,        // 5 min
  COMPANY_HEALTH: 30 * 60,        // 30 min
  PLOT_MAP: 5 * 60,               // 5 min
  PLOT_AVAILABLE: 2 * 60,         // 2 min

  // M3
  GATE_BARRIER: 5 * 60,           // 5 min
  VEHICLE_LOOKUP: 2 * 60,         // 2 min
  BLACKLIST_CHECK: 5 * 60,        // 5 min
  GUARD_DASHBOARD: 10,            // 10 sec
  TRAFFIC_INSIDE: 30,             // 30 sec
  GATE_PENDING: 5 * 60,           // 5 min
  TRAFFIC_STATS: 60,              // 1 min
  ANPR_QUEUE: 30,                 // 30 sec

  // M5
  VISITOR_TODAY: 60,              // 1 min
  VISITOR_INSIDE: 30,             // 30 sec
  VISITOR_HOST_PENDING: 30,       // 30 sec
  VISITOR_BLACKLIST: 5 * 60,      // 5 min
  VISITOR_WALKIN_TIMEOUT: 10 * 60, // 10 min
  VISITOR_STATS: 2 * 60,          // 2 min
  VISITOR_QR_USED: 24 * 60 * 60,  // 24 hr

  // M6
  PERMIT_REQ_SEQ: 0,               // persistent counter
  PERMIT_ISSUED_SEQ: 0,            // persistent counter
  PERMIT_VERIFY: 5 * 60,           // 5 min
  PERMIT_COMPANY_ACTIVE: 5 * 60,   // 5 min
  PERMIT_EXPIRING: 30 * 60,        // 30 min
  PERMIT_PENDING_REVIEWER: 2 * 60, // 2 min
  PERMIT_STATS: 10 * 60,           // 10 min
  PERMIT_TEMPLATE: 60 * 60,        // 60 min

  // M7
  LETTER_REGISTRY_LOCK: 5,              // 5 sec (mutex)
  LETTER_REGISTRY_SEQ: 0,               // persistent counter
  LETTER_VERIFY: 5 * 60,                // 5 min
  LETTER_INBOX_COUNT: 30,               // 30 sec
  LETTER_PENDING: 60,                   // 1 min
  LETTER_STATS: 5 * 60,                 // 5 min
  ARCHIVE_SHELF_MAP: 5 * 60,            // 5 min
  LETTER_TEMPLATE: 30 * 60,             // 30 min
  LETTER_PDF: 60 * 60,                  // 60 min

  // M8
  WORKFLOW_DEF: 10 * 60,               // 10 min
  WORKFLOW_INSTANCE: 5 * 60,           // 5 min
  WORKFLOW_TASKS_USER: 30,             // 30 sec
  WORKFLOW_INBOX: 15,                  // 15 sec
  WORKFLOW_DASHBOARD: 60,              // 1 min
  WORKFLOW_SLA_CONFIG: 30 * 60,        // 30 min
  WORKFLOW_METRICS: 10 * 60,           // 10 min
  WORKFLOW_GROUP: 5 * 60,              // 5 min

  // M10: Finance & ERP
  FINANCE_VOUCHER_SEQ: 0,               // persistent counter
  FINANCE_INVOICE_SEQ: 0,               // persistent counter
  FINANCE_LEASE_SEQ: 0,                 // persistent counter
  FINANCE_KPI: 5 * 60,                  // 5 min
  FINANCE_ACCOUNT_BALANCE: 10 * 60,     // 10 min
  FINANCE_BANK_BALANCE: 5 * 60,         // 5 min
  FINANCE_TRIAL_BALANCE: 60 * 60,       // 1 hr
  FINANCE_AGING: 30 * 60,              // 30 min
  FINANCE_BUDGET_AVAILABLE: 10 * 60,    // 10 min
  FINANCE_PERIOD_CURRENT: 60 * 60,      // 1 hr

  // M11: B2B Exchange
  B2B_RFQ_SEQ: 0,                         // persistent counter
  B2B_RFQ_BID_COUNT: 60,                  // 1 min
  B2B_RFQ_PUBLISHED: 2 * 60,              // 2 min
  B2B_RFQ_MARKETPLACE: 2 * 60,            // 2 min
  B2B_BID_SEALED: 24 * 60 * 60,           // until deadline
  B2B_SUPPLIER_RANKING: 60 * 60,          // 1 hr
  B2B_CATALOG_SEARCH: 2 * 60,             // 2 min
  B2B_CATEGORIES: 30 * 60,               // 30 min
  B2B_SUPPLIER_PROFILE: 10 * 60,          // 10 min
  B2B_RFQ_STATS: 10 * 60,               // 10 min

  // M15: HR & Payroll
  HR_EMP_SEQ: 0,                        // persistent counter
  HR_LEAVE_SEQ: 0,                      // persistent counter
  HR_ATTENDANCE: 24 * 60,               // 24 hr (today's record)
  HR_TEAM_ATTENDANCE: 5 * 60,           // 5 min
  HR_LEAVE_BALANCE: 5 * 60,             // 5 min
  HR_PAYROLL_CACHE: 10 * 60,            // 10 min
  HR_STATS: 10 * 60,                    // 10 min
  HR_ORG_CHART: 30 * 60,               // 30 min

  // M17: Inventory & Warehouse
  INV_ITEM_SEQ: 0,                     // persistent counter
  INV_REQ_SEQ: 0,                     // persistent counter
  INV_GRN_SEQ: 0,                     // persistent counter
  INV_PR_SEQ: 0,                      // persistent counter
  INV_PO_SEQ: 0,                      // persistent counter
  INV_CNT_SEQ: 0,                     // persistent counter
  INV_TRX_SEQ: 0,                     // persistent counter
  INV_STOCK_CACHE: 60,                 // 1 min
  INV_LOW_STOCK: 30 * 60,             // 30 min
  INV_VALUATION: 30 * 60,             // 30 min
  INV_ITEM_SEARCH: 2 * 60,            // 2 min

  // M18: Digital Signature
  SIG_VERIFY: 5 * 60,                 // 5 min
  SIG_PENDING: 30,                    // 30 sec
  SIG_OCSP: 60 * 60,                 // 1 hr
  SIG_AGENT_CONN: 10 * 60,           // 10 min
  SIG_AGENT_SIGN: 2 * 60,            // 2 min
  SIG_CERT_ACTIVE: 5 * 60,           // 5 min
  SIG_STATS: 10 * 60,                // 10 min
  SIG_DOC: 2 * 60,                   // 2 min

  // M18: Reporting & BI
  RPT_DASH_ZONE: 60,                 // 1 min
  RPT_DASH_COMPANY: 120,             // 2 min
  RPT_DASH_SUPERADMIN: 30,           // 30 sec
  RPT_DASH_HSE: 300,                 // 5 min
  RPT_DASH_FINANCE: 300,             // 5 min
  RPT_DASH_OPS: 120,                 // 2 min
  RPT_EXEC: 24 * 60 * 60,            // 24 hr
  RPT_METRIC_HIST: 24 * 60 * 60,     // 24 hr
  RPT_METRIC_TREND: 30 * 60,         // 30 min
  RPT_WIDGET: 300,                   // 5 min
  RPT_KPI: 10 * 60,                  // 10 min
  RPT_PRESIGNED: 15 * 60,            // 15 min,
  // M20: IoT
  IOT_HEARTBEAT: (interval: number) => interval * 2,              // 2x heartbeat interval
  IOT_BARRIER: 60,                                                 // 60 sec (state)
  IOT_SCALE: 30,                                                   // 30 sec (live weight)
  IOT_GPS: 2 * 60,                                                 // 2 min (last position)
  IOT_RFID_CACHE: 5 * 60,                                          // 5 min (card lookup)
  IOT_ENV: 5 * 60,                                                 // 5 min (env readings)
  IOT_ANPR_PENDING: 60,                                            // 60 sec (awaiting guard)
  IOT_DASHBOARD: 30,                                               // 30 sec
  IOT_CMD_ACK: 30,                                                 // 30 sec
  IOT_GEOFENCES: 5 * 60,                                           // 5 min (cached)
  IOT_VEHICLE_POSITION: 2 * 60,                                    // 2 min,
  // M21: Super Admin
  SYS_HEALTH: 10,
  PLATFORM_KPIS: 5 * 60,
  CONFIG: 30 * 60,
  MAINTENANCE: 60,
  SUPER_IMPERSONATION: 120 * 60,
  ZONE_OVERVIEW: 5 * 60,
  PLAN_COMPARISON: 60 * 60,
  // M22: Verification Portal
  VERIFY_RESULT: 5 * 60,         // 5 min (cached result)
  VERIFY_RATE: 60 * 60,          // 1 hour (rate limit counter)
  VERIFY_BLOCKED_IP: 24 * 60 * 60, // 24 hours default block
  VERIFY_BADGE: 60 * 60,         // 1 hour
  VERIFY_STATS: 5 * 60,          // 5 min
  VERIFY_PORTAL: 30 * 60,        // 30 min
} as const;
