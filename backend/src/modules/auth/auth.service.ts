import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { LoginDto } from './dto/login.dto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly jwtSecret: string;
  private readonly wxAppId: string;
  private readonly wxSecret: string;
  private readonly staticBaseUrl: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'fengxiangbiao-secret-key-2024';
    this.wxAppId = process.env.WX_APPID || '';
    this.wxSecret = process.env.WX_SECRET || '';
    this.staticBaseUrl = process.env.STATIC_BASE_URL || 'http://192.168.2.103/static';
  }

  async onModuleInit() {
    await this.initDefaultAdmin();
  }

  private async initDefaultAdmin() {
    const defaultUsername = 'admin';
    const defaultPassword = '123456';
    
    const existingAdmin = await this.adminRepo.findOne({ 
      where: { username: defaultUsername } 
    });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const admin = this.adminRepo.create({
        username: defaultUsername,
        password: hashedPassword,
        nickname: '管理员',
        permissions: ['all'],
      });
      await this.adminRepo.save(admin);
      console.log('✅ 默认管理员账户已创建: admin / 123456');
    } else {
      console.log('ℹ️ 管理员账户已存在');
    }
  }

  async wxLogin(dto: LoginDto) {
    const wxData = await this.getWxSession(dto.code);
    const { openid, session_key, unionid } = wxData;

    if (!openid) {
      throw new HttpException('微信登录失败', HttpStatus.BAD_REQUEST);
    }

    let user = await this.userRepo.findOne({ where: { openid } });

    if (!user) {
      user = this.userRepo.create({
        openid,
        unionid,
        nickname: dto.userInfo?.nickName || '用户' + Math.random().toString(36).substr(2, 6),
        avatar: dto.userInfo?.avatarUrl || `${this.staticBaseUrl}/default-avatar.png`,
        location: dto.location || {
          lat: 32.0603,
          lng: 118.7969,
          city: '南京市',
        },
      });
      await this.userRepo.save(user);
    } else {
      if (unionid && !user.unionid) {
        user.unionid = unionid;
      }
      if (dto.userInfo) {
        user.nickname = dto.userInfo.nickName || user.nickname;
        user.avatar = dto.userInfo.avatarUrl || user.avatar;
      }
      if (dto.location) {
        user.location = dto.location;
      }
      await this.userRepo.save(user);
    }

    const token = jwt.sign(
      { userId: user.id, openid, type: 'user' },
      this.jwtSecret,
      { expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        location: user.location,
        openid: user.openid,
        unionid: user.unionid,
      },
    };
  }

  async adminLogin(username: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { username } });
    
    if (!admin) {
      throw new HttpException('管理员不存在', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      throw new HttpException('密码错误', HttpStatus.UNAUTHORIZED);
    }

    const token = jwt.sign(
      { userId: admin.id, username, type: 'admin' },
      this.jwtSecret,
      { expiresIn: '24h' },
    );

    // 返回符合前端期望的格式
    return {
      status: 'ok',
      type: 'account',
      currentAuthority: 'admin',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        permissions: admin.permissions,
      },
    };
  }

  async getUserByToken(token: string) {
    if (!token) {
      throw new HttpException('未提供token', HttpStatus.UNAUTHORIZED);
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; type: string };
      
      if (decoded.type !== 'user') {
        throw new HttpException('无效的用户类型', HttpStatus.UNAUTHORIZED);
      }
      
      const user = await this.userRepo.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.UNAUTHORIZED);
      }

      return {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        openid: user.openid,
        unionid: user.unionid,
      };
    } catch (error) {
      throw new HttpException('token无效或已过期', HttpStatus.UNAUTHORIZED);
    }
  }

  async getAdminMe(token: string) {
    if (!token) {
      throw new HttpException('未提供token', HttpStatus.UNAUTHORIZED);
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; type: string };
      
      if (decoded.type !== 'admin') {
        throw new HttpException('无效的管理员类型', HttpStatus.UNAUTHORIZED);
      }
      
      const admin = await this.adminRepo.findOne({
        where: { id: decoded.userId },
      });

      if (!admin) {
        throw new HttpException('管理员不存在', HttpStatus.UNAUTHORIZED);
      }

      // 返回符合前端 CurrentUser 格式的数据
      return {
        userid: admin.id,
        name: admin.nickname || admin.username,
        avatar: admin.avatar,
        username: admin.username,
        access: 'admin',
      };
    } catch (error) {
      throw new HttpException('token无效或已过期', HttpStatus.UNAUTHORIZED);
    }
  }

  verifyToken(token: string): { userId: string; openid?: string; type: string } {
    try {
      return jwt.verify(token, this.jwtSecret) as { userId: string; openid?: string; type: string };
    } catch (error) {
      return null;
    }
  }

  async updateUser(token: string, data: any) {
    if (!token) {
      throw new HttpException('未提供token', HttpStatus.UNAUTHORIZED);
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; type: string };
      
      if (decoded.type !== 'user') {
        throw new HttpException('无效的用户类型', HttpStatus.UNAUTHORIZED);
      }
      
      const user = await this.userRepo.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.UNAUTHORIZED);
      }

      if (data.nickname !== undefined) {
        user.nickname = data.nickname;
      }
      if (data.avatar !== undefined) {
        user.avatar = data.avatar;
      }
      if (data.location !== undefined) {
        user.location = data.location;
      }
      if (data.phone !== undefined) {
        user.phone = data.phone;
      }
      if (data.unionid !== undefined) {
        user.unionid = data.unionid;
      }

      await this.userRepo.save(user);

      return {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        openid: user.openid,
        unionid: user.unionid,
      };
    } catch (error) {
      throw new HttpException('token无效或已过期', HttpStatus.UNAUTHORIZED);
    }
  }

  private async getWxSession(code: string): Promise<{ openid: string; session_key: string; unionid?: string }> {
    const isMockAppId = !this.wxAppId || !this.wxSecret ||
                        this.wxAppId === 'your-wx-appid' ||
                        this.wxSecret === 'your-wx-secret';

    if (isMockAppId) {
      console.log('未配置微信 AppID，使用模拟登录');
      return {
        openid: process.env.DEV_OPENID || 'mock_openid_developer',
        session_key: 'mock_session_key',
        unionid: process.env.DEV_UNIONID || 'mock_unionid_developer',
      };
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session`;
    const params = new URLSearchParams({
      appid: this.wxAppId,
      secret: this.wxSecret,
      js_code: code,
      grant_type: 'authorization_code',
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.errcode) {
      throw new HttpException(
        `微信登录错误: ${data.errmsg}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid,
    };
  }
}