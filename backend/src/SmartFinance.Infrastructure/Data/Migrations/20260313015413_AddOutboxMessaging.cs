using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOutboxMessaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RoutingKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AggregateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AvailableAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Pending"),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcessedIntegrationEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Consumer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EventType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ProcessedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessedIntegrationEvents", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(6991), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(6992) });

            migrationBuilder.UpdateData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000002"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(6995), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(6996) });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111001"),
                columns: new[] { "CreatedAt", "UpdatedAt", "UserId" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7002), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7002), null });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111002"),
                columns: new[] { "CreatedAt", "UpdatedAt", "UserId" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7005), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7006), null });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111003"),
                columns: new[] { "CreatedAt", "UpdatedAt", "UserId" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7009), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7010), null });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111004"),
                columns: new[] { "CreatedAt", "UpdatedAt", "UserId" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7024), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7025), null });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111005"),
                columns: new[] { "CreatedAt", "UpdatedAt", "UserId" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7028), new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(7029), null });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("244aaa4d-8b07-4e4d-89f9-09281b73b24f"),
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(6981), "NirLg8WLHCBtY/Bxyq2li7B2TbiBNBuhxw8Fqg/mfFET5k0m4FD06dv//48hqA48", new DateTime(2026, 3, 13, 1, 54, 12, 653, DateTimeKind.Utc).AddTicks(6982) });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_AggregateId_EventType",
                table: "OutboxMessages",
                columns: new[] { "AggregateId", "EventType" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status_AvailableAt",
                table: "OutboxMessages",
                columns: new[] { "Status", "AvailableAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcessedIntegrationEvents_MessageId_Consumer",
                table: "ProcessedIntegrationEvents",
                columns: new[] { "MessageId", "Consumer" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "ProcessedIntegrationEvents");

            migrationBuilder.UpdateData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3394), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3394) });

            migrationBuilder.UpdateData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000002"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3401), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3401) });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111001"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3418), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3418) });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111002"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3423), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3424) });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111003"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3428), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3429) });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111004"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3433), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3434) });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111005"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3487), new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3488) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("244aaa4d-8b07-4e4d-89f9-09281b73b24f"),
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3382), "hashed_password_for_test", new DateTime(2026, 1, 21, 14, 41, 58, 471, DateTimeKind.Utc).AddTicks(3382) });
        }
    }
}
