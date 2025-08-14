using SmartFinance.Domain.Entities;

namespace SmartFinance.Application.Common.Interfaces;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hashedPassword);
}

public interface IJwtTokenService
{
    string GenerateToken(Guid userId, string email, string role);
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    bool ValidateToken(string token);
    Guid GetUserIdFromToken(string token);
} 