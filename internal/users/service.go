package users

import (
	"context"
	"errors"

	"erp-project/internal/models"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrInvalidRole       = errors.New("invalid role")
	ErrCannotDeleteSelf  = errors.New("cannot delete your own account")
	ErrWeakPassword      = errors.New("password must be at least 6 characters")
)

type Service interface {
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	ListUsers(ctx context.Context, roleFilter string) ([]models.User, error)
	UpdateUserRole(ctx context.Context, id string, role models.Role) (*models.User, error)
	ResetUserPassword(ctx context.Context, id string, newPassword string) (*models.User, error)
	DeleteUser(ctx context.Context, id string, actorID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *service) ListUsers(ctx context.Context, roleFilter string) ([]models.User, error) {
	return s.repo.ListUsers(ctx, roleFilter)
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
	if len(newPassword) < 6 {
		return nil, ErrWeakPassword
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

func (s *service) DeleteUser(ctx context.Context, id string, actorID string) error {
	if id == actorID {
		return ErrCannotDeleteSelf
	}
	if err := s.repo.DeleteUser(ctx, id); err != nil {
		return ErrUserNotFound
	}
	return nil
}
