/*
 * -----------------------------------------------------------------------------
 * File        : StationsController.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : REST endpoints for microgrid node management and for the energy
 *               booking slots attached to each node. Nodes are administered by
 *               Backoffice while Grid Operators maintain the slot availability.
 * -----------------------------------------------------------------------------
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Services;

namespace SmartSolar.Api.Controllers;

[ApiController]
[Route("api/stations")]
[Authorize]
public class StationsController : ControllerBase
{
    private readonly IStationService _stationService;

    public StationsController(IStationService stationService)
    {
        _stationService = stationService;
    }

    // GET /api/stations?isActive=true - also feeds the Google Maps screen on mobile.
    [HttpGet]
    public async Task<ActionResult<List<StationResponse>>> GetAll([FromQuery] bool? isActive)
    {
        return Ok(await _stationService.GetStationsAsync(isActive));
    }

    // GET /api/stations/{id} - details shown when a map marker is selected.
    [HttpGet("{id}")]
    public async Task<ActionResult<StationResponse>> GetById(string id)
    {
        return Ok(await _stationService.GetStationAsync(id));
    }

    // POST /api/stations - registers a new solar grid hub.
    [HttpPost]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Create(StationRequest request)
    {
        return Ok(await _stationService.CreateStationAsync(request));
    }

    // PUT /api/stations/{id} - updates node details and capacity.
    [HttpPut("{id}")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Update(string id, StationRequest request)
    {
        return Ok(await _stationService.UpdateStationAsync(id, request));
    }

    // PATCH /api/stations/{id}/deactivate - blocked when active bookings exist.
    [HttpPatch("{id}/deactivate")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Deactivate(string id)
    {
        return Ok(await _stationService.SetStationActiveAsync(id, false));
    }

    // PATCH /api/stations/{id}/activate - brings a node back into service.
    [HttpPatch("{id}/activate")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Activate(string id)
    {
        return Ok(await _stationService.SetStationActiveAsync(id, true));
    }

    // DELETE /api/stations/{id} - removes a node together with its slots.
    [HttpDelete("{id}")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<IActionResult> Delete(string id)
    {
        await _stationService.DeleteStationAsync(id);
        return NoContent();
    }

    // GET /api/stations/{id}/slots?availableOnly=true - bookable time windows.
    [HttpGet("{id}/slots")]
    public async Task<ActionResult<List<SlotResponse>>> GetSlots(string id, [FromQuery] bool availableOnly = false)
    {
        return Ok(await _stationService.GetSlotsAsync(id, availableOnly));
    }

    // POST /api/stations/{id}/slots - opens a new booking window at the node.
    [HttpPost("{id}/slots")]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<ActionResult<SlotResponse>> CreateSlot(string id, SlotRequest request)
    {
        return Ok(await _stationService.CreateSlotAsync(id, request));
    }

    // PUT /api/stations/slots/{slotId} - adjusts a window or its battery bay count.
    [HttpPut("slots/{slotId}")]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<ActionResult<SlotResponse>> UpdateSlot(string slotId, SlotRequest request)
    {
        return Ok(await _stationService.UpdateSlotAsync(slotId, request));
    }

    // DELETE /api/stations/slots/{slotId} - removes an unused booking window.
    [HttpDelete("slots/{slotId}")]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<IActionResult> DeleteSlot(string slotId)
    {
        await _stationService.DeleteSlotAsync(slotId);
        return NoContent();
    }
}
