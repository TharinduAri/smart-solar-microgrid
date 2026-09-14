/*
 * -----------------------------------------------------------------------------
 * File        : MongoDbSettings.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Strongly typed binding for the "MongoDbSettings" section of
 *               appsettings.json. Holds the connection string, database name and
 *               the names of the four collections used by the system.
 * -----------------------------------------------------------------------------
 */

namespace SmartSolar.Api.Configuration;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = string.Empty;

    public string DatabaseName { get; set; } = string.Empty;

    public string UsersCollection { get; set; } = "Users";

    public string StationsCollection { get; set; } = "SolarStationInfo";

    public string SlotsCollection { get; set; } = "EnergyBookingSlots";

    public string ReservationsCollection { get; set; } = "EnergyReservations";
}
