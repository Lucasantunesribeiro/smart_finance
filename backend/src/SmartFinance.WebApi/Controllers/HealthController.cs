using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace SmartFinance.WebApi.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var healthData = new
        {
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Version = Assembly.GetExecutingAssembly().GetName().Version?.ToString(),
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            Uptime = TimeSpan.FromMilliseconds(Environment.TickCount64),
            Memory = new
            {
                WorkingSet = GC.GetTotalMemory(false),
                Gen0Collections = GC.CollectionCount(0),
                Gen1Collections = GC.CollectionCount(1),
                Gen2Collections = GC.CollectionCount(2)
            }
        };

        return Ok(healthData);
    }

    [HttpGet("ready")]
    public IActionResult Ready()
    {
        // Add database connectivity check here if needed
        return Ok(new { Status = "Ready", Timestamp = DateTime.UtcNow });
    }

    [HttpGet("live")]
    public IActionResult Live()
    {
        return Ok(new { Status = "Live", Timestamp = DateTime.UtcNow });
    }
}