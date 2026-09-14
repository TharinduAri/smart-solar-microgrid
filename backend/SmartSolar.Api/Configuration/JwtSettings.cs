/*
 * -----------------------------------------------------------------------------
 * File        : JwtSettings.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Strongly typed binding for the "JwtSettings" section of
 *               appsettings.json. Supplies the signing key, issuer, audience and
 *               token lifetime used when a user logs in.
 * -----------------------------------------------------------------------------
 */

namespace SmartSolar.Api.Configuration;

public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "SmartSolarApi";

    public string Audience { get; set; } = "SmartSolarClients";

    public int ExpiryHours { get; set; } = 12;
}
