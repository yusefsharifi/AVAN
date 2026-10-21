// M21: Super Admin Panel — Utility Functions
import * as crypto from 'crypto';
import * as os from 'os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption for sensitive config values
 */
export function encrypt(value: string, encryptionKey: string): string {
  const key = crypto.scryptSync(encryptionKey, 'idop-salt-v1', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCM decryption
 */
export function decrypt(encryptedValue: string, encryptionKey: string): string {
  const key = crypto.scryptSync(encryptionKey, 'idop-salt-v1', 32);
  const [ivHex, tagHex, encrypted] = encryptedValue.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get CPU usage percentage (averaged over 1 second)
 */
export function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let idleDiff = 0;
      let totalDiff = 0;
      for (let i = 0; i < cpus1.length; i++) {
        const c1 = cpus1[i].times;
        const c2 = cpus2[i].times;
        const idle = c2.idle - c1.idle;
        const total = (c2.user - c1.user) + (c2.nice - c1.nice) + (c2.sys - c1.sys) + (c2.idle - c1.idle) + (c2.irq - c1.irq);
        idleDiff += idle;
        totalDiff += total;
      }
      const usage = totalDiff > 0 ? ((1 - idleDiff / totalDiff) * 100) : 0;
      resolve(Math.round(usage * 100) / 100);
    }, 1000);
  });
}

/**
 * Get memory usage percentage
 */
export function getMemoryUsage(): number {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return Math.round(((totalMem - freeMem) / totalMem) * 10000) / 100;
}

/**
 * Get disk usage percentage (uses os.statvfs on Linux, fallback to 0)
 */
export async function getDiskUsage(): Promise<number> {
  try {
    const { execSync } = await import('child_process');
    const output = execSync('df / --output=pcent | tail -1', { encoding: 'utf8' }).trim();
    return parseFloat(output.replace('%', '')) || 0;
  } catch {
    return 0;
  }
}

/**
 * Mask sensitive value for display
 */
export function maskSensitiveValue(value: string, showChars: number = 4): string {
  if (!value || value.length <= showChars) return '****';
  return '*'.repeat(value.length - showChars) + value.slice(-showChars);
}

/**
 * Generate temporary password
 * Guarantees at least one uppercase letter, one lowercase letter, and one digit.
 */
export function generateTempPassword(length: number = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$';
  const allChars = upper + lower + digits + symbols;

  // Ensure at least one of each required class
  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
  ];

  // Fill remaining positions with random chars from full pool
  const remaining = length - required.length;
  const bytes = crypto.randomBytes(remaining);
  for (let i = 0; i < remaining; i++) {
    required.push(allChars[bytes[i] % allChars.length]);
  }

  // Fisher-Yates shuffle to avoid predictable positions
  for (let i = required.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 12);
}

// ═══════════════════════════════════════════════════════════════════════════
// Default system configuration
// ═══════════════════════════════════════════════════════════════════════════
interface ConfigEntry {
  value: string;
  description: string;
  isEncrypted: boolean;
}

export const DEFAULT_CONFIG: Record<string, ConfigEntry> = {
  SMS_PROVIDER: {
    value: 'kavenegar',
    description: 'SMS service provider',
    isEncrypted: false,
  },
  SMS_API_KEY: {
    value: '',
    description: 'SMS provider API key',
    isEncrypted: true,
  },
  EMAIL_HOST: {
    value: 'smtp.gmail.com',
    description: 'SMTP server host',
    isEncrypted: false,
  },
  EMAIL_PORT: {
    value: '587',
    description: 'SMTP server port',
    isEncrypted: false,
  },
  MQTT_BROKER_URL: {
    value: 'mqtt://localhost:1883',
    description: 'MQTT broker connection URL',
    isEncrypted: false,
  },
  PASSWORD_MIN_LENGTH: {
    value: '8',
    description: 'Minimum password length for all users',
    isEncrypted: false,
  },
  MAX_LOGIN_ATTEMPTS: {
    value: '5',
    description: 'Maximum failed login attempts before lockout',
    isEncrypted: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Data retention policies
// ═══════════════════════════════════════════════════════════════════════════
interface RetentionPolicy {
  module: string;
  retentionDays: number;
  description: string;
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  { module: 'DEVICE_READING', retentionDays: 90, description: 'IoT sensor readings' },
  { module: 'DEVICE_ALERT', retentionDays: 180, description: 'IoT device alerts' },
  { module: 'VISITOR', retentionDays: 365, description: 'Visitor records' },
  { module: 'TRAFFIC', retentionDays: 365, description: 'Vehicle traffic logs' },
  { module: 'WORKFLOW', retentionDays: 730, description: 'Workflow instances' },
  { module: 'GLOBAL_AUDIT_LOG', retentionDays: 365, description: 'System-wide audit logs' },
  { module: 'NOTIFICATION', retentionDays: 30, description: 'Notification history' },
  { module: 'OTP_CODE', retentionDays: 7, description: 'One-time password codes' },
];
