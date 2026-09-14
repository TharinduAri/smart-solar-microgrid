/*
 * -----------------------------------------------------------------------------
 * File        : UserService.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Business logic for web user management and prosumer profiles -
 *               creating Backoffice / Grid Operator accounts, editing profiles,
 *               deactivation requests and Backoffice-only reactivation.
 * -----------------------------------------------------------------------------
 */

using MongoDB.Driver;
using SmartSolar.Api.Data;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Security;

namespace SmartSolar.Api.Services;

public interface IUserService
{
    Task<UserResponse> CreateWebUserAsync(CreateWebUserRequest request);
    Task<List<UserResponse>> GetUsersAsync(string? role, bool? isActive);
    Task<List<UserResponse>> GetPendingActivationsAsync();
    Task<UserResponse> GetByIdAsync(string id);
    Task<UserResponse> UpdateAsync(string id, UpdateUserRequest request);
    Task<UserResponse> RequestDeactivationAsync(string id);
    Task<UserResponse> SetActiveAsync(string id, bool isActive);
}

public class UserService : IUserService
{
    private readonly MongoContext _context;

    public UserService(MongoContext context)
    {
        _context = context;
    }

    // Creates a Backoffice or Grid Operator account; these are active immediately.
    public async Task<UserResponse> CreateWebUserAsync(CreateWebUserRequest request)
    {
        if (request.Role != UserRoles.Backoffice && request.Role != UserRoles.GridOperator)
        {
            throw new ApiException("Web users must be either Backoffice or GridOperator.");
        }

        if (await _context.Users.Find(u => u.Email == request.Email).AnyAsync())
        {
            throw new ApiException("A user with this email already exists.", StatusCodes.Status409Conflict);
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PhoneNumber = request.PhoneNumber,
            PasswordHash = PasswordHasher.Hash(request.Password),
            Role = request.Role,
            IsActive = true
        };

        await _context.Users.InsertOneAsync(user);
        return ToResponse(user);
    }

    // Lists accounts, optionally narrowed by role and activation state.
    public async Task<List<UserResponse>> GetUsersAsync(string? role, bool? isActive)
    {
        var filter = Builders<User>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(role))
        {
            filter &= Builders<User>.Filter.Eq(u => u.Role, role);
        }

        if (isActive.HasValue)
        {
            filter &= Builders<User>.Filter.Eq(u => u.IsActive, isActive.Value);
        }

        var users = await _context.Users.Find(filter).SortByDescending(u => u.CreatedAt).ToListAsync();
        return users.Select(ToResponse).ToList();
    }

    // Returns prosumers waiting for Backoffice approval, shown on the web app.
    public async Task<List<UserResponse>> GetPendingActivationsAsync()
    {
        var users = await _context.Users
            .Find(u => u.Role == UserRoles.Prosumer && !u.IsActive)
            .SortByDescending(u => u.CreatedAt)
            .ToListAsync();

        return users.Select(ToResponse).ToList();
    }

    // Loads a single account by its id (NIC for prosumers).
    public async Task<UserResponse> GetByIdAsync(string id)
    {
        return ToResponse(await FindOrThrowAsync(id));
    }

    // Updates editable profile fields; role and activation state are untouched.
    public async Task<UserResponse> UpdateAsync(string id, UpdateUserRequest request)
    {
        var user = await FindOrThrowAsync(id);

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.PhoneNumber = request.PhoneNumber;
        user.Address = request.Address;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.Users.ReplaceOneAsync(u => u.Id == id, user);
        return ToResponse(user);
    }

    // A prosumer asks from the mobile app for the account to be deactivated.
    public async Task<UserResponse> RequestDeactivationAsync(string id)
    {
        var user = await FindOrThrowAsync(id);

        if (user.Role != UserRoles.Prosumer)
        {
            throw new ApiException("Only prosumer accounts can request deactivation.");
        }

        user.DeactivationRequested = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.Users.ReplaceOneAsync(u => u.Id == id, user);
        return ToResponse(user);
    }

    // Backoffice approves, deactivates or reactivates an account.
    public async Task<UserResponse> SetActiveAsync(string id, bool isActive)
    {
        var user = await FindOrThrowAsync(id);

        user.IsActive = isActive;
        user.DeactivationRequested = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.Users.ReplaceOneAsync(u => u.Id == id, user);
        return ToResponse(user);
    }

    // Shared lookup that raises a 404 when the account does not exist.
    private async Task<User> FindOrThrowAsync(string id)
    {
        var user = await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        return user ?? throw new ApiException("User not found.", StatusCodes.Status404NotFound);
    }

    // Maps a stored document onto the response shape, hiding the password hash.
    public static UserResponse ToResponse(User user) => new(
        user.Id,
        user.Nic,
        user.FullName,
        user.Email,
        user.PhoneNumber,
        user.Address,
        user.Role,
        user.IsActive,
        user.DeactivationRequested,
        user.CreatedAt);
}
