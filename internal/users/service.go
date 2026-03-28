package users

import (
	"context"
	"errors"
	"strings"

	"erp-project/internal/models"
	"erp-project/pkg/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound          = errors.New("user not found")
	ErrUserAlreadyExists     = errors.New("user already exists")
	ErrInvalidRole           = errors.New("invalid role")
	ErrCannotDeleteSelf      = errors.New("cannot delete your own account")
	ErrCannotDeactivateSelf  = errors.New("cannot deactivate your own account")
	ErrWrongCurrentPassword  = errors.New("current password is incorrect")
)

type Service interface {
	CreateUser(ctx context.Context, name, email, password string, role models.Role) (*models.User, error)
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	ListUsers(ctx context.Context, roleFilter string, activeOnly *bool) ([]models.User, error)
	UpdateUserRole(ctx context.Context, id string, role models.Role) (*models.User, error)
	ResetUserPassword(ctx context.Context, id string, newPassword string) (*models.User, error)
	UpdateProfile(ctx context.Context, id string, name, email, phone string) (*models.User, error)
	UpdateProfileAvatar(ctx context.Context, userID, avatarPath string) (*models.User, error)
	ClearUserAvatar(ctx context.Context, userID string) (*models.User, error)
	SetUserActive(ctx context.Context, id string, active bool, actorID string) (*models.User, error)
	ChangeOwnPassword(ctx context.Context, id string, currentPassword, newPassword string) error
	DeleteUser(ctx context.Context, id string, actorID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateUser(ctx context.Context, name, email, password string, role models.Role) (*models.User, error) {
	if !isValidRole(role) {
		return nil, ErrInvalidRole
	}
	email = strings.TrimSpace(strings.ToLower(email))
	existing, err := s.repo.GetUserByEmailUnscoped(ctx, email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrUserAlreadyExists
	}
	if err := utils.ValidatePassword(password); err != nil {
		return nil, err
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &models.User{
		Name:         name,
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Active:       true,
	}
	if err := s.repo.CreateUser(ctx, user); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, ErrUserAlreadyExists
		}
		return nil, err
	}
	return user, nil
}

func (s *service) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *service) ListUsers(ctx context.Context, roleFilter string, activeOnly *bool) ([]models.User, error) {
	return s.repo.ListUsers(ctx, roleFilter, activeOnly)
}

func isValidRole(role models.Role) bool {
	switch role {
	case models.RoleAdmin,
		models.RoleProjectManager,
		models.RoleSiteEngineer,
		models.RoleAccountant,
		models.RoleStoreOfficer:
		return true
	default:
		return false
	}
}

func (s *service) UpdateUserRole(ctx context.Context, id string, role models.Role) (*models.User, error) {
	if !isValidRole(role) {
		return nil, ErrInvalidRole
	}
	user, err := s.repo.UpdateUserRole(ctx, id, role)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *service) ResetUserPassword(ctx context.Context, id string, newPassword string) (*models.User, error) {
	if err := utils.ValidatePassword(newPassword); err != nil {
		return nil, err
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user, err := s.repo.UpdateUserPasswordHash(ctx, id, string(hashedPassword))
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *service) UpdateProfile(ctx context.Context, id string, name, email, phone string) (*models.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, ErrUserNotFound
	}
	if email != user.Email {
		existing, _ := s.repo.GetUserByEmail(ctx, email)
		if existing != nil && existing.ID != id {
			return nil, ErrUserAlreadyExists
		}
	}
	return s.repo.UpdateProfile(ctx, id, name, email, phone)
}

func (s *service) UpdateProfileAvatar(ctx context.Context, userID, avatarPath string) (*models.User, error) {
	_, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return s.repo.UpdateAvatarPath(ctx, userID, avatarPath)
}

func (s *service) ClearUserAvatar(ctx context.Context, userID string) (*models.User, error) {
	return s.repo.ClearAvatarPath(ctx, userID)
}

func (s *service) ChangeOwnPassword(ctx context.Context, id string, currentPassword, newPassword string) error {
	if err := utils.ValidatePassword(newPassword); err != nil {
		return err
	}
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return ErrUserNotFound
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrWrongCurrentPassword
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.repo.UpdateUserPasswordHash(ctx, id, string(hashedPassword))
	return err
}

func (s *service) SetUserActive(ctx context.Context, id string, active bool, actorID string) (*models.User, error) {
	if id == actorID && !active {
		return nil, ErrCannotDeactivateSelf
	}
	user, err := s.repo.UpdateUserActive(ctx, id, active)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *service) DeleteUser(ctx context.Context, id string, actorID string) error {
	if id == actorID {
		return ErrCannotDeleteSelf
	}
	if err := s.repo.DeleteUser(ctx, id); err != nil {
		return ErrUserNotFound
	}
	return nil
}
