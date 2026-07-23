import { query, execute } from '../db.js';

const REQUIRED_CRED_FIELDS = ['type', 'project_id', 'private_key', 'client_email', 'client_id'];

export async function UploadCredentials(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'الملف مطلوب' });
    }

    let credentials;
    try {
      credentials = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      return res.status(400).json({ error: 'الملف يجب أن يكون JSON صالح' });
    }

    for (const field of REQUIRED_CRED_FIELDS) {
      if (!credentials[field]) {
        return res.status(400).json({ error: `الحقل "${field}" مفقود من ملف الاعتماد` });
      }
    }

    if (credentials.type !== 'service_account') {
      return res.status(400).json({ error: 'يجب أن يكون النوع service_account' });
    }

    const existing = await query('SELECT id FROM google_credentials WHERE id = 1');
    if (existing.length > 0) {
      if (req.body.replace === 'true') {
        await execute('DELETE FROM google_sheets');
      }
      await execute('UPDATE google_credentials SET credentials = ? WHERE id = 1', [JSON.stringify(credentials)]);
    } else {
      await execute('INSERT INTO google_credentials (id, credentials) VALUES (1, ?)', [JSON.stringify(credentials)]);
    }

    res.json({
      message: 'تم رفع ملف الاعتماد بنجاح',
      info: {
        type: credentials.type,
        project_id: credentials.project_id,
        client_email: credentials.client_email,
      }
    });
  } catch (error) {
    console.error('UploadCredentials error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function GetCredentialInfo(req, res) {
  try {
    const rows = await query('SELECT credentials FROM google_credentials WHERE id = 1');
    if (rows.length === 0) {
      return res.status(404).json({ error: 'لا توجد بيانات اعتماد' });
    }
    const creds = typeof rows[0].credentials === 'string' ? JSON.parse(rows[0].credentials) : rows[0].credentials;
    res.json({
      type: creds.type,
      project_id: creds.project_id,
      client_email: creds.client_email,
    });
  } catch (error) {
    console.error('GetCredentialInfo error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function GetSheets(req, res) {
  try {
    const rows = await query('SELECT * FROM google_sheets ORDER BY created_at DESC');
    const sheets = rows.map(row => ({
      ...row,
      is_active: Boolean(row.is_active),
    }));
    res.json({
      sheets,
      stats: {
        total: sheets.length,
        active: sheets.filter(s => s.is_active).length,
        inactive: sheets.filter(s => !s.is_active).length,
      }
    });
  } catch (error) {
    console.error('GetSheets error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function GetSheet(req, res) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT * FROM google_sheets WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الملف' });
    }

    const credRows = await query('SELECT credentials FROM google_credentials WHERE id = 1');
    let credentialInfo = null;
    if (credRows.length > 0) {
      const creds = typeof credRows[0].credentials === 'string' ? JSON.parse(credRows[0].credentials) : credRows[0].credentials;
      credentialInfo = {
        type: creds.type,
        project_id: creds.project_id,
        client_email: creds.client_email,
      };
    }

    res.json({
      sheet: { ...rows[0], is_active: Boolean(rows[0].is_active) },
      credentialInfo,
    });
  } catch (error) {
    console.error('GetSheet error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function CreateSheet(req, res) {
  try {
    const { file_name, file_id, paper_name, is_active } = req.body;

    if (!file_name || !file_id || !paper_name) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const result = await execute(
      'INSERT INTO google_sheets (file_name, file_id, paper_name, is_active) VALUES (?, ?, ?, ?)',
      [file_name, file_id, paper_name, is_active ? 1 : 0]
    );

    const sheet = await query('SELECT * FROM google_sheets WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...sheet[0], is_active: Boolean(sheet[0].is_active) });
  } catch (error) {
    console.error('CreateSheet error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function UpdateSheet(req, res) {
  try {
    const { id } = req.params;
    const { file_name, file_id, paper_name, is_active } = req.body;

    const existing = await query('SELECT id FROM google_sheets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الملف' });
    }

    await execute(
      'UPDATE google_sheets SET file_name = ?, file_id = ?, paper_name = ?, is_active = ? WHERE id = ?',
      [file_name, file_id, paper_name, is_active ? 1 : 0, id]
    );

    const sheet = await query('SELECT * FROM google_sheets WHERE id = ?', [id]);
    res.json({ ...sheet[0], is_active: Boolean(sheet[0].is_active) });
  } catch (error) {
    console.error('UpdateSheet error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function DeleteSheet(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM google_sheets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الملف' });
    }
    await execute('DELETE FROM google_sheets WHERE id = ?', [id]);
    res.json({ message: 'تم حذف الملف بنجاح' });
  } catch (error) {
    console.error('DeleteSheet error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function ToggleSheetStatus(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id, is_active FROM google_sheets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الملف' });
    }
    const newStatus = existing[0].is_active ? 0 : 1;
    await execute('UPDATE google_sheets SET is_active = ? WHERE id = ?', [newStatus, id]);
    const sheet = await query('SELECT * FROM google_sheets WHERE id = ?', [id]);
    res.json({ ...sheet[0], is_active: Boolean(sheet[0].is_active) });
  } catch (error) {
    console.error('ToggleSheetStatus error:', error);
    res.status(500).json({ error: error.message });
  }
}
