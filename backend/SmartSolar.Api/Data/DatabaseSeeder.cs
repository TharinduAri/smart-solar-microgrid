/*
 * -----------------------------------------------------------------------------
 * File        : DatabaseSeeder.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Seeds default accounts, microgrid stations, booking slots, and
 *               sample reservations the first time the service starts against
 *               an empty database, fulfilling the sample data requirements for
 *               all four MongoDB collections.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Driver;
using SmartSolar.Api.Models;
using SmartSolar.Api.Security;

namespace SmartSolar.Api.Data;

public static class DatabaseSeeder
{
    // Inserts seed records across Users, SolarStationInfo, EnergyBookingSlots, and EnergyReservations.
    public static async Task SeedAsync(MongoContext context, ILogger logger)
    {
        await SeedUsersAsync(context, logger);
        await SeedStationsAndSlotsAsync(context, logger);
    }

    // Seeds default Backoffice, Grid Operator, and Prosumer accounts.
    private static async Task SeedUsersAsync(MongoContext context, ILogger logger)
    {
        if (await context.Users.CountDocumentsAsync(FilterDefinition<User>.Empty) > 0)
        {
            return;
        }

        var users = new List<User>
        {
            new()
            {
                FullName = "System Backoffice",
                Email = "admin@smartsolar.lk",
                PasswordHash = PasswordHasher.Hash("Admin@123"),
                Role = UserRoles.Backoffice,
                IsActive = true
            },
            new()
            {
                FullName = "Sunil Perera",
                Email = "operator@smartsolar.lk",
                PhoneNumber = "0771234567",
                PasswordHash = PasswordHasher.Hash("Operator@123"),
                Role = UserRoles.GridOperator,
                IsActive = true
            },
            new()
            {
                Id = "198512345678",
                Nic = "198512345678",
                FullName = "Kamal Silva",
                Email = "kamal@solar.lk",
                PhoneNumber = "0712345678",
                Address = "12/4 Galle Road, Colombo 03",
                PasswordHash = PasswordHasher.Hash("Prosumer@123"),
                Role = UserRoles.Prosumer,
                IsActive = true
            },
            new()
            {
                Id = "199087654321",
                Nic = "199087654321",
                FullName = "Nimal Fernando",
                Email = "nimal@solar.lk",
                PhoneNumber = "0789876543",
                Address = "45 Peradeniya Road, Kandy",
                PasswordHash = PasswordHasher.Hash("Prosumer@123"),
                Role = UserRoles.Prosumer,
                IsActive = false // Pending approval by Backoffice
            }
        };

        await context.Users.InsertManyAsync(users);
        logger.LogInformation("Seeded {Count} initial accounts (Backoffice, Operator, Prosumers)", users.Count);
    }

    // Seeds sample microgrid stations, upcoming booking slots, and linked reservations.
    private static async Task SeedStationsAndSlotsAsync(MongoContext context, ILogger logger)
    {
        if (await context.Stations.CountDocumentsAsync(FilterDefinition<SolarStation>.Empty) > 0)
        {
            return;
        }

        var colomboStation = new SolarStation
        {
            Name = "Colombo Central Microgrid Hub",
            Location = "Colombo 03",
            Latitude = 6.9034,
            Longitude = 79.8540,
            CapacityKwh = 120.0,
            TotalSlots = 10,
            IsActive = true
        };

        var kandyStation = new SolarStation
        {
            Name = "Kandy Hill Solar Substation",
            Location = "Kandy City Center",
            Latitude = 7.2906,
            Longitude = 80.6337,
            CapacityKwh = 85.0,
            TotalSlots = 6,
            IsActive = true
        };

        var galleStation = new SolarStation
        {
            Name = "Galle Fort Microgrid Unit",
            Location = "Galle Fort",
            Latitude = 6.0328,
            Longitude = 80.2170,
            CapacityKwh = 50.0,
            TotalSlots = 4,
            IsActive = true
        };

        await context.Stations.InsertManyAsync(new[] { colomboStation, kandyStation, galleStation });
        logger.LogInformation("Seeded 3 microgrid solar hubs");

        // Seed slots for tomorrow and the day after (within 7-day booking window)
        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var dayAfter = DateTime.UtcNow.Date.AddDays(2);

        var slot1 = new EnergyBookingSlot
        {
            StationId = colomboStation.Id,
            StartTime = tomorrow.AddHours(9),
            EndTime = tomorrow.AddHours(12),
            TotalSlots = 5,
            AvailableSlots = 4, // 1 reserved
            IsActive = true
        };

        var slot2 = new EnergyBookingSlot
        {
            StationId = colomboStation.Id,
            StartTime = tomorrow.AddHours(13),
            EndTime = tomorrow.AddHours(16),
            TotalSlots = 5,
            AvailableSlots = 5,
            IsActive = true
        };

        var slot3 = new EnergyBookingSlot
        {
            StationId = kandyStation.Id,
            StartTime = dayAfter.AddHours(10),
            EndTime = dayAfter.AddHours(13),
            TotalSlots = 4,
            AvailableSlots = 4,
            IsActive = true
        };

        await context.Slots.InsertManyAsync(new[] { slot1, slot2, slot3 });
        logger.LogInformation("Seeded 3 energy booking slots");

        // Seed sample reservations for Kamal Silva
        var reservation1 = new EnergyReservation
        {
            ProsumerNic = "198512345678",
            StationId = colomboStation.Id,
            SlotId = slot1.Id,
            ReservationTime = slot1.StartTime,
            EnergyKwh = 15.5,
            Status = ReservationStatus.Approved,
            QrToken = Guid.NewGuid().ToString("N")
        };

        var reservation2 = new EnergyReservation
        {
            ProsumerNic = "198512345678",
            StationId = colomboStation.Id,
            SlotId = slot2.Id,
            ReservationTime = slot2.StartTime,
            EnergyKwh = 10.0,
            Status = ReservationStatus.Pending
        };

        await context.Reservations.InsertManyAsync(new[] { reservation1, reservation2 });
        logger.LogInformation("Seeded 2 initial reservations (Approved with QR, and Pending)");
    }
}
