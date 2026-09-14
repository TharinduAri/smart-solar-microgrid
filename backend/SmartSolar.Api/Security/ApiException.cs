/*
 * -----------------------------------------------------------------------------
 * File        : ApiException.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Exception type used by the service layer to report a broken
 *               business rule together with the HTTP status code the client
 *               should receive. Translated into a JSON response by Program.cs.
 * -----------------------------------------------------------------------------
 */

namespace SmartSolar.Api.Security;

public class ApiException : Exception
{
    public int StatusCode { get; }

    // Creates a business rule failure, defaulting to HTTP 400 Bad Request.
    public ApiException(string message, int statusCode = StatusCodes.Status400BadRequest)
        : base(message)
    {
        StatusCode = statusCode;
    }
}
