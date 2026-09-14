/*
 * -----------------------------------------------------------------------------
 * File        : PasswordHasher.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Hashes and verifies account passwords using PBKDF2 (HMAC-SHA256)
 *               from the .NET cryptography library, so no third party hashing
 *               package is required. Stored format is "iterations.salt.hash".
 * -----------------------------------------------------------------------------
 */

using System.Security.Cryptography;

namespace SmartSolar.Api.Security;

public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    // Generates a random salt and returns the encoded hash for a plain password.
    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return string.Join('.', Iterations, Convert.ToBase64String(salt), Convert.ToBase64String(key));
    }

    // Re-hashes the supplied password with the stored salt and compares the result.
    public static bool Verify(string password, string encodedHash)
    {
        var parts = encodedHash.Split('.', 3);
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations))
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[1]);
        var expectedKey = Convert.FromBase64String(parts[2]);
        var actualKey = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedKey.Length);
        return CryptographicOperations.FixedTimeEquals(expectedKey, actualKey);
    }
}
