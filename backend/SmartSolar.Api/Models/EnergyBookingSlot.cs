/*
 * -----------------------------------------------------------------------------
 * File        : EnergyBookingSlot.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Document model for the "EnergyBookingSlots" collection. A slot is
 *               a bookable time window at one solar station. Grid Operators keep
 *               the available battery-slot count on these documents up to date.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Api.Models;

public class EnergyBookingSlot
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    // Reference to SolarStation.Id - keeps the two collections linked.
    public string StationId { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    // Battery bays offered in this time window.
    public int TotalSlots { get; set; }

    // Decremented when a reservation is made, restored when one is cancelled.
    public int AvailableSlots { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
