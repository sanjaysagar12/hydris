import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/roles';
import { SuppliersService } from './suppliers.service';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UpdateOwnSupplierDto } from './dto/update-own-supplier.dto';
import { CreateAlertDto } from './dto/create-alert.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @Roles('SUPPLIER')
  @Get('me')
  findMe(@CurrentUser() user: JwtPayload) {
    return this.own(this.suppliersService.findOne(user.sub));
  }

  @Roles('SUPPLIER')
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOwnSupplierDto) {
    return this.own(this.suppliersService.updateOwn(user.sub, dto));
  }

  @Roles('SUPPLIER')
  @Post('me/alerts')
  addMyAlert(@CurrentUser() user: JwtPayload, @Body() dto: CreateAlertDto) {
    return this.own(this.suppliersService.addAlert(user.sub, dto));
  }

  @Roles('SUPPLIER')
  @Delete('me/alerts/:alertId')
  removeMyAlert(@CurrentUser() user: JwtPayload, @Param('alertId') alertId: string) {
    return this.own(this.suppliersService.removeAlert(user.sub, alertId));
  }

  /**
   * "Own record" lookups are keyed off the JWT subject. If that id no longer
   * resolves (account deleted, or — as during development — the database was
   * reseeded after the token was issued) the token itself is stale, not a
   * legitimate 404: treat it as unauthenticated so the client re-prompts login
   * instead of surfacing a raw "not found" error.
   */
  private async own<T>(result: Promise<T>): Promise<T> {
    try {
      return await result;
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new UnauthorizedException('Session is no longer valid — please sign in again');
      }
      throw e;
    }
  }

  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }
}
