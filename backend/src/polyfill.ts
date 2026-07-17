import * as nodeCrypto from 'crypto';

// Node 18: глобального crypto нет, а @nestjs/typeorm вызывает crypto.randomUUID()
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = nodeCrypto.webcrypto;
}
