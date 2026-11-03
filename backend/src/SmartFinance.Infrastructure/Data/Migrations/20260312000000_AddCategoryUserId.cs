using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFinance.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Adiciona Categories.UserId.
    /// Até a versão anterior este arquivo não tinha os atributos [DbContext]/[Migration] (não havia
    /// .Designer.cs), então o EF nunca o aplicava e a migration seguinte (AddOutboxMessaging) falhava
    /// em banco novo com "column UserId of relation Categories does not exist".
    /// O SQL é idempotente porque bancos existentes podem já ter a coluna criada por outro caminho.
    /// </summary>
    [DbContext(typeof(SmartFinanceDbContext))]
    [Migration("20260312000000_AddCategoryUserId")]
    public partial class AddCategoryUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"ALTER TABLE ""Categories"" ADD COLUMN IF NOT EXISTS ""UserId"" uuid NULL;");

            migrationBuilder.Sql(
                @"CREATE INDEX IF NOT EXISTS ""IX_Categories_UserId"" ON ""Categories"" (""UserId"");");

            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Categories_Users_UserId') THEN
        ALTER TABLE ""Categories""
            ADD CONSTRAINT ""FK_Categories_Users_UserId"" FOREIGN KEY (""UserId"")
            REFERENCES ""Users"" (""Id"") ON DELETE SET NULL;
    END IF;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Users_UserId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_UserId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Categories");
        }
    }
}
