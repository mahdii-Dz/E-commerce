import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, execute } from '../db.js';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function CreateWorker(req, res) {
  try {
    const { full_name, email, password, role, permissions, status } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required' });
    }

    const existing = await query('SELECT id FROM shop_workers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A worker with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const perms = permissions || (role === 'owner' ? ['*'] : []);
    const workerRole = role || 'worker';
    const workerStatus = status || 'active';

    const result = await execute(
      "INSERT INTO shop_workers (full_name, email, password, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?)",
      [full_name, email, hashedPassword, workerRole, JSON.stringify(perms), workerStatus]
    );

    const worker = await query('SELECT id, full_name, email, role, permissions, status, created_at FROM shop_workers WHERE id = ?', [result.insertId]);

    res.status(201).json(worker[0]);
  } catch (error) {
    console.error('CreateWorker error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function GetWorkers(req, res) {
  try {
    const rows = await query('SELECT id, full_name, email, role, permissions, status, created_at FROM shop_workers ORDER BY created_at DESC');

    const workers = rows.map(w => ({
      ...w,
      permissions: typeof w.permissions === 'string' ? JSON.parse(w.permissions) : w.permissions,
    }));

    const total = workers.length;
    const active = workers.filter(w => w.status === 'active').length;
    const inactive = workers.filter(w => w.status === 'inactive').length;

    res.json({ workers, stats: { total, active, inactive } });
  } catch (error) {
    console.error('GetWorkers error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function GetWorker(req, res) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id, full_name, email, role, permissions, status, created_at FROM shop_workers WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const worker = rows[0];
    worker.permissions = typeof worker.permissions === 'string' ? JSON.parse(worker.permissions) : worker.permissions;

    res.json(worker);
  } catch (error) {
    console.error('GetWorker error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function UpdateWorker(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, password, role, permissions, status } = req.body;

    const existing = await query('SELECT * FROM shop_workers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const updates = [];
    const params = [];

    if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await execute(`UPDATE shop_workers SET ${updates.join(', ')} WHERE id = ?`, params);

    const worker = await query('SELECT id, full_name, email, role, permissions, status, created_at FROM shop_workers WHERE id = ?', [id]);
    worker[0].permissions = typeof worker[0].permissions === 'string' ? JSON.parse(worker[0].permissions) : worker[0].permissions;

    res.json(worker[0]);
  } catch (error) {
    console.error('UpdateWorker error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function DeleteWorker(req, res) {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, role FROM shop_workers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    if (existing[0].role === 'owner') {
      return res.status(403).json({ error: 'Cannot delete the owner account' });
    }

    await execute('DELETE FROM worker_sessions WHERE worker_id = ?', [id]);
    await execute('DELETE FROM shop_workers WHERE id = ?', [id]);

    res.json({ success: true, message: 'Worker deleted' });
  } catch (error) {
    console.error('DeleteWorker error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function LoginWorker(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const rows = await query('SELECT * FROM shop_workers WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const worker = rows[0];

    if (worker.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Contact the owner.' });
    }

    const valid = await bcrypt.compare(password, worker.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken();
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;

    await execute(
      'INSERT INTO worker_sessions (worker_id, token, expires_at) VALUES (?, ?, ?)',
      [worker.id, token, expiresAt]
    );

    const permissions = typeof worker.permissions === 'string' ? JSON.parse(worker.permissions) : worker.permissions;

    res.json({
      success: true,
      token,
      worker: {
        id: worker.id,
        full_name: worker.full_name,
        email: worker.email,
        role: worker.role,
        permissions,
        status: worker.status,
      }
    });
  } catch (error) {
    console.error('LoginWorker error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function LogoutWorker(req, res) {
  try {
    let token = null;
    const authHeader = req.headers['authorization'] || '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      token = bearerMatch[1];
    }
    if (!token) {
      const cookies = req.headers.cookie || '';
      const match = cookies.match(/worker_session=([^;]+)/);
      token = match ? match[1] : null;
    }
    if (token) {
      await execute('DELETE FROM worker_sessions WHERE token = ?', [token]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('LogoutWorker error:', error);
    res.json({ success: true });
  }
}

export async function CheckWorkerSession(req, res) {
  try {
    let token = null;

    const authHeader = req.headers['authorization'] || '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      token = bearerMatch[1];
    }

    if (!token) {
      const cookies = req.headers.cookie || '';
      const match = cookies.match(/worker_session=([^;]+)/);
      token = match ? match[1] : null;
    }

    if (!token) {
      return res.json({ authenticated: false });
    }

    const sessions = await query(
      'SELECT worker_id, expires_at FROM worker_sessions WHERE token = ?',
      [token]
    );

    if (sessions.length === 0) {
      return res.json({ authenticated: false });
    }

    const session = sessions[0];

    if (Date.now() > session.expires_at) {
      await execute('DELETE FROM worker_sessions WHERE token = ?', [token]);
      return res.json({ authenticated: false, reason: 'Session expired' });
    }

    const workers = await query(
      'SELECT id, full_name, email, role, permissions, status, created_at FROM shop_workers WHERE id = ?',
      [session.worker_id]
    );

    if (workers.length === 0 || workers[0].status !== 'active') {
      return res.json({ authenticated: false });
    }

    const worker = workers[0];
    worker.permissions = typeof worker.permissions === 'string' ? JSON.parse(worker.permissions) : worker.permissions;

    res.json({
      authenticated: true,
      worker: {
        id: worker.id,
        full_name: worker.full_name,
        email: worker.email,
        role: worker.role,
        permissions: worker.permissions,
        status: worker.status,
      }
    });
  } catch (error) {
    console.error('CheckWorkerSession error:', error);
    res.status(500).json({ error: error.message });
  }
}
