// contract/password_hash_port.ts
import type { CryptoHash, Password, PasswordLength, ByteLength, AuthToken, PasswordMatch } from '../taxonomy';

export interface IPasswordHashPort {
  hashPassword(password: Password): Promise<CryptoHash>;
  verifyPassword(password: Password, hash: CryptoHash): Promise<PasswordMatch>;
  generateSecurePassword(length?: PasswordLength): Password;
  sha256Hex(input: CryptoHash): Promise<CryptoHash>;
  randomToken(byteLength?: ByteLength): AuthToken;
}
