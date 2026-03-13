using SmartFinance.WebApi.Security;

namespace SmartFinance.WebApi.Middleware;

public class CsrfValidationMiddleware
{
    private static readonly HashSet<string> SafeMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Get,
        HttpMethods.Head,
        HttpMethods.Options,
        HttpMethods.Trace
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<CsrfValidationMiddleware> _logger;

    public CsrfValidationMiddleware(RequestDelegate next, ILogger<CsrfValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (SafeMethods.Contains(context.Request.Method))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Path.StartsWithSegments("/api/v1"))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Cookies.ContainsKey(AuthCookieNames.AccessToken))
        {
            await _next(context);
            return;
        }

        var csrfCookie = context.Request.Cookies[AuthCookieNames.CsrfToken];
        var csrfHeader = context.Request.Headers["X-CSRF-Token"].ToString();

        if (string.IsNullOrWhiteSpace(csrfCookie) || string.IsNullOrWhiteSpace(csrfHeader) || !string.Equals(csrfCookie, csrfHeader, StringComparison.Ordinal))
        {
            _logger.LogWarning("CSRF validation failed for path {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { message = "Invalid CSRF token" });
            return;
        }

        await _next(context);
    }
}
