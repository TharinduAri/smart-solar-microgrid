/*
 * -----------------------------------------------------------------------------
 * File        : StationService.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Business logic for microgrid node management and the energy
 *               booking slots attached to each node. Enforces the rule that a
 *               node cannot be deactivated while active reservations exist.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Driver;
using SmartSolar.Api.Data;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Security;

namespace SmartSolar.Api.Services;

public interface IStationService
{
    Task<List<StationResponse>> GetStationsAsync(bool? isActive);
    Task<StationResponse> GetStationAsync(string id);
    Task<StationResponse> CreateStationAsync(StationRequest request);
    Task<StationResponse> UpdateStationAsync(string id, StationRequest request);
    Task<StationResponse> SetStationActiveAsync(string id, bool isActive);
    Task DeleteStationAsync(string id);
    Task<List<SlotResponse>> GetSlotsAsync(string stationId, bool availableOnly);
    Task<SlotResponse> CreateSlotAsync(string stationId, SlotRequest request);
    Task<SlotResponse> UpdateSlotAsync(string slotId, SlotRequest request);
    Task DeleteSlotAsync(string slotId);
}

public class StationService : IStationService
{
    private readonly MongoContext _context;

    public StationService(MongoContext context)
    {
        _context = context;
    }

    // Lists microgrid nodes, optionally only the active ones for the mobile map.
    public async Task<List<StationResponse>> GetStationsAsync(bool? isActive)
    {
        var filter = isActive.HasValue
            ? Builders<SolarStation>.Filter.Eq(s => s.IsActive, isActive.Value)
            : Builders<SolarStation>.Filter.Empty;

        var stations = await _context.Stations.Find(filter).SortBy(s => s.Name).ToListAsync();
        return stations.Select(ToResponse).ToList();
    }

    // Loads one microgrid node by id.
    public async Task<StationResponse> GetStationAsync(string id)
    {
        return ToResponse(await FindStationOrThrowAsync(id));
    }

    // Registers a new solar grid hub with its GPS position and capacity.
    public async Task<StationResponse> CreateStationAsync(StationRequest request)
    {
        var station = new SolarStation
        {
            Name = request.Name.Trim(),
            Location = request.Location.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CapacityKwh = request.CapacityKwh,
            TotalSlots = request.TotalSlots
        };

        await _context.Stations.InsertOneAsync(station);
        return ToResponse(station);
    }

    // Updates the details and schedule capacity of an existing node.
    public async Task<StationResponse> UpdateStationAsync(string id, StationRequest request)
    {
        var station = await FindStationOrThrowAsync(id);

        station.Name = request.Name.Trim();
        station.Location = request.Location.Trim();
        station.Latitude = request.Latitude;
        station.Longitude = request.Longitude;
        station.CapacityKwh = request.CapacityKwh;
        station.TotalSlots = request.TotalSlots;
        station.UpdatedAt = DateTime.UtcNow;

        await _context.Stations.ReplaceOneAsync(s => s.Id == id, station);
        return ToResponse(station);
    }

    // Activates or deactivates a node - deactivation needs zero active bookings.
    public async Task<StationResponse> SetStationActiveAsync(string id, bool isActive)
    {
        var station = await FindStationOrThrowAsync(id);

        if (!isActive && await HasActiveReservationsAsync(id))
        {
            throw new ApiException("This node cannot be deactivated while active energy reservations exist.");
        }

        station.IsActive = isActive;
        station.UpdatedAt = DateTime.UtcNow;

        await _context.Stations.ReplaceOneAsync(s => s.Id == id, station);
        return ToResponse(station);
    }

    // Removes a node and its slots once no active reservation depends on it.
    public async Task DeleteStationAsync(string id)
    {
        await FindStationOrThrowAsync(id);

        if (await HasActiveReservationsAsync(id))
        {
            throw new ApiException("This node cannot be deleted while active energy reservations exist.");
        }

        await _context.Slots.DeleteManyAsync(s => s.StationId == id);
        await _context.Stations.DeleteOneAsync(s => s.Id == id);
    }

    // Lists the booking windows of a node, optionally only those still bookable.
    public async Task<List<SlotResponse>> GetSlotsAsync(string stationId, bool availableOnly)
    {
        var filter = Builders<EnergyBookingSlot>.Filter.Eq(s => s.StationId, stationId);

        if (availableOnly)
        {
            filter &= Builders<EnergyBookingSlot>.Filter.Eq(s => s.IsActive, true)
                      & Builders<EnergyBookingSlot>.Filter.Gt(s => s.AvailableSlots, 0)
                      & Builders<EnergyBookingSlot>.Filter.Gt(s => s.StartTime, DateTime.UtcNow);
        }

        var slots = await _context.Slots.Find(filter).SortBy(s => s.StartTime).ToListAsync();
        return slots.Select(ToResponse).ToList();
    }

    // Opens a new bookable time window at a node.
    public async Task<SlotResponse> CreateSlotAsync(string stationId, SlotRequest request)
    {
        var station = await FindStationOrThrowAsync(stationId);
        ValidateSlotWindow(request, station);

        var slot = new EnergyBookingSlot
        {
            StationId = stationId,
            StartTime = request.StartTime.ToUniversalTime(),
            EndTime = request.EndTime.ToUniversalTime(),
            TotalSlots = request.TotalSlots,
            AvailableSlots = request.TotalSlots
        };

        await _context.Slots.InsertOneAsync(slot);
        return ToResponse(slot);
    }

    // Adjusts a slot, keeping the already reserved bays accounted for.
    public async Task<SlotResponse> UpdateSlotAsync(string slotId, SlotRequest request)
    {
        var slot = await FindSlotOrThrowAsync(slotId);
        var station = await FindStationOrThrowAsync(slot.StationId);
        ValidateSlotWindow(request, station);

        var reserved = slot.TotalSlots - slot.AvailableSlots;
        if (request.TotalSlots < reserved)
        {
            throw new ApiException($"This slot already has {reserved} reservation(s) and cannot be reduced below that.");
        }

        slot.StartTime = request.StartTime.ToUniversalTime();
        slot.EndTime = request.EndTime.ToUniversalTime();
        slot.TotalSlots = request.TotalSlots;
        slot.AvailableSlots = request.TotalSlots - reserved;

        await _context.Slots.ReplaceOneAsync(s => s.Id == slotId, slot);
        return ToResponse(slot);
    }

    // Deletes a booking window that no active reservation is using.
    public async Task DeleteSlotAsync(string slotId)
    {
        var slot = await FindSlotOrThrowAsync(slotId);

        var inUse = await _context.Reservations
            .Find(r => r.SlotId == slotId &&
                       (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved))
            .AnyAsync();

        if (inUse)
        {
            throw new ApiException("This slot cannot be deleted while reservations are held against it.");
        }

        await _context.Slots.DeleteOneAsync(s => s.Id == slot.Id);
    }

    // Checks whether any pending or approved reservation belongs to a node.
    private async Task<bool> HasActiveReservationsAsync(string stationId)
    {
        return await _context.Reservations
            .Find(r => r.StationId == stationId &&
                       (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved))
            .AnyAsync();
    }

    // Rejects a slot whose window is inverted or exceeds the node capacity.
    private static void ValidateSlotWindow(SlotRequest request, SolarStation station)
    {
        if (request.EndTime <= request.StartTime)
        {
            throw new ApiException("The slot end time must be after the start time.");
        }

        if (request.TotalSlots > station.TotalSlots)
        {
            throw new ApiException($"This node only has {station.TotalSlots} battery storage slot(s).");
        }
    }

    // Shared node lookup that raises a 404 when the node does not exist.
    private async Task<SolarStation> FindStationOrThrowAsync(string id)
    {
        var station = await _context.Stations.Find(s => s.Id == id).FirstOrDefaultAsync();
        return station ?? throw new ApiException("Microgrid node not found.", StatusCodes.Status404NotFound);
    }

    // Shared slot lookup that raises a 404 when the slot does not exist.
    private async Task<EnergyBookingSlot> FindSlotOrThrowAsync(string id)
    {
        var slot = await _context.Slots.Find(s => s.Id == id).FirstOrDefaultAsync();
        return slot ?? throw new ApiException("Energy booking slot not found.", StatusCodes.Status404NotFound);
    }

    // Maps a stored node document onto its response shape.
    private static StationResponse ToResponse(SolarStation station) => new(
        station.Id,
        station.Name,
        station.Location,
        station.Latitude,
        station.Longitude,
        station.CapacityKwh,
        station.TotalSlots,
        station.IsActive);

    // Maps a stored slot document onto its response shape.
    private static SlotResponse ToResponse(EnergyBookingSlot slot) => new(
        slot.Id,
        slot.StationId,
        slot.StartTime,
        slot.EndTime,
        slot.TotalSlots,
        slot.AvailableSlots,
        slot.IsActive);
}
