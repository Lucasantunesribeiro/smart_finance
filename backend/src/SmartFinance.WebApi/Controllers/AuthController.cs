using System.Security.Claims;
using System.Security.Cryptography;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartFinance.Application.Common.DTOs;
using SmartFinance.Application.Features.Auth.Commands;
using SmartFinance.Domain.Entities;
using SmartFinance.Domain.Interfaces;
using SmartFinance.WebApi.Security;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[EnableRateLimiting("AuthRateLimit")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;

    public AuthController(
        IMediator mediator,
        IUnitOfWork unitOfWork,
        ILogger<AuthController> logger,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _mediator = mediator;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _configuration = configuration;
        _environment = environment;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        try
        {
            var command = new LoginCommand
            {
                Email = loginDto.Email,
                Password = loginDto.Password
            };

            var result = await _mediator.Send(command);
            AppendAuthCookies(result);

            return Ok(SanitizeTokens(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Login attempt failed for email: {Email}", loginDto.Email);
            return Unauthorized(new { message = "Invalid credentials" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email: {Email}", loginDto.Email);
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] CreateUserDto createUserDto)
    {
        try
        {
            var command = new RegisterCommand
            {
                Email = createUserDto.Email,
                Password = createUserDto.Password,
                FirstName = createUserDto.FirstName,
                LastName = createUserDto.LastName
            };

            var result = await _mediator.Send(command);
            AppendAuthCookies(result);

            return Ok(SanitizeTokens(result));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Registration failed for email: {Email}", createUserDto.Email);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for email: {Email}", createUserDto.Email);
            return StatusCode(500, new { message = "An error occurred during registration" });
        }
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken([FromBody] RefreshTokenDto? refreshTokenDto)
    {
        try
        {
            var refreshToken = Request.Cookies[AuthCookieNames.RefreshToken];
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                refreshToken = refreshTokenDto?.RefreshToken;
            }

            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return Unauthorized(new { message = "Refresh token not provided" });
            }

            var command = new RefreshTokenCommand
            {
                RefreshToken = refreshToken
            };

            var result = await _mediator.Send(command);
            AppendAuthCookies(result);

            return Ok(SanitizeTokens(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Refresh token failed");
            return Unauthorized(new { message = "Invalid refresh token" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return StatusCode(500, new { message = "An error occurred during token refresh" });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthResponseDto>> Me()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { message = "Authentication required" });
            }

            var user = await _unitOfWork.Repository<User>()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            return Ok(new AuthResponseDto
            {
                AccessToken = string.Empty,
                RefreshToken = string.Empty,
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
            _logger.LogError(ex, "Error retrieving current session");
            return StatusCode(500, new { message = "An error occurred while retrieving session" });
        }
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult> Logout()
    {
        try
        {
            var refreshToken = Request.Cookies[AuthCookieNames.RefreshToken];
            if (!string.IsNullOrWhiteSpace(refreshToken))
            {
                var user = await _unitOfWork.Repository<User>()
                    .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

                if (user != null)
                {
                    user.RefreshToken = null;
                    user.RefreshTokenExpiry = null;
                    user.UpdatedAt = DateTime.UtcNow;
                    await _unitOfWork.Repository<User>().UpdateAsync(user);
                    await _unitOfWork.SaveChangesAsync();
                }
            }
            else
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    await _mediator.Send(new LogoutCommand { UserId = userId });
                }
            }

            DeleteAuthCookies();
            return Ok(new { message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            DeleteAuthCookies();
            return StatusCode(500, new { message = "An error occurred during logout" });
        }
    }

    private void AppendAuthCookies(AuthResponseDto response)
    {
        var cookieOptions = BuildCookieOptions(response.ExpiresAt, httpOnly: true);
        var refreshCookieOptions = BuildCookieOptions(DateTime.UtcNow.AddDays(7), httpOnly: true);
        var csrfCookieOptions = BuildCookieOptions(DateTime.UtcNow.AddDays(7), httpOnly: false);

        Response.Cookies.Append(AuthCookieNames.AccessToken, response.AccessToken, cookieOptions);
        Response.Cookies.Append(AuthCookieNames.RefreshToken, response.RefreshToken, refreshCookieOptions);
        Response.Cookies.Append(AuthCookieNames.CsrfToken, Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)), csrfCookieOptions);
    }

    private void DeleteAuthCookies()
    {
        var options = BuildCookieOptions(DateTime.UtcNow.AddDays(-1), httpOnly: true);
        var csrfOptions = BuildCookieOptions(DateTime.UtcNow.AddDays(-1), httpOnly: false);

        Response.Cookies.Delete(AuthCookieNames.AccessToken, options);
        Response.Cookies.Delete(AuthCookieNames.RefreshToken, options);
        Response.Cookies.Delete(AuthCookieNames.CsrfToken, csrfOptions);
    }

    private CookieOptions BuildCookieOptions(DateTime expiresAt, bool httpOnly)
    {
        var domain = _configuration["Auth:CookieDomain"] ?? Environment.GetEnvironmentVariable("COOKIE_DOMAIN");

        return new CookieOptions
        {
            HttpOnly = httpOnly,
            Secure = ResolveSecureCookies(),
            SameSite = ResolveSameSiteMode(),
            Expires = new DateTimeOffset(expiresAt),
            Path = "/",
            Domain = string.IsNullOrWhiteSpace(domain) ? null : domain
        };
    }

    private bool ResolveSecureCookies()
    {
        var configuredValue = _configuration["Auth:CookieSecure"] ?? Environment.GetEnvironmentVariable("COOKIE_SECURE");
        if (bool.TryParse(configuredValue, out var secure))
        {
            return secure;
        }

        return !_environment.IsDevelopment();
    }

    private SameSiteMode ResolveSameSiteMode()
    {
        var configuredValue = _configuration["Auth:CookieSameSite"] ?? Environment.GetEnvironmentVariable("COOKIE_SAMESITE");
        return configuredValue?.Trim().ToLowerInvariant() switch
        {
            "strict" => SameSiteMode.Strict,
            "none" => SameSiteMode.None,
            _ => SameSiteMode.Lax
        };
    }

    private static AuthResponseDto SanitizeTokens(AuthResponseDto response)
    {
        return new AuthResponseDto
        {
            AccessToken = string.Empty,
            RefreshToken = string.Empty,
            ExpiresAt = response.ExpiresAt,
            User = response.User
        };
    }
}
