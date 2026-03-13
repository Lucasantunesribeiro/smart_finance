using SmartFinance.Application.Common.DTOs;

namespace SmartFinance.Application.Common.Interfaces;

public interface ICategoryService
{
    Task<PagedResponseDto<CategoryDto>> GetCategoriesAsync(Guid userId, int page, int pageSize, bool? isActive, int? type, string sortBy, string sortOrder, string search, CancellationToken cancellationToken = default);
    Task<CategoryDto?> GetCategoryAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateCategoryAsync(Guid userId, CategoryCreateRequestDto request, CancellationToken cancellationToken = default);
    Task<CategoryDto?> UpdateCategoryAsync(Guid userId, Guid categoryId, CategoryUpdateRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteCategoryAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default);
    Task<CategoryStatsDto?> GetCategoryStatsAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default);
}
