// 定义D1数据库接口
interface D1Database {
  prepare: (sql: string) => {
    bind: (...args: any[]) => {
      first: <T>() => Promise<T | null>;
      all: <T>() => Promise<{ results: T[] }>;
      run: () => Promise<{ meta: { changes: number } }>;
    };
    all: <T>() => Promise<{ results: T[] }>;
  };
  batch: (statements: any[]) => Promise<void>;
}

export interface D1User {
  id: string;
  username: string;
  password: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface D1Permission {
  id: string;
  userId: string;
  moduleId: string;
  canAccess: boolean;
}

export class D1UserClient {
  constructor(private db: D1Database) {}

  // 用户相关操作
  async createUser(user: Omit<D1User, 'id' | 'createdAt' | 'updatedAt'>): Promise<D1User> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      console.log('D1UserClient.createUser - 开始创建用户:', { id, username: user.username });
      
      const sql = `
        INSERT INTO User (id, username, password, email, status, isAdmin, lastLoginAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      console.log('执行SQL:', sql);
      console.log('参数:', [id, user.username, user.password, user.email, user.status ? 1 : 0, user.isAdmin ? 1 : 0, user.lastLoginAt, now, now]);
      
      const result = await this.db.prepare(sql).bind(
        id,
        user.username,
        user.password,
        user.email,
        user.status ? 1 : 0,
        user.isAdmin ? 1 : 0,
        user.lastLoginAt,
        now,
        now
      ).run();

      console.log('SQL执行结果:', result);

      const createdUser = { ...user, id, createdAt: now, updatedAt: now };
      console.log('创建的用户对象:', createdUser);
      
      return createdUser;
      
    } catch (error) {
      console.error('D1UserClient.createUser - 创建用户失败:', error);
      throw new Error(`创建用户失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async getUserById(id: string): Promise<D1User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM User WHERE id = ?
    `).bind(id).first<D1User>();

    if (!result) return null;

    return {
      ...result,
      status: Boolean(result.status),
      isAdmin: Boolean(result.isAdmin)
    };
  }

  async getUserByUsername(username: string): Promise<D1User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM User WHERE username = ?
    `).bind(username).first<D1User>();

    if (!result) return null;

    return {
      ...result,
      status: Boolean(result.status),
      isAdmin: Boolean(result.isAdmin)
    };
  }

  async updateUser(id: string, updates: Partial<D1User>): Promise<D1User | null> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        fields.push(`${key} = ?`);
        if (key === 'status' || key === 'isAdmin') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const sql = `UPDATE User SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await this.db.prepare(sql).bind(...values).run();

    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM User WHERE id = ?
    `).bind(id).run();

    return result.meta.changes > 0;
  }

  async getAllUsers(): Promise<D1User[]> {
    const result = await this.db.prepare(`
      SELECT * FROM User ORDER BY createdAt DESC
    `).all<D1User>();

    return result.results.map(user => ({
      ...user,
      status: Boolean(user.status),
      isAdmin: Boolean(user.isAdmin)
    }));
  }

  // 权限相关操作
  async createPermission(permission: Omit<D1Permission, 'id'>): Promise<D1Permission> {
    const id = crypto.randomUUID();
    
    await this.db.prepare(`
      INSERT INTO Permission (id, userId, moduleId, canAccess)
      VALUES (?, ?, ?, ?)
    `).bind(
      id,
      permission.userId,
      permission.moduleId,
      permission.canAccess ? 1 : 0
    ).run();

    return { ...permission, id };
  }

  async getUserPermissions(userId: string): Promise<D1Permission[]> {
    const result = await this.db.prepare(`
      SELECT * FROM Permission WHERE userId = ?
    `).bind(userId).all<D1Permission>();

    return result.results.map(permission => ({
      ...permission,
      canAccess: Boolean(permission.canAccess)
    }));
  }

  async updatePermission(id: string, canAccess: boolean): Promise<D1Permission | null> {
    await this.db.prepare(`
      UPDATE Permission SET canAccess = ? WHERE id = ?
    `).bind(canAccess ? 1 : 0, id).run();

    const result = await this.db.prepare(`
      SELECT * FROM Permission WHERE id = ?
    `).bind(id).first<D1Permission>();

    if (!result) return null;

    return {
      ...result,
      canAccess: Boolean(result.canAccess)
    };
  }

  async deletePermission(id: string): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM Permission WHERE id = ?
    `).bind(id).run();

    return result.meta.changes > 0;
  }

  async deleteUserPermissions(userId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM Permission WHERE userId = ?
    `).bind(userId).run();

    return result.meta.changes > 0;
  }

  // 批量操作
  async batchUpdatePermissions(permissions: Array<{ id: string; canAccess: boolean }>): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE Permission SET canAccess = ? WHERE id = ?
    `);

    const batch = permissions.map(p => stmt.bind(p.canAccess ? 1 : 0, p.id));
    await this.db.batch(batch);
  }

  // 验证用户密码
  async validatePassword(userId: string, currentPassword: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // 支持明文密码和bcrypt哈希
    if (currentPassword === user.password) {
      return true;
    }

    // 如果是bcrypt哈希，这里可以添加验证逻辑
    // 目前暂时跳过bcrypt验证，直接返回false
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // 这里应该使用bcrypt.compare，但为了简化，暂时跳过
      return false;
    }

    return false;
  }

  // 更新用户密码
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const result = await this.db.prepare(`
        UPDATE User SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(newPassword, userId).run();

      return result.meta.changes > 0;
    } catch (error) {
      console.error('更新密码失败:', error);
      return false;
    }
  }
} 