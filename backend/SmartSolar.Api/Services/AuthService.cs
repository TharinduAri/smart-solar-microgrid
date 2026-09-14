/*
 * -----------------------------------------------------------------------------
 * File        : AuthService.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Authentication business logic. Validates credentials, blocks
 *               inactive accounts, issues JWT bearer tokens carrying the user
 *               role, and handles prosumer self-registration from the mobile app.
 * -----------------------------------------------------------------------------
 */

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SmartSolar.Api.Configuration;
using SmartSolar.Api.Data;
using SmartSolar.Api.Dtos;
using SmartSolar.Api.Models;
using SmartSolar.Api.Security;

namespace SmartSolar.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<UserResponse> RegisterProsumerAsync(ProsumerRegistrationRequest request);
}

public class AuthService : IAuthService
{
    private readonly MongoContext _context;
    private readonly JwtSettings _jwt;

    public AuthService(MongoContext context, IOptions<JwtSettings> jwtOptions)
    {
        _context = context;
        _jwt = jwtOptions.Value;
    }

    // Authenticates by email or NIC, rejects deactivated accounts and returns a token.
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var username = request.Username.Trim();
        var user = await _context.Users
            .Find(u => u.Email == username || u.Nic == username)
            .FirstOrDefaultAsync();

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new ApiException("Invalid username or password.", StatusCodes.Status401Unauthorized);
        }

        if (!user.IsActive)
        {
            throw new ApiException(
                "This account is not active. Please contact a Backoffice officer.",
                StatusCodes.Status403Forbidden);
        }

        var expiresAt = DateTime.UtcNow.AddHours(_jwt.ExpiryHours);
        return new LoginResponse(BuildToken(user, expiresAt), user.Id, user.FullName, user.Role, user.Nic, expiresAt);
    }

    // Registers a prosumer with the NIC as primary key; the account starts inactive.
    public async Task<UserResponse> RegisterProsumerAsync(ProsumerRegistrationRequest request)
    {
        var nic = request.Nic.Trim().ToUpperInvariant();

        var duplicate = await _context.Users.Find(u => u.Id == nic || u.Email == request.Email).AnyAsync();
        if (duplicate)
        {
            throw new ApiException("An account with this NIC or email already exists.", StatusCodes.Status409Conflict);
        }

        var user = new User
        {
            Id = nic,
            Nic = nic,
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PhoneNumber = request.PhoneNumber,
            Address = request.Address,
            PasswordHash = PasswordHasher.Hash(request.Password),
            Role = UserRoles.Prosumer,
            IsActive = false
        };

        await _context.Users.InsertOneAsync(user);
        return UserService.ToResponse(user);
    }

    // Builds a signed JWT holding the user id, role and NIC claims.
    private string BuildToken(User user, DateTime expiresAt)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role)
        };

        if (!string.IsNullOrWhiteSpace(user.Nic))
        {
            claims.Add(new Claim("nic", user.Nic));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SecretKey));
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
