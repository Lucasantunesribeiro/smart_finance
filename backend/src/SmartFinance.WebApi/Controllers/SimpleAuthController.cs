using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Domain.Enums;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class SimpleAuthController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public SimpleAuthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] JsonElement loginData)
    {
        try
        {
            // Extract email and password from JsonElement
            string email = loginData.GetProperty("email").GetString() ?? "";
            string password = loginData.GetProperty("password").GetString() ?? "";
            
            // Debug logging
            Console.WriteLine($"Received login request: Email={email}, Password={password}");
            
            // Basic validation - for development only
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            if (!IsValidEmail(email))
            {
                return BadRequest(new { message = "Invalid email format" });
            }

            if (password.Length < 3)
            {
                return BadRequest(new { message = "Password must be at least 3 characters" });
            }

            // Use the fixed userId that matches the seeded accounts
            // This ensures the authenticated user has access to the seeded accounts
            var userId = Guid.Parse("244aaa4d-8b07-4e4d-89f9-09281b73b24f"); // Fixed user ID from seed data
            var token = GenerateJwtToken(email, userId);

            var response = new AuthResponseDto
            {
                AccessToken = token,
                RefreshToken = "refresh_" + Guid.NewGuid().ToString(),
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                User = new UserDto
                {
                    Id = userId,
                    Email = email,
                    FirstName = GetFirstNameFromEmail(email),
                    LastName = "User",
                    Role = UserRole.User,
                    IsActive = true,
                    LastLoginAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                }
            };

            return Ok(response);
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Invalid JSON format" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Login error: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public IActionResult RefreshToken([FromBody] RefreshTokenDto request)
    {
        try
        {
            // Basic refresh token validation for development
            if (string.IsNullOrEmpty(request.RefreshToken) || !request.RefreshToken.StartsWith("refresh_"))
            {
                return Unauthorized(new { message = "Invalid refresh token" });
            }

            // Generate new tokens with the fixed userId
            var email = "user@smartfinance.com"; // Default for development
            var userId = Guid.Parse("244aaa4d-8b07-4e4d-89f9-09281b73b24f"); // Fixed user ID from seed data
            var newToken = GenerateJwtToken(email, userId);

            var response = new AuthResponseDto
            {
                AccessToken = newToken,
                RefreshToken = "refresh_" + Guid.NewGuid().ToString(),
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                User = new UserDto
                {
                    Id = userId,
                    Email = email,
                    FirstName = "Development",
                    LastName = "User",
                    Role = UserRole.User,
                    IsActive = true,
                    LastLoginAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Refresh failed", error = ex.Message });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        try
        {
            // For development, just return success
            return Ok(new { message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Logout failed", error = ex.Message });
        }
    }

    private string GenerateJwtToken(string email, Guid userId)
    {
        var secretKey = _configuration["Jwt:SecretKey"];
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim("email", email),
            new Claim(JwtRegisteredClaimNames.Sub, email),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private string GetFirstNameFromEmail(string email)
    {
        if (string.IsNullOrEmpty(email))
            return "User";

        var localPart = email.Split('@')[0];
        return char.ToUpper(localPart[0]) + localPart.Substring(1).ToLower();
    }
}