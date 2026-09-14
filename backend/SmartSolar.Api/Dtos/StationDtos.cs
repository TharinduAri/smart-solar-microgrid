/*
 * -----------------------------------------------------------------------------
 * File        : StationDtos.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Request and response contracts for microgrid node management and
 *               for the energy booking slots that belong to each node.
 * -----------------------------------------------------------------------------
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Api.Dtos;

// Create or update a microgrid node from the web application.
public record StationRequest(
    [Required] string Name,
    [Required] string Location,
    [Range(-90, 90)] double Latitude,
    [Range(-180, 180)] double Longitude,
    [Range(0.1, double.MaxValue)] double CapacityKwh,
    [Range(1, 500)] int TotalSlots);

public record StationResponse(
    string Id,
    string Name,
    string Location,
    double Latitude,
    double Longitude,
    double CapacityKwh,
    int TotalSlots,
    bool IsActive);

// Create or update a bookable time window at one station.
public record SlotRequest(
    [Required] DateTime StartTime,
    [Required] DateTime EndTime,
    [Range(1, 500)] int TotalSlots);

public record SlotResponse(
    string Id,
    string StationId,
    DateTime StartTime,
    DateTime EndTime,
    int TotalSlots,
    int AvailableSlots,
    bool IsActive);
