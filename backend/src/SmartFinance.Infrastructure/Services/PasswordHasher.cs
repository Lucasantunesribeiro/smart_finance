using System.Security.Cryptography;
using SmartFinance.Application.Common.Interfaces;

namespace SmartFinance.Infrastructure.Services;

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int CurrentIterations = 600000;
    private const int LegacyIterations = 10000;

    public string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[SaltSize];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, CurrentIterations, HashAlgorithmName.SHA256);
        var key = pbkdf2.GetBytes(KeySize);

        var hashBytes = new byte[SaltSize + KeySize];
        Array.Copy(salt, 0, hashBytes, 0, SaltSize);
        Array.Copy(key, 0, hashBytes, SaltSize, KeySize);

        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyPassword(string password, string hashedPassword)
    {
        try
        {
            var hashBytes = Convert.FromBase64String(hashedPassword);
            var salt = new byte[SaltSize];
            Array.Copy(hashBytes, 0, salt, 0, SaltSize);

            if (VerifyWithIterations(password, salt, hashBytes, CurrentIterations))
            {
                return true;
            }

            return VerifyWithIterations(password, salt, hashBytes, LegacyIterations);
        }
        catch
        {
            return false;
        }
    }

    private static bool VerifyWithIterations(string password, byte[] salt, byte[] hashBytes, int iterations)
    {
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var key = pbkdf2.GetBytes(KeySize);

        for (int i = 0; i < KeySize; i++)
        {
            if (hashBytes[i + SaltSize] != key[i])
            {
                return false;
            }
        }

        return true;
    }
}
