import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, Role } from './roles';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signToken(payload: JwtPayload) {
    return this.jwt.sign(payload);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.supplier.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        loc: dto.loc,
        region: dto.region,
        email,
        passwordHash,
      },
    });

    const accessToken = this.signToken({ sub: supplier.id, email: supplier.email, role: 'SUPPLIER' });
    return { accessToken, user: { id: supplier.id, email: supplier.email, name: supplier.name, role: 'SUPPLIER' as Role } };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const adminEmail = (process.env.ADMIN_EMAIL ?? '').toLowerCase();
    if (email === adminEmail && dto.password === process.env.ADMIN_PASSWORD) {
      const accessToken = this.signToken({ sub: 'admin', email, role: 'ADMIN' });
      return { accessToken, user: { id: 'admin', email, name: 'Admin', role: 'ADMIN' as Role } };
    }

    const supplier = await this.prisma.supplier.findUnique({ where: { email } });
    if (!supplier) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, supplier.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signToken({ sub: supplier.id, email: supplier.email, role: 'SUPPLIER' });
    return { accessToken, user: { id: supplier.id, email: supplier.email, name: supplier.name, role: 'SUPPLIER' as Role } };
  }
}
