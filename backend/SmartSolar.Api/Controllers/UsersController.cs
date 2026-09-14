/*
 * -----------------------------------------------------------------------------
 * File        : UsersController.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : REST endpoints for web user management and prosumer profiles.
 *               Role based access is applied here with [Authorize] attributes so
 *               only Backoffice officers reach the administration operations.
 * -----------------------------------------------------------------------------
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Services;

namespace SmartSolar.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // GET /api/users?role=&isActive= - listing for the web administration screens.
    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<ActionResult<List<UserResponse>>> GetAll([FromQuery] string? role, [FromQuery] bool? isActive)
    {
        return Ok(await _userService.GetUsersAsync(role, isActive));
    }

    // GET /api/users/pending-activations - prosumers waiting for approval.
    [HttpGet("pending-activations")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<List<UserResponse>>> GetPendingActivations()
    {
        return Ok(await _userService.GetPendingActivationsAsync());
    }

    // GET /api/users/{id} - id is the NIC for a prosumer account.
    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponse>> GetById(string id)
    {
        return Ok(await _userService.GetByIdAsync(id));
    }

    // POST /api/users - Backoffice creates a Backoffice or Grid Operator account.
    [HttpPost]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<UserResponse>> Create(CreateWebUserRequest request)
    {
        return Ok(await _userService.CreateWebUserAsync(request));
    }

    // PUT /api/users/{id} - edits profile details from the web or mobile client.
    [HttpPut("{id}")]
    public async Task<ActionResult<UserResponse>> Update(string id, UpdateUserRequest request)
    {
        return Ok(await _userService.UpdateAsync(id, request));
    }

    // PATCH /api/users/{id}/request-deactivation - raised by the prosumer on mobile.
    [HttpPatch("{id}/request-deactivation")]
    public async Task<ActionResult<UserResponse>> RequestDeactivation(string id)
    {
        return Ok(await _userService.RequestDeactivationAsync(id));
    }

    // PATCH /api/users/{id}/activate - reactivation is Backoffice only.
    [HttpPatch("{id}/activate")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<UserResponse>> Activate(string id)
    {
        return Ok(await _userService.SetActiveAsync(id, true));
    }

    // PATCH /api/users/{id}/deactivate - Backoffice closes an account.
    [HttpPatch("{id}/deactivate")]
    [Authorize(Roles = UserRoles.Backoffice)]
    public async Task<ActionResult<UserResponse>> Deactivate(string id)
    {
        return Ok(await _userService.SetActiveAsync(id, false));
    }
}
