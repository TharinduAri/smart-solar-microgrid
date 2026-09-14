/*
 * -----------------------------------------------------------------------------
 * File        : EnergyReservation.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Document model for the "EnergyReservations" collection. Holds a
 *               power trading booking made by a prosumer together with the QR
 *               payload a Grid Operator scans to finalise the energy transfer.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Api.Models;

public static class ReservationStatus
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}

public class EnergyReservation
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    // NIC of the prosumer who owns this booking (matches User.Nic).
    public string ProsumerNic { get; set; } = string.Empty;

    public string StationId { get; set; } = string.Empty;

    public string SlotId { get; set; } = string.Empty;

    // Copied from the slot so history stays readable after a slot is removed.
    public DateTime ReservationTime { get; set; }

    // Units of energy the prosumer intends to trade during this session.
    public double EnergyKwh { get; set; }

    // One of the values declared in ReservationStatus.
    public string Status { get; set; } = ReservationStatus.Pending;

    // Opaque token embedded in the QR code and verified by the operator.
    public string? QrToken { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    // Id of the Grid Operator who finalised the energy transfer.
    public string? CompletedByUserId { get; set; }
}
