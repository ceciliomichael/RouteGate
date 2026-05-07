package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"routegate/internal/config"
	"routegate/internal/identity"
	"routegate/internal/realtime"
	"routegate/internal/registry"
)

type Handler struct {
	routes   *registry.Store
	identity *identity.Store
	events   *realtime.Hub
	logger   *log.Logger
	cfg      config.Config
}

func NewHandler(
	routes *registry.Store,
	identityStore *identity.Store,
	events *realtime.Hub,
	logger *log.Logger,
	cfg config.Config,
) http.Handler {
	handler := &Handler{
		routes:   routes,
		identity: identityStore,
		events:   events,
		logger:   logger,
		cfg:      cfg,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/login", handler.handleLogin)
	mux.HandleFunc("/api/auth/logout", handler.handleLogout)
	mux.HandleFunc("/api/auth/me", handler.handleMe)
	mux.HandleFunc("/api/events", handler.handleEvents)
	mux.HandleFunc("/api/users", handler.handleUsers)
	mux.HandleFunc("/api/users/", handler.handleUsersItem)
	mux.HandleFunc("/api/users/availability", handler.handleUserUsernameAvailability)
	mux.HandleFunc("/api/routes", handler.handleRoutesCollection)
	mux.HandleFunc("/api/routes/availability", handler.handleRouteSubdomainAvailability)
	mux.HandleFunc("/api/routes/", handler.handleRoutesItem)
	return mux
}

func (h *Handler) handleLogin(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		h.writeMethodNotAllowed(writer, http.MethodPost)
		return
	}

	var payload struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeBody(request, &payload); err != nil {
		h.writeError(writer, http.StatusBadRequest, err.Error())
		return
	}

	identifier := strings.TrimSpace(payload.Username)
	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.identity.Authenticate(ctx, identifier, payload.Password)
	if err != nil {
		if errors.Is(err, identity.ErrInvalidCredentials) {
			h.writeError(writer, http.StatusUnauthorized, "invalid username or password")
			return
		}
		h.logger.Printf("authenticate failed: %v", err)
		h.writeError(writer, http.StatusInternalServerError, "failed to authenticate")
		return
	}

	sessionToken, expiresAt, err := h.identity.CreateSession(ctx, user.ID, h.cfg.SessionTTL())
	if err != nil {
		h.logger.Printf("create session failed: %v", err)
		h.writeError(writer, http.StatusInternalServerError, "failed to start session")
		return
	}
	lastActiveAt := time.Now().UTC()
	if err := h.identity.TouchLastActive(ctx, user.ID, lastActiveAt); err != nil {
		h.logger.Printf("touch last active failed: %v", err)
	}
	user.LastActiveAt = lastActiveAt.Format(time.RFC3339Nano)
	user.LastLoginAt = user.LastActiveAt

	http.SetCookie(writer, h.buildSessionCookie(sessionToken, expiresAt))
	h.writeJSON(writer, http.StatusOK, map[string]any{"user": user})
}

func (h *Handler) handleLogout(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		h.writeMethodNotAllowed(writer, http.MethodPost)
		return
	}

	if cookie, err := request.Cookie(h.cfg.SessionCookieName); err == nil {
		ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
		defer cancel()
		if err := h.identity.DeleteSession(ctx, cookie.Value); err != nil {
			h.logger.Printf("delete session failed: %v", err)
		}
	}

	http.SetCookie(writer, h.buildExpiredSessionCookie())
	h.writeJSON(writer, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) handleMe(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		h.writeMethodNotAllowed(writer, http.MethodGet)
		return
	}

	user, ok := h.requireUser(writer, request)
	if !ok {
		return
	}

	h.writeJSON(writer, http.StatusOK, map[string]any{"user": user})
}

