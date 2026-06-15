import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly wxAppId: string;
  private readonly wxSecret: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'fengxiangbiao-secret-key-2024';
    this.wxAppId = process.env.WX_APPID || '';
    this.wxSecret = process.env.WX_SECRET || '';
  }

  async login(dto: LoginDto) {
    // 1. 向微信服务器换取 openid
    const wxData = await this.getWxSession(dto.code);
    const { openid, session_key } = wxData;

    if (!openid) {
      throw new HttpException('微信登录失败', HttpStatus.BAD_REQUEST);
    }

    // 2. 查询或创建用户
    let user = await this.userRepo.findOne({ where: { openid } });
    
    if (!user) {
      user = this.userRepo.create({
        openid,
        nickname: dto.userInfo?.nickName || null,
        avatar: dto.userInfo?.avatarUrl || null,
      });
      await this.userRepo.save(user);
    } else if (dto.userInfo) {
      // 更新用户信息
      user.nickname = dto.userInfo.nickName || user.nickname;
      user.avatar = dto.userInfo.avatarUrl || user.avatar;
      await this.userRepo.save(user);
    }

    // 3. 生成 JWT
    const token = jwt.sign(
      { userId: user.id, openid },
      this.jwtSecret,
      { expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }

  async getUserByToken(token: string) {
    if (!token) {
      throw new HttpException('未提供token', HttpStatus.UNAUTHORIZED);
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
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
      };
    } catch (error) {
      throw new HttpException('token无效或已过期', HttpStatus.UNAUTHORIZED);
    }
  }

  verifyToken(token: string): { userId: string; openid: string } {
    try {
      return jwt.verify(token, this.jwtSecret) as { userId: string; openid: string };
    } catch (error) {
      return null;
    }
  }

  private async getWxSession(code: string): Promise<{ openid: string; session_key: string }> {
    // 开发环境模拟微信登录（无真实 AppID 时）
    if (!this.wxAppId || !this.wxSecret) {
      console.log('未配置微信 AppID，使用模拟登录');
      return {
        openid: `mock_openid_${code}`,
        session_key: 'mock_session_key',
      };
    }

    // 真实微信登录
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
    };
  }
}
