package auth

import (
	"context"
	"errors"
	"time"

	"erp-project/internal/models"
	"erp-project/internal/users"
	"erp-project/pkg/utils"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserAlreadyExists  = errors.New("user with this email already exists")
	ErrUserInactive       = errors.New("account is inactive")
)

type Service interface {
	Register(ctx context.Context, req RegisterRequest) (*models.User, error)
	Login(ctx context.Context, req LoginRequest) (string, error)
}

type service struct {
	userRepo    users.Repository
	jwtSecret   []byte
	tokenExpiry time.Duration
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	// Role is never accepted from client on public registration; use default only.
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func NewService(userRepo users.Repository, jwtSecret string, tokenExpiry time.Duration) Service {
	return &service{
		userRepo:    userRepo,
		jwtSecret:   []byte(jwtSecret),
		tokenExpiry: tokenExpiry,
	}
}

func (s *service) Register(ctx context.Context, req RegisterRequest) (*models.User, error) {
	if err := utils.ValidatePassword(req.Password); err != nil {
		return nil, err
	}
	// Check if user already exists
	existingUser, _ := s.userRepo.GetUserByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, ErrUserAlreadyExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         models.RoleSiteEngineer, // Default for public signup; admins use POST /users to set role.
	}

	err = s.userRepo.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *service) Login(ctx context.Context, req LoginRequest) (string, error) {
	user, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return "", ErrInvalidCredentials
	}

	if !user.Active {
		return "", ErrUserInactive
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return "", ErrInvalidCredentials
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"role":  user.Role,
		"exp":   time.Now().Add(s.tokenExpiry).Unix(),
	})

	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
