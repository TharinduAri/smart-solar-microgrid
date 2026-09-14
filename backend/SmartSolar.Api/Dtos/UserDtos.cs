/*
 * -----------------------------------------------------------------------------
 * File        : UserDtos.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Request and response contracts for web user management and
 *               prosumer profile management. The response type deliberately
 *               leaves out the password hash.
 * -----------------------------------------------------------------------------
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolar.Api.Dtos;

// Backoffice creates a Backoffice or Grid Operator account from the web app.
public record CreateWebUserRequest(
    [Required] string FullName,
    [Required][EmailAddress] string Email,
    string? PhoneNumber,
    [Required] string Role,
    [Required][MinLength(6)] string Password);

// Profile edit, used by Backoffice on the web and by prosumers on mobile.
public record UpdateUserRequest(
    [Required] string FullName,
    [Required][EmailAddress] string Email,
    string? PhoneNumber,
    string? Address);

// Safe projection of a User document for any client.
public record UserResponse(
    string Id,
    string? Nic,
    string FullName,
    string Email,
    string? PhoneNumber,
    string? Address,
    string Role,
    bool IsActive,
    bool DeactivationRequested,
    DateTime CreatedAt);
