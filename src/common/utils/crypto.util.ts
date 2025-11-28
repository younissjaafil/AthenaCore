import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class CryptoUtil {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate a random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a UUID v4
   */
  static generateUuid(): string {
    return crypto.randomUUID();
  }

  /**
   * Create SHA256 hash
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
