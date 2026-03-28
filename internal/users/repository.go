package users

import (
	"context"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	// GetUserByEmailUnscoped finds a user by email including soft-deleted rows (for admin create / uniqueness).
	GetUserByEmailUnscoped(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	ListUsers(ctx context.Context, roleFilter string, activeOnly *bool) ([]models.User, error)
	UpdateUserRole(ctx context.Context, id string, role models.Role) (*models.User, error)
	UpdateUserPasswordHash(ctx context.Context, id string, passwordHash string) (*models.User, error)
	UpdateProfile(ctx context.Context, id string, name, email, phone string) (*models.User, error)
	UpdateAvatarPath(ctx context.Context, userID, path string) (*models.User, error)
	ClearAvatarPath(ctx context.Context, userID string) (*models.User, error)
	UpdateUserActive(ctx context.Context, userID string, active bool) (*models.User, error)
	DeleteUser(ctx context.Context, id string) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetUserByEmailUnscoped(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Unscoped().Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) ListUsers(ctx context.Context, roleFilter string, activeOnly *bool) ([]models.User, error) {
	var users []models.User
	query := r.db.WithContext(ctx).Model(&models.User{}).Order("created_at DESC")
	if roleFilter != "" {
		query = query.Where("role = ?", roleFilter)
	}
	if activeOnly != nil {
		query = query.Where("active = ?", *activeOnly)
	}
	err := query.Find(&users).Error
	return users, err
}

func (r *repository) UpdateUserRole(ctx context.Context, id string, role models.Role) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	user.Role = role
	if err := r.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) UpdateUserPasswordHash(ctx context.Context, id string, passwordHash string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	user.PasswordHash = passwordHash
	if err := r.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) UpdateProfile(ctx context.Context, id string, name, email, phone string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	user.Name = name
	user.Email = email
	user.Phone = phone
	if err := r.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) UpdateAvatarPath(ctx context.Context, userID, path string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	user.AvatarPath = path
	if err := r.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) ClearAvatarPath(ctx context.Context, userID string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	user.AvatarPath = ""
	if err := r.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) UpdateUserActive(ctx context.Context, userID string, active bool) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	user.Active = active
	if err := r.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) DeleteUser(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error
}
