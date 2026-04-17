export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isBootstrap: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  username: string;
  role: "admin" | "user";
}

export interface CreateUserResponse {
  user: ManagedUser;
  generatedPassword: string;
}

export interface PasswordRotationResponse {
  user: ManagedUser;
  generatedPassword: string;
}

export interface CurrentUserProfileUpdatePayload {
  name: string;
}

export interface CurrentUserPasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

export interface CurrentUserResponse {
  user: ManagedUser;
}
