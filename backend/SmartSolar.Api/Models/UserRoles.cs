/*
 * -----------------------------------------------------------------------------
 * File        : UserRoles.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Central definition of the three user roles supported by the
 *               system. Kept as string constants (not an enum) so the values can
 *               be written straight into MongoDB documents and JWT role claims.
 * -----------------------------------------------------------------------------
 */

namespace SmartSolar.Api.Models;

public static class UserRoles
{
    // Full system administration rights - manages users, stations and re-activations.
    public const string Backoffice = "Backoffice";

    // Operational rights - manages slots, monitors bookings, scans QR codes.
    public const string GridOperator = "GridOperator";

    // Solar panel owner - registers from the mobile app and books energy slots.
    public const string Prosumer = "Prosumer";
}
