/*
 * -----------------------------------------------------------------------------
 * File        : ExceptionHandlingMiddleware.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Converts exceptions thrown anywhere in the pipeline into a single
 *               JSON error shape { "message": "..." } so that the React web app
 *               and the Android client can display failures consistently.
 * -----------------------------------------------------------------------------
 */

using System.Text.Json;

namespace SmartSolar.Api.Security;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // Runs the rest of the pipeline and writes a JSON body if anything escapes it.
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException ex)
        {
            await WriteErrorAsync(context, ex.StatusCode, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error while processing {Path}", context.Request.Path);
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, "An unexpected server error occurred.");
        }
    }

    // Serialises the error message with the matching HTTP status code.
    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message }));
    }
}
