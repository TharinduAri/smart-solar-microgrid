/*
 * -----------------------------------------------------------------------------
 * File        : DatabaseSeeder.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Creates the default Backoffice account the first time the service
 *               starts against an empty database, so the web application can be
 *               logged into before any user has been created manually.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Driver;
using SmartSolar.Api.Models;
using SmartSolar.Api.Security;

namespace SmartSolar.Api.Data;

public static class DatabaseSeeder
{
    // Inserts the seed Backoffice user only when the Users collection is empty.
    public static async Task SeedAsync(MongoContext context, ILogger logger)
    {
        if (await context.Users.CountDocumentsAsync(FilterDefinition<User>.Empty) > 0)
        {
            return;
        }

        var admin = new User
        {
            FullName = "System Backoffice",
            Email = "admin@smartsolar.lk",
            PasswordHash = PasswordHasher.Hash("Admin@123"),
            Role = UserRoles.Backoffice,
            IsActive = true
        };

        await context.Users.InsertOneAsync(admin);
        logger.LogInformation("Seeded default Backoffice account {Email}", admin.Email);
    }
}
