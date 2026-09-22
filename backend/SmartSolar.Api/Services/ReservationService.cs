/*
 * -----------------------------------------------------------------------------
 * File        : ReservationService.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Business logic for the energy slot reservation workflow. Enforces
 *               the 7 day booking window and the 12 hour notice period, keeps the
 *               slot availability counters correct, issues the transaction QR
 *               token and verifies it when a Grid Operator finalises a transfer.
 *               Prosumers may only read and change their own reservations.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Driver;
using SmartSolar.Api.Data;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Security;

namespace SmartSolar.Api.Services;

public interface IReservationService
{
    Task<List<ReservationResponse>> SearchAsync(string? nic, string? status, string? stationId, bool? upcoming);
    Task<ReservationResponse> GetByIdAsync(string id, string? ownerNic);
    Task<ReservationResponse> CreateAsync(CreateReservationRequest request, string? ownerNic);
    Task<ReservationResponse> UpdateAsync(string id, UpdateReservationRequest request, string? ownerNic);
    Task<ReservationResponse> CancelAsync(string id, string? ownerNic);
    Task<ReservationResponse> ApproveAsync(string id);
    Task<ReservationResponse> CompleteByQrAsync(QrVerificationRequest request, string operatorUserId);
    Task<DashboardSummary> GetDashboardAsync(string? nic);
}

public class ReservationService : IReservationService
{
    // Bookings may not be placed more than 7 days ahead of the current date.
    private const int MaxBookingWindowDays = 7;

    // Updates and cancellations need at least 12 hours of notice.
    private const int MinNoticeHours = 12;

    private readonly MongoContext _context;

    public ReservationService(MongoContext context)
    {
        _context = context;
    }

    // Returns reservations filtered by prosumer, status, node or upcoming dates.
    public async Task<List<ReservationResponse>> SearchAsync(string? nic, string? status, string? stationId, bool? upcoming)
    {
        var filter = Builders<EnergyReservation>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.ProsumerNic, nic.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.Status, status);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.StationId, stationId);
        }

        if (upcoming.HasValue)
        {
            filter &= upcoming.Value
                ? Builders<EnergyReservation>.Filter.Gte(r => r.ReservationTime, DateTime.UtcNow)
                : Builders<EnergyReservation>.Filter.Lt(r => r.ReservationTime, DateTime.UtcNow);
        }

        var reservations = await _context.Reservations
            .Find(filter)
            .SortByDescending(r => r.ReservationTime)
            .ToListAsync();

        return await ToResponsesAsync(reservations);
    }

    // Loads one reservation with its prosumer and node names resolved.
    public async Task<ReservationResponse> GetByIdAsync(string id, string? ownerNic)
    {
        var reservation = await FindOrThrowAsync(id);
        EnsureOwner(reservation, ownerNic);
        return (await ToResponsesAsync(new List<EnergyReservation> { reservation })).Single();
    }

    // Creates a booking after checking the 7 day window and slot availability.
    public async Task<ReservationResponse> CreateAsync(CreateReservationRequest request, string? ownerNic)
    {
        var nic = request.ProsumerNic.Trim().ToUpperInvariant();

        if (ownerNic is not null && nic != ownerNic)
        {
            throw new ApiException("You can only make reservations for your own account.", StatusCodes.Status403Forbidden);
        }

        var prosumer = await _context.Users.Find(u => u.Id == nic && u.Role == UserRoles.Prosumer).FirstOrDefaultAsync();
        if (prosumer is null || !prosumer.IsActive)
        {
            throw new ApiException("An active prosumer account is required to make a reservation.");
        }

        var station = await _context.Stations.Find(s => s.Id == request.StationId).FirstOrDefaultAsync();
        if (station is null || !station.IsActive)
        {
            throw new ApiException("The selected microgrid node is not available.");
        }

        var slot = await FindSlotOrThrowAsync(request.SlotId);
        EnsureSlotIsBookable(slot, request.StationId);

        var reservation = new EnergyReservation
        {
            ProsumerNic = nic,
            StationId = request.StationId,
            SlotId = slot.Id,
            ReservationTime = slot.StartTime,
            EnergyKwh = request.EnergyKwh,
            Status = ReservationStatus.Pending
        };

        await _context.Reservations.InsertOneAsync(reservation);
        await AdjustSlotAvailabilityAsync(slot.Id, -1);

        return (await ToResponsesAsync(new List<EnergyReservation> { reservation })).Single();
    }

    // Moves a booking to another slot, subject to the 12 hour notice rule.
    public async Task<ReservationResponse> UpdateAsync(string id, UpdateReservationRequest request, string? ownerNic)
    {
        var reservation = await FindOrThrowAsync(id);
        EnsureOwner(reservation, ownerNic);
        EnsureChangeIsAllowed(reservation);

        if (reservation.SlotId != request.SlotId)
        {
            var newSlot = await FindSlotOrThrowAsync(request.SlotId);
            EnsureSlotIsBookable(newSlot, reservation.StationId);

            await AdjustSlotAvailabilityAsync(reservation.SlotId, 1);
            await AdjustSlotAvailabilityAsync(newSlot.Id, -1);

            reservation.SlotId = newSlot.Id;
            reservation.ReservationTime = newSlot.StartTime;
        }

        reservation.EnergyKwh = request.EnergyKwh;
        reservation.UpdatedAt = DateTime.UtcNow;

        await _context.Reservations.ReplaceOneAsync(r => r.Id == id, reservation);
        return (await ToResponsesAsync(new List<EnergyReservation> { reservation })).Single();
    }

    // Cancels a booking, releasing the battery bay back to the slot.
    public async Task<ReservationResponse> CancelAsync(string id, string? ownerNic)
    {
        var reservation = await FindOrThrowAsync(id);
        EnsureOwner(reservation, ownerNic);
        EnsureChangeIsAllowed(reservation);

        reservation.Status = ReservationStatus.Cancelled;
        reservation.QrToken = null;
        reservation.UpdatedAt = DateTime.UtcNow;

        await _context.Reservations.ReplaceOneAsync(r => r.Id == id, reservation);
        await AdjustSlotAvailabilityAsync(reservation.SlotId, 1);

        return (await ToResponsesAsync(new List<EnergyReservation> { reservation })).Single();
    }

    // Approves a pending booking and issues the QR token the operator will scan.
    public async Task<ReservationResponse> ApproveAsync(string id)
    {
        var reservation = await FindOrThrowAsync(id);

        if (reservation.Status != ReservationStatus.Pending)
        {
            throw new ApiException($"Only pending reservations can be approved (current status: {reservation.Status}).");
        }

        reservation.Status = ReservationStatus.Approved;
        reservation.QrToken = Guid.NewGuid().ToString("N");
        reservation.UpdatedAt = DateTime.UtcNow;

        await _context.Reservations.ReplaceOneAsync(r => r.Id == id, reservation);
        return (await ToResponsesAsync(new List<EnergyReservation> { reservation })).Single();
    }

    // Verifies a scanned QR token against the server and finalises the transfer.
    public async Task<ReservationResponse> CompleteByQrAsync(QrVerificationRequest request, string operatorUserId)
    {
        var reservation = await FindOrThrowAsync(request.ReservationId);

        if (reservation.Status != ReservationStatus.Approved || reservation.QrToken != request.QrToken)
        {
            throw new ApiException("This QR code is not valid for an approved reservation.");
        }

        reservation.Status = ReservationStatus.Completed;
        reservation.CompletedAt = DateTime.UtcNow;
        reservation.CompletedByUserId = operatorUserId;
        reservation.UpdatedAt = DateTime.UtcNow;

        await _context.Reservations.ReplaceOneAsync(r => r.Id == reservation.Id, reservation);
        await AdjustSlotAvailabilityAsync(reservation.SlotId, 1);

        return (await ToResponsesAsync(new List<EnergyReservation> { reservation })).Single();
    }

    // Builds the dashboard counts, scoped to one prosumer when a NIC is supplied.
    public async Task<DashboardSummary> GetDashboardAsync(string? nic)
    {
        var scope = string.IsNullOrWhiteSpace(nic)
            ? Builders<EnergyReservation>.Filter.Empty
            : Builders<EnergyReservation>.Filter.Eq(r => r.ProsumerNic, nic.Trim().ToUpperInvariant());

        var pending = await _context.Reservations.CountDocumentsAsync(
            scope & Builders<EnergyReservation>.Filter.Eq(r => r.Status, ReservationStatus.Pending));

        var approvedFuture = await _context.Reservations.CountDocumentsAsync(
            scope
            & Builders<EnergyReservation>.Filter.Eq(r => r.Status, ReservationStatus.Approved)
            & Builders<EnergyReservation>.Filter.Gte(r => r.ReservationTime, DateTime.UtcNow));

        var completed = await _context.Reservations.CountDocumentsAsync(
            scope & Builders<EnergyReservation>.Filter.Eq(r => r.Status, ReservationStatus.Completed));

        var activeStations = await _context.Stations.CountDocumentsAsync(s => s.IsActive);

        return new DashboardSummary(pending, approvedFuture, completed, activeStations);
    }

    // Applies the 7 day window, availability and station match rules to a slot.
    private static void EnsureSlotIsBookable(EnergyBookingSlot slot, string stationId)
    {
        if (slot.StationId != stationId)
        {
            throw new ApiException("The selected slot does not belong to the selected microgrid node.");
        }

        if (!slot.IsActive || slot.AvailableSlots <= 0)
        {
            throw new ApiException("No battery storage slot is available in this time window.");
        }

        if (slot.StartTime <= DateTime.UtcNow)
        {
            throw new ApiException("The selected time window has already started.");
        }

        if (slot.StartTime > DateTime.UtcNow.AddDays(MaxBookingWindowDays))
        {
            throw new ApiException($"Reservations can only be made within {MaxBookingWindowDays} days from today.");
        }
    }

    // Stops a prosumer from reading or changing another prosumer's booking (staff pass null).
    private static void EnsureOwner(EnergyReservation reservation, string? ownerNic)
    {
        if (ownerNic is not null && reservation.ProsumerNic != ownerNic)
        {
            throw new ApiException("You can only access your own reservations.", StatusCodes.Status403Forbidden);
        }
    }

    // Applies the 12 hour notice rule before an update or a cancellation.
    private static void EnsureChangeIsAllowed(EnergyReservation reservation)
    {
        if (reservation.Status is ReservationStatus.Cancelled or ReservationStatus.Completed)
        {
            throw new ApiException($"A {reservation.Status.ToLowerInvariant()} reservation can no longer be changed.");
        }

        if (reservation.ReservationTime <= DateTime.UtcNow.AddHours(MinNoticeHours))
        {
            throw new ApiException($"Changes require at least {MinNoticeHours} hours notice before the reservation time.");
        }
    }

    // Adds or releases one battery bay on a slot without dropping below zero.
    private async Task AdjustSlotAvailabilityAsync(string slotId, int delta)
    {
        var slot = await _context.Slots.Find(s => s.Id == slotId).FirstOrDefaultAsync();
        if (slot is null)
        {
            return;
        }

        var updated = Math.Clamp(slot.AvailableSlots + delta, 0, slot.TotalSlots);
        await _context.Slots.UpdateOneAsync(
            s => s.Id == slotId,
            Builders<EnergyBookingSlot>.Update.Set(s => s.AvailableSlots, updated));
    }

    // Shared lookup that raises a 404 when the reservation does not exist.
    private async Task<EnergyReservation> FindOrThrowAsync(string id)
    {
        var reservation = await _context.Reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
        return reservation ?? throw new ApiException("Reservation not found.", StatusCodes.Status404NotFound);
    }

    // Shared slot lookup that raises a 404 when the slot does not exist.
    private async Task<EnergyBookingSlot> FindSlotOrThrowAsync(string id)
    {
        var slot = await _context.Slots.Find(s => s.Id == id).FirstOrDefaultAsync();
        return slot ?? throw new ApiException("Energy booking slot not found.", StatusCodes.Status404NotFound);
    }

    // Resolves prosumer and node names in one pass so clients get readable rows.
    private async Task<List<ReservationResponse>> ToResponsesAsync(List<EnergyReservation> reservations)
    {
        if (reservations.Count == 0)
        {
            return new List<ReservationResponse>();
        }

        var nics = reservations.Select(r => r.ProsumerNic).Distinct().ToList();
        var stationIds = reservations.Select(r => r.StationId).Distinct().ToList();

        var prosumers = await _context.Users.Find(u => nics.Contains(u.Id)).ToListAsync();
        var stations = await _context.Stations.Find(s => stationIds.Contains(s.Id)).ToListAsync();

        return reservations.Select(r => new ReservationResponse(
            r.Id,
            r.ProsumerNic,
            prosumers.FirstOrDefault(p => p.Id == r.ProsumerNic)?.FullName ?? "Unknown prosumer",
            r.StationId,
            stations.FirstOrDefault(s => s.Id == r.StationId)?.Name ?? "Unknown node",
            r.SlotId,
            r.ReservationTime,
            r.EnergyKwh,
            r.Status,
            r.QrToken,
            r.CreatedAt)).ToList();
    }
}
