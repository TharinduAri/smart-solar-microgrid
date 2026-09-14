/*
 * -----------------------------------------------------------------------------
 * File        : AuthController.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : REST endpoints for logging in and for prosumer self-registration.
 *               The controller only validates the model and delegates every rule
 *               to AuthService, keeping the FAT service pattern intact.
 * -----------------------------------------------------------------------------
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Services;

namespace SmartSolar.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST /api/auth/login - used by both the web app and the Android app.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        return Ok(await _authService.LoginAsync(request));
    }

    // POST /api/auth/register - prosumer signs up from the mobile app using a NIC.
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Register(ProsumerRegistrationRequest request)
    {
        return Ok(await _authService.RegisterProsumerAsync(request));
    }
}
