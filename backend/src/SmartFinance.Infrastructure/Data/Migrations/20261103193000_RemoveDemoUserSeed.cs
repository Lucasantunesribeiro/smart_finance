using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFinance.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Remove o usuário de demonstração do HasData. Daqui em diante ele só é criado pelo
    /// DemoDataSeeder quando DEMO_SEED=true, com a senha vinda de DEMO_USER_PASSWORD.
    ///
    /// Até aqui, todo banco migrado (inclusive produção) ganhava test@smartfinance.com com o hash
    /// de uma senha pública (exibida na tela de login). O Up trata só esse usuário semeado
    /// (Id fixo) e só se o hash ainda for o placeholder da InitialCreate ou o hash conhecido do
    /// HasData. Se o operador já trocou a senha, nada muda.
    ///  - Sem dados próprios: o usuário e as duas contas vazias semeadas são apagados.
    ///  - Com dados: nada é apagado; o hash vira um valor inválido (login com a senha pública
    ///    deixa de funcionar). Para reativar: DEMO_SEED=true + DEMO_USER_PASSWORD.
    /// Também fixa CreatedAt/UpdatedAt das categorias globais para o snapshot parar de mudar.
    /// </summary>
    public partial class RemoveDemoUserSeed : Migration
    {
        private const string DemoUserId = "244aaa4d-8b07-4e4d-89f9-09281b73b24f";

        // Hashes que o HasData antigo gravou (placeholder da InitialCreate e o hash da senha pública).
        private const string KnownDemoHashes =
            "'hashed_password_for_test', 'NirLg8WLHCBtY/Bxyq2li7B2TbiBNBuhxw8Fqg/mfFET5k0m4FD06dv//48hqA48'";

        // Não é Base64 válido: PasswordHasher.VerifyPassword sempre retorna false.
        private const string DisabledHash = "!demo-password-disabled";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
DELETE FROM ""Accounts"" a
WHERE a.""UserId"" = '{DemoUserId}'
  AND a.""Id"" IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM ""Transactions"" t WHERE t.""AccountId"" = a.""Id"")
  AND EXISTS (
      SELECT 1 FROM ""Users"" u
      WHERE u.""Id"" = a.""UserId"" AND u.""PasswordHash"" IN ({KnownDemoHashes}));");

            migrationBuilder.Sql($@"
DELETE FROM ""Users"" u
WHERE u.""Id"" = '{DemoUserId}'
  AND u.""PasswordHash"" IN ({KnownDemoHashes})
  AND NOT EXISTS (SELECT 1 FROM ""Accounts"" a WHERE a.""UserId"" = u.""Id"")
  AND NOT EXISTS (SELECT 1 FROM ""Transactions"" t WHERE t.""UserId"" = u.""Id"")
  AND NOT EXISTS (SELECT 1 FROM ""Budgets"" b WHERE b.""UserId"" = u.""Id"")
  AND NOT EXISTS (SELECT 1 FROM ""Categories"" c WHERE c.""UserId"" = u.""Id"")
  AND NOT EXISTS (SELECT 1 FROM ""Reports"" r WHERE r.""UserId"" = u.""Id"");");

            migrationBuilder.Sql($@"
UPDATE ""Users""
SET ""PasswordHash"" = '{DisabledHash}', ""RefreshToken"" = NULL, ""RefreshTokenExpiry"" = NULL
WHERE ""Id"" = '{DemoUserId}'
  AND ""PasswordHash"" IN ({KnownDemoHashes});");

            var seedTimestamp = new DateTime(2026, 1, 21, 0, 0, 0, 0, DateTimeKind.Utc);
            foreach (var categoryId in CategoryIds)
            {
                migrationBuilder.UpdateData(
                    table: "Categories",
                    keyColumn: "Id",
                    keyValue: categoryId,
                    columns: new[] { "CreatedAt", "UpdatedAt" },
                    values: new object[] { seedTimestamp, seedTimestamp });
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sem volta: recriar um usuário com senha conhecida seria reintroduzir o problema.
            // Use DEMO_SEED=true + DEMO_USER_PASSWORD para ter o usuário de demonstração.
        }

        private static readonly Guid[] CategoryIds =
        {
            new Guid("11111111-1111-1111-1111-111111111001"),
            new Guid("11111111-1111-1111-1111-111111111002"),
            new Guid("11111111-1111-1111-1111-111111111003"),
            new Guid("11111111-1111-1111-1111-111111111004"),
            new Guid("11111111-1111-1111-1111-111111111005")
        };
    }
}
