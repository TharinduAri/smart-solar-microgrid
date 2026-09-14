/*
 * -----------------------------------------------------------------------------
 * File        : AuthDtos.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Request and response contracts for the authentication endpoints
 *               shared by the React web application and the Android client.
 * -----------------------------------------------------------------------------
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Api.Dtos;

// Sent by both clients on the login screen.
public record LoginRequest(
    [Required] string Username,
    [Required] string Password);

// Returned after a successful login - the clients store the token and role.
public record LoginResponse(
    string Token,
    string UserId,
    string FullName,
    string Role,
    string? Nic,
    DateTime ExpiresAt);

// Self-registration from the Android app, keyed on the NIC number.
public record ProsumerRegistrationRequest(
    [Required] string Nic,
    [Required] string FullName,
    [Required][EmailAddress] string Email,
    string? PhoneNumber,
    string? Address,
    [Required][MinLength(6)] string Password);
