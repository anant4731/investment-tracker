import crypto from "crypto";

const ITERATIONS = 310000;
const KEYLEN = 32;
const DIGEST = "sha256";


console.log(hashPassword("Admin@4731"))

export async function hashPassword(password: string, salt?: string) {
  salt = salt || crypto.randomBytes(16).toString("hex");

  const derivedKey = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt!, ITERATIONS, KEYLEN, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });

  return { salt, hash: derivedKey };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const { hash: derivedKey } = await hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(derivedKey, "hex")
  );
}