func (h *Handler) handleEvents(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		h.writeMethodNotAllowed(writer, http.MethodGet)
		return
	}
	if h.events == nil {
		h.writeError(writer, http.StatusServiceUnavailable, "realtime events are unavailable")
		return
	}

	_, ok := h.requireUser(writer, request)
	if !ok {
		return
	}

	flusher, ok := writer.(http.Flusher)
	if !ok {
		h.writeError(writer, http.StatusInternalServerError, "streaming is unsupported")
		return
	}

	writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	writer.Header().Set("Connection", "keep-alive")
	writer.Header().Set("Content-Type", "text/event-stream")
	writer.Header().Set("X-Accel-Buffering", "no")
	writer.WriteHeader(http.StatusOK)

	events, unsubscribe := h.events.Subscribe()
	defer unsubscribe()

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	if _, err := fmt.Fprint(writer, ": connected\n\n"); err != nil {
		return
	}
	flusher.Flush()

	for {
		select {
		case <-request.Context().Done():
			return
		case event, ok := <-events:
			if !ok {
				return
			}
			if err := h.writeRealtimeEvent(writer, flusher, event); err != nil {
				return
			}
		case <-heartbeat.C:
			if _, err := fmt.Fprint(writer, ": keep-alive\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func (h *Handler) handleUsers(writer http.ResponseWriter, request *http.Request) {
	user, ok := h.requireUser(writer, request)
	if !ok {
		return
	}
	if !user.IsAdmin() {
		h.writeError(writer, http.StatusForbidden, "forbidden")
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	switch request.Method {
	case http.MethodGet:
		users, err := h.identity.ListUsers(ctx)
		if err != nil {
			h.logger.Printf("list users failed: %v", err)
			h.writeError(writer, http.StatusInternalServerError, "failed to list users")
			return
		}
		h.writeJSON(writer, http.StatusOK, map[string]any{"users": users})
	case http.MethodPost:
		var payload identity.CreateUserInput
		if err := decodeBody(request, &payload); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}

		created, generatedPassword, err := h.identity.CreateUser(ctx, payload)
		if err != nil {
			switch {
			case errors.Is(err, identity.ErrDuplicateUser):
				h.writeError(writer, http.StatusConflict, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventUsersChanged)
		h.writeJSON(writer, http.StatusCreated, map[string]any{
			"user":              created,
			"generatedPassword": generatedPassword,
		})
	default:
		h.writeMethodNotAllowed(writer, http.MethodGet, http.MethodPost)
	}
}

func (h *Handler) handleUserUsernameAvailability(writer http.ResponseWriter, request *http.Request) {
	user, ok := h.requireUser(writer, request)
	if !ok {
		return
	}
	if !user.IsAdmin() {
		h.writeError(writer, http.StatusForbidden, "forbidden")
		return
	}
	if request.Method != http.MethodGet {
		h.writeMethodNotAllowed(writer, http.MethodGet)
		return
	}

	username := strings.TrimSpace(request.URL.Query().Get("username"))

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	available, err := h.identity.IsUsernameAvailable(ctx, username)
	if err != nil {
		h.writeError(writer, http.StatusBadRequest, err.Error())
		return
	}

	h.writeJSON(writer, http.StatusOK, map[string]any{
		"username":  normalizeUsernameForResponse(username),
		"available": available,
	})
}

func (h *Handler) handleUsersItem(writer http.ResponseWriter, request *http.Request) {
	user, ok := h.requireUser(writer, request)
	if !ok {
		return
	}

	path := strings.TrimSpace(strings.TrimPrefix(request.URL.Path, "/api/users/"))
	path = strings.Trim(path, "/")
	if path == "" {
		h.writeError(writer, http.StatusNotFound, "not found")
		return
	}

	segments := strings.Split(path, "/")
	if len(segments) > 2 {
		h.writeError(writer, http.StatusNotFound, "not found")
		return
	}

	targetID := strings.TrimSpace(segments[0])
	if targetID == "" {
		h.writeError(writer, http.StatusNotFound, "not found")
		return
	}

	if targetID == "me" {
		h.handleCurrentUserSettings(writer, request, user, segments)
		return
	}

	if !user.IsAdmin() {
		h.writeError(writer, http.StatusForbidden, "forbidden")
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	switch request.Method {
	case http.MethodDelete:
		if targetID == user.ID {
			h.writeError(writer, http.StatusForbidden, "cannot delete the active account")
			return
		}

		if err := h.identity.DeleteUser(ctx, targetID); err != nil {
			switch {
			case errors.Is(err, identity.ErrUserNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			case errors.Is(err, identity.ErrUserProtected):
				h.writeError(writer, http.StatusConflict, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventUsersChanged)
		writer.WriteHeader(http.StatusNoContent)
	case http.MethodPatch:
		var payload identity.UpdateUserInput
		if err := decodeBody(request, &payload); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}

		updated, err := h.identity.UpdateUser(ctx, targetID, payload)
		if err != nil {
			switch {
			case errors.Is(err, identity.ErrUserNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			case errors.Is(err, identity.ErrUserProtected):
				h.writeError(writer, http.StatusForbidden, err.Error())
			case errors.Is(err, identity.ErrDuplicateUser):
				h.writeError(writer, http.StatusConflict, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventUsersChanged)
		h.writeJSON(writer, http.StatusOK, map[string]any{"user": updated})
	case http.MethodPost:
		if len(segments) != 2 || segments[1] != "password" {
			h.writeError(writer, http.StatusNotFound, "not found")
			return
		}

		updated, generatedPassword, err := h.identity.RegeneratePassword(ctx, targetID)
		if err != nil {
			switch {
			case errors.Is(err, identity.ErrUserNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventUsersChanged)
		h.writeJSON(writer, http.StatusOK, map[string]any{
			"user":              updated,
			"generatedPassword": generatedPassword,
		})
	default:
		h.writeMethodNotAllowed(writer, http.MethodDelete, http.MethodPatch, http.MethodPost)
	}
}

func (h *Handler) handleCurrentUserSettings(
	writer http.ResponseWriter,
	request *http.Request,
	user identity.User,
	segments []string,
) {
	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	if len(segments) == 1 {
		if request.Method != http.MethodPatch {
			h.writeMethodNotAllowed(writer, http.MethodPatch)
			return
		}

		var payload struct {
			Name string `json:"name"`
		}
		if err := decodeBody(request, &payload); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}

		updated, err := h.identity.UpdateCurrentUserName(ctx, user.ID, payload.Name)
		if err != nil {
			switch {
			case errors.Is(err, identity.ErrUserNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			case errors.Is(err, identity.ErrUserProtected):
				h.writeError(writer, http.StatusForbidden, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventUsersChanged)
		h.writeJSON(writer, http.StatusOK, map[string]any{"user": updated})
		return
	}

	if len(segments) == 2 && segments[1] == "password" {
		if request.Method != http.MethodPost {
			h.writeMethodNotAllowed(writer, http.MethodPost)
			return
		}

		var payload struct {
			CurrentPassword string `json:"currentPassword"`
			NewPassword     string `json:"newPassword"`
		}
		if err := decodeBody(request, &payload); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}

		updated, err := h.identity.ChangeCurrentUserPassword(
			ctx,
			user.ID,
			payload.CurrentPassword,
			payload.NewPassword,
		)
		if err != nil {
			switch {
			case errors.Is(err, identity.ErrUserNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			case errors.Is(err, identity.ErrUserProtected):
				h.writeError(writer, http.StatusForbidden, err.Error())
			case errors.Is(err, identity.ErrInvalidPassword):
				h.writeError(writer, http.StatusUnauthorized, "current password is incorrect")
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		sessionToken, expiresAt, err := h.identity.CreateSession(ctx, updated.ID, h.cfg.SessionTTL())
		if err != nil {
			h.logger.Printf("create session failed after password change: %v", err)
			h.writeError(writer, http.StatusInternalServerError, "failed to start session")
			return
		}
		lastActiveAt := time.Now().UTC()
		if err := h.identity.TouchLastActive(ctx, updated.ID, lastActiveAt); err != nil {
			h.logger.Printf("touch last active failed after password change: %v", err)
		}
		updated.LastActiveAt = lastActiveAt.Format(time.RFC3339Nano)
		updated.LastLoginAt = updated.LastActiveAt

		http.SetCookie(writer, h.buildSessionCookie(sessionToken, expiresAt))
		h.publishChange(realtime.EventUsersChanged)
		h.writeJSON(writer, http.StatusOK, map[string]any{"user": updated})
		return
	}

	h.writeError(writer, http.StatusNotFound, "not found")
}

func (h *Handler) handleRoutesCollection(writer http.ResponseWriter, request *http.Request) {
	user, ok := h.requireUser(writer, request)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	scope := registry.AccessScope{UserID: user.ID, IsAdmin: user.IsAdmin()}

	switch request.Method {
	case http.MethodGet:
		routes, err := h.routes.List(ctx, scope)
		if err != nil {
			h.logger.Printf("list routes failed: %v", err)
			h.writeError(writer, http.StatusInternalServerError, "failed to list routes")
			return
		}
		h.writeJSON(writer, http.StatusOK, map[string]any{"routes": routes})
	case http.MethodPost:
		var payload registry.CreateRouteInput
		if err := decodeBody(request, &payload); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		if h.isReservedRouteSubdomain(payload.Subdomain) {
			h.writeError(writer, http.StatusConflict, "subdomain is reserved")
			return
		}
		if err := h.validateDestinationForUser(user, payload.Destination); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}

		route, err := h.routes.Create(ctx, registry.OwnerInfo{
			UserID:   user.ID,
			UserName: user.Name,
		}, payload)
		if err != nil {
			switch {
			case errors.Is(err, registry.ErrReservedSubdomain):
				h.writeError(writer, http.StatusConflict, err.Error())
			case errors.Is(err, registry.ErrDuplicateSubdomain):
				h.writeError(writer, http.StatusConflict, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventRoutesChanged)
		h.writeJSON(writer, http.StatusCreated, route)
	default:
		h.writeMethodNotAllowed(writer, http.MethodGet, http.MethodPost)
	}
}

func (h *Handler) handleRoutesItem(writer http.ResponseWriter, request *http.Request) {
	user, ok := h.requireUser(writer, request)
	if !ok {
		return
	}

	id := strings.TrimSpace(strings.TrimPrefix(request.URL.Path, "/api/routes/"))
	id = strings.Trim(id, "/")
	if id == "" || strings.ContainsRune(id, '/') {
		h.writeError(writer, http.StatusNotFound, "not found")
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	scope := registry.AccessScope{UserID: user.ID, IsAdmin: user.IsAdmin()}

	switch request.Method {
	case http.MethodPut:
		var payload registry.UpdateRouteInput
		if err := decodeBody(request, &payload); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		if h.isReservedRouteSubdomain(payload.Subdomain) {
			h.writeError(writer, http.StatusConflict, "subdomain is reserved")
			return
		}
		if err := h.validateDestinationForUser(user, payload.Destination); err != nil {
			h.writeError(writer, http.StatusBadRequest, err.Error())
			return
		}

		route, err := h.routes.Update(ctx, scope, id, payload)
		if err != nil {
			switch {
			case errors.Is(err, registry.ErrReservedSubdomain):
				h.writeError(writer, http.StatusConflict, err.Error())
			case errors.Is(err, registry.ErrRouteNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			case errors.Is(err, registry.ErrDuplicateSubdomain):
				h.writeError(writer, http.StatusConflict, err.Error())
			case errors.Is(err, registry.ErrRouteForbidden):
				h.writeError(writer, http.StatusForbidden, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventRoutesChanged)
		h.writeJSON(writer, http.StatusOK, route)
	case http.MethodDelete:
		err := h.routes.Delete(ctx, scope, id)
		if err != nil {
			switch {
			case errors.Is(err, registry.ErrRouteNotFound):
				h.writeError(writer, http.StatusNotFound, err.Error())
			case errors.Is(err, registry.ErrRouteForbidden):
				h.writeError(writer, http.StatusForbidden, err.Error())
			default:
				h.writeError(writer, http.StatusBadRequest, err.Error())
			}
			return
		}

		h.publishChange(realtime.EventRoutesChanged)
		writer.WriteHeader(http.StatusNoContent)
	default:
		h.writeMethodNotAllowed(writer, http.MethodPut, http.MethodDelete)
	}
}

func (h *Handler) handleRouteSubdomainAvailability(
	writer http.ResponseWriter,
	request *http.Request,
) {
	_, ok := h.requireUser(writer, request)
	if !ok {
		return
	}
	if request.Method != http.MethodGet {
		h.writeMethodNotAllowed(writer, http.MethodGet)
		return
	}

	subdomain := strings.TrimSpace(request.URL.Query().Get("subdomain"))

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	available, err := h.routes.IsSubdomainAvailable(ctx, subdomain)
	if err != nil {
		h.writeError(writer, http.StatusBadRequest, err.Error())
		return
	}

	h.writeJSON(writer, http.StatusOK, map[string]any{
		"subdomain": normalizeSubdomainForResponse(subdomain),
		"available": available,
	})
}

func normalizeSubdomainForResponse(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func normalizeUsernameForResponse(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func (h *Handler) publishChange(eventType realtime.EventType) {
	if h.events == nil {
		return
	}

	h.events.Publish(realtime.Event{
		Type:      eventType,
		Timestamp: time.Now().UTC(),
	})
}

func (h *Handler) writeRealtimeEvent(
	writer http.ResponseWriter,
	flusher http.Flusher,
	event realtime.Event,
) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	if _, err := fmt.Fprintf(writer, "event: %s\n", event.Type); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(writer, "data: %s\n\n", payload); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

func (h *Handler) requireUser(writer http.ResponseWriter, request *http.Request) (identity.User, bool) {
	cookie, err := request.Cookie(h.cfg.SessionCookieName)
	if err != nil || strings.TrimSpace(cookie.Value) == "" {
		h.writeError(writer, http.StatusUnauthorized, "unauthorized")
		return identity.User{}, false
	}

	ctx, cancel := context.WithTimeout(request.Context(), 5*time.Second)
	defer cancel()

	user, ok, err := h.identity.GetUserBySessionToken(ctx, cookie.Value)
	if err != nil {
		h.logger.Printf("resolve session failed: %v", err)
		h.writeError(writer, http.StatusInternalServerError, "failed to resolve session")
		return identity.User{}, false
	}
	if !ok {
		http.SetCookie(writer, h.buildExpiredSessionCookie())
		h.writeError(writer, http.StatusUnauthorized, "unauthorized")
		return identity.User{}, false
	}

	now := time.Now().UTC()
	if err := h.identity.TouchLastActive(ctx, user.ID, now); err != nil {
		h.logger.Printf("touch last active failed: %v", err)
	} else {
		user.LastActiveAt = now.Format(time.RFC3339Nano)
		user.LastLoginAt = user.LastActiveAt
	}

	return user, true
}

func (h *Handler) buildSessionCookie(value string, expiresAt time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     h.cfg.SessionCookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.cfg.SessionCookieSecure,
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
	}
}

func (h *Handler) buildExpiredSessionCookie() *http.Cookie {
	return &http.Cookie{
		Name:     h.cfg.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.cfg.SessionCookieSecure,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	}
}

func (h *Handler) writeMethodNotAllowed(writer http.ResponseWriter, allowed ...string) {
	writer.Header().Set("Allow", strings.Join(allowed, ", "))
	h.writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
}

func (h *Handler) writeJSON(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(payload)
}

func (h *Handler) writeError(writer http.ResponseWriter, status int, message string) {
	h.writeJSON(writer, status, map[string]string{"error": message})
}

func decodeBody(request *http.Request, target any) error {
	if request.Body == nil {
		return errors.New("request body is required")
	}

	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	if decoder.More() {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}

func (h *Handler) isReservedRouteSubdomain(value string) bool {
	reserved := strings.TrimSpace(h.cfg.FrontendRouteSubdomain)
	if reserved == "" {
		return false
	}

	return strings.EqualFold(strings.TrimSpace(value), reserved)
}

func (h *Handler) validateDestinationForUser(user identity.User, destination string) error {
	if user.IsAdmin() || len(h.cfg.RestrictedDestinationHosts) == 0 {
		return nil
	}

	host, blocked, err := registry.IsBlockedDestinationHost(destination, h.cfg.RestrictedDestinationHosts)
	if err != nil {
		return err
	}
	if !blocked {
		return nil
	}

	return fmt.Errorf("destination host %q is reserved for admin users", host)
}
