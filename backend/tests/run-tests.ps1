# SmartFinance Test Runner Script
# This script runs all tests in the SmartFinance.Tests project

Write-Host "Running SmartFinance Tests..." -ForegroundColor Green

# Run all tests with detailed output
dotnet test SmartFinance.Tests/SmartFinance.Tests.csproj --verbosity normal --logger "console;verbosity=detailed"

# Check if tests passed
if ($LASTEXITCODE -eq 0) {
    Write-Host "All tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Please check the output above." -ForegroundColor Red
    exit 1
}