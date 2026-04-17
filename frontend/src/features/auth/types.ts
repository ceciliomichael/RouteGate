export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isBootstrap: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}
