import crypto from 'crypto';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(buffer) {
  let num = BigInt('0x' + buffer.toString('hex'));
  let result = '';
  while (num > 0) {
    result = BASE62[num % 62n] + result;
    num = num / 62n;
  }
  return result || '0';
}

function generateOurParam({ keyword, src, creative }, salt = '') {
  const raw = `${src}:${creative}:${keyword}:${salt}`;
  const hash = crypto.createHash('sha256').update(raw).digest();
  return toBase62(hash).slice(0, 16);
}

export { generateOurParam };
