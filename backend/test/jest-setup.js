// Polyfill BigInt.toJSON for Jest serialization
// Jest workers use JSON.stringify to communicate between processes
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// NEW-003 follow-up: system-config.service.ts reads CONFIG_ENCRYPTION_KEY at module
// load time and uses it for encrypt/decrypt. Tests encrypt fixture values with the
// well-known dev key below, so it must be set before any spec module is imported.
process.env.CONFIG_ENCRYPTION_KEY =
  process.env.CONFIG_ENCRYPTION_KEY || 'idop-default-config-key-change-in-production';

// NEW-014 follow-up: guard-portal isWorkingHours() depends on the real clock, which
// made tests fail when run outside 07:00–18:00 Tehran time. Deterministic tests must
// mock isWorkingHours explicitly (see guard-portal.service.spec.ts).
