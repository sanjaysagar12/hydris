export type Role = 'ADMIN' | 'SUPPLIER';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
