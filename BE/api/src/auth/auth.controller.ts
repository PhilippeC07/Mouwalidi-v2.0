import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, LoginResponseDto, RegisterDto, UserResponseDto } from './dto/auth.dto.js';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiBody({ type: LoginDto })
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }

  // Protected — only SUPERADMIN/ADMIN can create a new account (CUSTOMER
  // blocked by RolesGuard). There's no public sign-up page.
  @Post('register')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBody({ type: RegisterDto })
  register(@Body() body: RegisterDto, @CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.register(body, user);
  }

  @Get('users')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getUsers(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto[]> {
    return this.authService.getUsers(user);
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }
}
