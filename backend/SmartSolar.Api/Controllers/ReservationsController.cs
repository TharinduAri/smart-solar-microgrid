/*
 * -----------------------------------------------------------------------------
 * File        : ReservationsController.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : REST endpoints for the energy slot reservation workflow, the
 *               dashboard counts and the Grid Operator QR verification step.
 *               All scheduling rules are applied inside ReservationService.
 * -----------------------------------------------------------------------------
 */

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Services;

namespace SmartSolar.Api.Controllers;

[ApiController]
[Route("api/reservations")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;

    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    // A prosumer's own NIC from the login token; null for staff, who can see every booking.
    private string? OwnerNic =>
        User.IsInRole(UserRoles.Prosumer) ? User.FindFirstValue("nic") ?? string.Empty : null;

    // GET /api/reservations?nic=&status=&stationId=&upcoming= - search and history.
    [HttpGet]
    public async Task<ActionResult<List<ReservationResponse>>> Search(
        [FromQuery] string? nic,
        [FromQuery] string? status,
        [FromQuery] string? stationId,
        [FromQuery] bool? upcoming)
    {
        return Ok(await _reservationService.SearchAsync(OwnerNic ?? nic, status, stationId, upcoming));
    }

    // GET /api/reservations/dashboard?nic= - counts for the web and mobile home screens.
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardSummary>> Dashboard([FromQuery] string? nic)
    {
        return Ok(await _reservationService.GetDashboardAsync(OwnerNic ?? nic));
    }

    // GET /api/reservations/{id} - single booking, also used by the summary page.
    [HttpGet("{id}")]
    public async Task<ActionResult<ReservationResponse>> GetById(string id)
    {
        return Ok(await _reservationService.GetByIdAsync(id, OwnerNic));
    }

    // POST /api/reservations - creates a booking inside the 7 day window.
    [HttpPost]
    public async Task<ActionResult<ReservationResponse>> Create(CreateReservationRequest request)
    {
        return Ok(await _reservationService.CreateAsync(request, OwnerNic));
    }

    // PUT /api/reservations/{id} - update needs at least 12 hours notice.
    [HttpPut("{id}")]
    public async Task<ActionResult<ReservationResponse>> Update(string id, UpdateReservationRequest request)
    {
        return Ok(await _reservationService.UpdateAsync(id, request, OwnerNic));
    }

    // PATCH /api/reservations/{id}/cancel - cancellation needs 12 hours notice.
    [HttpPatch("{id}/cancel")]
    public async Task<ActionResult<ReservationResponse>> Cancel(string id)
    {
        return Ok(await _reservationService.CancelAsync(id, OwnerNic));
    }

    // PATCH /api/reservations/{id}/approve - confirms a booking and issues the QR token.
    [HttpPatch("{id}/approve")]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<ActionResult<ReservationResponse>> Approve(string id)
    {
        return Ok(await _reservationService.ApproveAsync(id));
    }

    // POST /api/reservations/verify-qr - operator scans the code and finalises the job.
    [HttpPost("verify-qr")]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<ActionResult<ReservationResponse>> VerifyQr(QrVerificationRequest request)
    {
        var operatorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        return Ok(await _reservationService.CompleteByQrAsync(request, operatorId));
    }
}
