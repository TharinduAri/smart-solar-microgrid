/*
 * -----------------------------------------------------------------------------
 * File        : ReservationDtos.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Request and response contracts for the energy slot reservation
 *               workflow, the operator QR verification step and the dashboard
 *               counts shown by both clients.
 * -----------------------------------------------------------------------------
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Api.Dtos;

// Create a new power trading booking.
public record CreateReservationRequest(
    [Required] string ProsumerNic,
    [Required] string StationId,
    [Required] string SlotId,
    [Range(0.1, double.MaxValue)] double EnergyKwh);

// Move an existing booking to a different slot or change the traded energy.
public record UpdateReservationRequest(
    [Required] string SlotId,
    [Range(0.1, double.MaxValue)] double EnergyKwh);

public record ReservationResponse(
    string Id,
    string ProsumerNic,
    string ProsumerName,
    string StationId,
    string StationName,
    string SlotId,
    DateTime ReservationTime,
    double EnergyKwh,
    string Status,
    string? QrToken,
    DateTime CreatedAt);

// Payload scanned from the prosumer QR code by a Grid Operator.
public record QrVerificationRequest(
    [Required] string ReservationId,
    [Required] string QrToken);

// Counts rendered on the web and mobile dashboards.
public record DashboardSummary(
    long PendingReservations,
    long ApprovedFutureReservations,
    long CompletedReservations,
    long ActiveStations);
