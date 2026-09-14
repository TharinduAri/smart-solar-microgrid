/*
 * -----------------------------------------------------------------------------
 * File        : User.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Document model for the "Users" collection. One collection holds
 *               every account in the system. Backoffice and Grid Operator users
 *               are given a generated ObjectId, while Prosumer accounts use the
 *               National Identity Card (NIC) number as the primary key.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolar.Api.Models;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    // Only populated for Prosumer accounts, where it is also used as the Id.
    public string? Nic { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    // PBKDF2 hash stored as "iterations.salt.hash" - see Security/PasswordHasher.
    public string PasswordHash { get; set; } = string.Empty;

    // One of the values declared in UserRoles.
    public string Role { get; set; } = UserRoles.Prosumer;

    // False for a self-registered prosumer until Backoffice approves the account,
    // and false again once the account has been deactivated.
    public bool IsActive { get; set; }

    // Raised by the prosumer from the mobile app, cleared by a Backoffice officer.
    public bool DeactivationRequested { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
