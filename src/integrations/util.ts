import * as crypto from 'node:crypto';

export function generateFingerprint(
  path: string,
  line: number,
  column: number,
  error: string | number,
): string {
  return crypto.hash('sha256', `${path}:${line}:${column}:${error}`, 'base64');
}
