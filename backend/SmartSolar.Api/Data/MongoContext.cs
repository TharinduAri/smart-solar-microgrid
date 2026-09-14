/*
 * -----------------------------------------------------------------------------
 * File        : MongoContext.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Single point of access to the MongoDB database. Registered as a
 *               singleton so the driver connection pool is shared by every
 *               service, and exposes one typed collection per document model.
 * -----------------------------------------------------------------------------
 */

using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartSolar.Api.Configuration;
using SmartSolar.Api.Models;

namespace SmartSolar.Api.Data;

public class MongoContext
{
    private readonly IMongoDatabase _database;
    private readonly MongoDbSettings _settings;

    // Opens the MongoDB client once using the configured connection string.
    public MongoContext(IOptions<MongoDbSettings> options)
    {
        _settings = options.Value;
        var client = new MongoClient(_settings.ConnectionString);
        _database = client.GetDatabase(_settings.DatabaseName);
    }

    // Every account in the system - Backoffice, Grid Operator and Prosumer.
    public IMongoCollection<User> Users =>
        _database.GetCollection<User>(_settings.UsersCollection);

    // Microgrid nodes with their GPS position and capacity.
    public IMongoCollection<SolarStation> Stations =>
        _database.GetCollection<SolarStation>(_settings.StationsCollection);

    // Bookable time windows belonging to a station.
    public IMongoCollection<EnergyBookingSlot> Slots =>
        _database.GetCollection<EnergyBookingSlot>(_settings.SlotsCollection);

    // Power trading bookings made by prosumers.
    public IMongoCollection<EnergyReservation> Reservations =>
        _database.GetCollection<EnergyReservation>(_settings.ReservationsCollection);
}
