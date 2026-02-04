export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface AuthResponse {
    token: string;
    user: Omit<User, 'createdAt' | 'updatedAt'>;
}
//# sourceMappingURL=user.d.ts.map