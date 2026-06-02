
import { CryptoPasswordAdapter } from './src/infrastructure/crypto_password_adapter.js';
import { asPassword } from './src/taxonomy/index.js';

const adapter = new CryptoPasswordAdapter();
const hash = await adapter.hashPassword(asPassword('AdminPass123!'));
console.log(hash);
