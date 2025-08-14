using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class TestAuthController : ControllerBase
{
    private readonly SmartFinanceDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<TestAuthController> _logger;

    public TestAuthController(
        SmartFinanceDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        ILogger<TestAuthController> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        try
        {
            _logger.LogInformation("Login attempt for email: {Email}", loginDto.Email);

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null)
            {
                _logger.LogWarning("User not found for email: {Email}", loginDto.Email);
                return Unauthorized(new { message = "Invalid credentials" });
            }

            if (!_passwordHasher.VerifyPassword(loginDto.Password, user.PasswordHash))
            {
                _logger.LogWarning("Invalid password for email: {Email}", loginDto.Email);
                return Unauthorized(new { message = "Invalid credentials" });
            }

            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // Update user
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            user.LastLoginAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User logged in successfully: {Email}", loginDto.Email);

            return Ok(new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role,
                    IsActive = user.IsActive,
                    LastLoginAt = user.LastLoginAt,
                    CreatedAt = user.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email: {Email}", loginDto.Email);
            return StatusCode(500, new { message = "An error occurred during login", details = ex.Message });
        }
    }

    [HttpGet("test")]
    [AllowAnonymous]
    public IActionResult Test()
    {
        return Ok(new { message = "TestAuth controller is working", timestamp = DateTime.UtcNow });
    }

    [HttpGet("debug/{email}")]
    [AllowAnonymous]
    public async Task<ActionResult> Debug(string email)
    {
        try
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                return Ok(new { found = false, message = "User not found" });
            }

            return Ok(new { 
                found = true,
                user = new {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role,
                    isActive = user.IsActive,
                    isDeleted = user.IsDeleted,
                    passwordHashLength = user.PasswordHash.Length,
                    passwordHashPreview = user.PasswordHash.Substring(0, Math.Min(20, user.PasswordHash.Length)) + "..."
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("testpassword")]
    [AllowAnonymous]
    public async Task<ActionResult> TestPassword([FromBody] LoginDto loginDto)
    {
        try
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null)
            {
                return Ok(new { userFound = false });
            }

            var passwordValid = _passwordHasher.VerifyPassword(loginDto.Password, user.PasswordHash);

            return Ok(new { 
                userFound = true,
                passwordValid = passwordValid,
                providedPassword = loginDto.Password,
                storedHashLength = user.PasswordHash.Length,
                userActive = user.IsActive,
                userDeleted = user.IsDeleted
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }
}