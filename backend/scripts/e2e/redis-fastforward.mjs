/**
 * E2E verification harness for the IDOP/AVAN backend.
 *
 * REQUIRES A RUNNING STACK. Talks to a live backend on http://localhost:3000/api/v1
 * and asserts against PostgreSQL directly via psql.
 *
 * TEMP-ONLY DEPENDENCY -- NOT A DELIVERABLE:
 *   This machine has no Redis. These harnesses depend on a throwaway in-memory
 *   RESP2 shim listening on 127.0.0.1:6379 (mini-redis.mjs, kept OUTSIDE the repo).
 *   That shim is TEST SCAFFOLD ONLY: not a product component, not referenced by any
 *   runtime code, and must never be shipped or cited as one. Production uses the real
 *   Redis declared in docker-compose.yml -- see docs/DEPLOYMENT.md.
 *
 *   The in-memory shim resets on restart, so its INCR counters restart at 1 and would
 *   collide with numbers already persisted (SO-2026-00001, EMP-...). crud-verify
 *   therefore fast-forwards every counter above the highest value in Postgres first.
 *
 *   browser-survival.mjs additionally needs puppeteer-core (dev-only), which lives in
 *   the harness runtime's node_modules -- run it from there or install it alongside.
 *
 * Source of these files: the Step 4 verification session. See docs/FINAL-REPORT.md
 * section 8 for the artifact index and section 6 for the recorded results.
 */
// Fast-forward a Redis INCR counter past the max value already in Postgres.
// Usage: node redis-fastforward.mjs <key> <value>
// The temp mini-redis shim resets on restart, so counters can lag behind rows
// that earlier runs created -> INCR mints a duplicate business number.
import net from 'node:net';

const [key, value] = process.argv.slice(2);
if (!key || !value) {
  console.error('usage: node redis-fastforward.mjs <key> <value>');
  process.exit(1);
}

function resp(...args) {
  return (
    `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join('')
  );
}

const socket = net.connect(6379, '127.0.0.1');
let buf = '';
socket.on('data', (d) => {
  buf += d.toString();
  // One reply is enough for our single command.
  if (buf.includes('\r\n')) {
    process.stdout.write(`reply: ${JSON.stringify(buf)}\n`);
    socket.end();
  }
});
socket.on('connect', () => {
  socket.write(resp('SET', key, value));
  socket.write(resp('GET', key));
});
socket.on('error', (e) => {
  console.error('redis error:', e.message);
  process.exit(1);
});
socket.setTimeout(5000, () => {
  console.error('timeout');
  process.exit(1);
});
