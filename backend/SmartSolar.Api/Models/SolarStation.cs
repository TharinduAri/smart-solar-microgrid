/*
 * -----------------------------------------------------------------------------
 * File        : SolarStation.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Document model for the "SolarStationInfo" collection. Represents
 *               a microgrid node (solar grid hub) with its GPS position, energy
 *               capacity and the number of battery storage slots it offers.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Api.Models;

public class SolarStation
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Name { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    // GPS position used by the Google Maps screen in the Android application.
    public double Latitude { get; set; }

    public double Longitude { get; set; }

    // Rated throughput of the node in kilowatt-hours.
    public double CapacityKwh { get; set; }

    // Physical battery storage bays available at this node.
    public int TotalSlots { get; set; }

    // Deactivation is blocked while active reservations exist for this node.
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
