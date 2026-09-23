/*
 * -----------------------------------------------------------------------------
 * File        : Program.cs
 * Project     : Smart Solar Microgrid Trading System - Web Service
 * Description : Application entry point. Binds configuration, registers the
 *               MongoDB context and the business services, configures JWT bearer
 *               authentication and CORS, and builds the HTTP pipeline that is
 *               published to Windows IIS.
 * -----------------------------------------------------------------------------
 */

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SmartSolar.Api.Configuration;
using SmartSolar.Api.Data;
using SmartSolar.Api.Security;
using SmartSolar.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Bind the MongoDB and JWT sections of appsettings.json to typed options.
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDbSettings"));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));

// One shared MongoDB connection pool for the whole service.
builder.Services.AddSingleton<MongoContext>();

// All business logic lives in these services (FAT service pattern).
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IStationService, StationService>();
builder.Services.AddScoped<IReservationService, ReservationService>();

// Validate every incoming JWT against the configured signing key.
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>() ?? new JwtSettings();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// Allow the React development server and the Android emulator to call the API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("SmartSolarClients", policy => policy
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Swagger UI with a bearer token field, used to test the API during development.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Smart Solar Microgrid Trading API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the token returned by /api/auth/login."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Translate business rule failures into a consistent JSON error response.
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

// HttpURLConnection on Android cannot issue PATCH, so honour X-Http-Method-Override.
// Routing must run after the override, otherwise the request is matched as a POST.
app.UseHttpMethodOverride();
app.UseRouting();

app.UseCors("SmartSolarClients");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Simple health probe used to confirm the IIS deployment is reachable.
app.MapGet("/", () => Results.Ok(new { service = "Smart Solar Microgrid Trading API", status = "Running" }));

// Create the default Backoffice login the first time the service starts.
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<MongoContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await DatabaseSeeder.SeedAsync(context, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Could not seed the database. Check the MongoDB connection string.");
    }
}

app.Run();
