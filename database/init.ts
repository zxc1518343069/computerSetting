import pool from '../lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
    const client = await pool.connect();

    try {
        console.log('Starting database initialization...');

        // 读取并执行 schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // 分割SQL语句并执行
        const statements = schema
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                await client.query(statement);
            } catch (error) {
                console.error('Error executing statement:', error);
            }
        }

        // 创建默认管理员账户
        const adminUsername = process.env.ADMIN_USERNAME || 'yangshuhao';
        const adminPassword = process.env.ADMIN_PASSWORD || 'wangman';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await client.query(
            `INSERT INTO admin_users (username, password_hash)
             VALUES ($1, $2)
             ON CONFLICT (username)
             DO UPDATE SET password_hash = $2`,
            [adminUsername, hashedPassword]
        );

        console.log('Database initialized successfully!');
        console.log(`Admin user created: ${adminUsername}`);
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed to initialize database:', error);
            process.exit(1);
        });
}

export default initDatabase;
