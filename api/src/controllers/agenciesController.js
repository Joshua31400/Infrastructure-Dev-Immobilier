const db = require('../config/db');

const parse = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
};

const AGENCY_SELECT = `
  SELECT
    ag.id, ag.name,
    JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                'city', a.city, 'postalCode', a.postal_code) AS address,
    COALESCE(
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('username', u.username, 'email', u.email))
       FROM agency_managers am JOIN users u ON am.user_id = u.id
       WHERE am.agency_id = ag.id),
      JSON_ARRAY()
    ) AS managers
  FROM agencies ag
  JOIN addresses a ON ag.address_id = a.id
`;

// GET /api/agencies
const getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(AGENCY_SELECT);
    const data = rows.map((r) => ({
      ...r,
      address:  parse(r.address),
      managers: parse(r.managers) ?? [],
    }));
    return res.json(data);
  } catch (err) { next(err); }
};

// GET /api/agencies/:id
const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`${AGENCY_SELECT} WHERE ag.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Agency not found' });
    const r = rows[0];
    return res.json({
      ...r,
      address:  parse(r.address),
      managers: parse(r.managers) ?? [],
    });
  } catch (err) { next(err); }
};

// POST /api/agencies — admin only
const create = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const { name, address } = req.body;
    if (!name || !address)
      return res.status(400).json({ error: 'Name and address are required' });

    const { number, street, neighborhood, city, postalCode } = address;
    const [addrResult] = await db.query(
      'INSERT INTO addresses (number, street, neighborhood, city, postal_code) VALUES (?, ?, ?, ?, ?)',
      [number, street, neighborhood, city, postalCode]
    );

    const [result] = await db.query(
      'INSERT INTO agencies (name, address_id) VALUES (?, ?)',
      [name, addrResult.insertId]
    );

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
};

// PUT /api/agencies/:id — admin only
const update = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const agencyId = req.params.id;
    const [ag] = await db.query('SELECT id, address_id FROM agencies WHERE id = ?', [agencyId]);
    if (!ag.length) return res.status(404).json({ error: 'Agency not found' });

    const { name, address } = req.body;

    if (name) {
      await db.query('UPDATE agencies SET name = ? WHERE id = ?', [name, agencyId]);
    }

    if (address) {
      const { number, street, neighborhood, city, postalCode } = address;
      await db.query(
        `UPDATE addresses SET
          number       = COALESCE(?, number),
          street       = COALESCE(?, street),
          neighborhood = COALESCE(?, neighborhood),
          city         = COALESCE(?, city),
          postal_code  = COALESCE(?, postal_code)
         WHERE id = ?`,
        [number, street, neighborhood, city, postalCode, ag[0].address_id]
      );
    }

    return res.json({ success: true, id: parseInt(agencyId) });
  } catch (err) { next(err); }
};

// DELETE /api/agencies/:id — admin only
const remove = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const agencyId = req.params.id;
    const [ag] = await db.query('SELECT id FROM agencies WHERE id = ?', [agencyId]);
    if (!ag.length) return res.status(404).json({ error: 'Agency not found' });

    await db.query('DELETE FROM agencies WHERE id = ?', [agencyId]);

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// POST /api/agencies/:id/managers — admin only
const addManager = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const agencyId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const [ag] = await db.query('SELECT id FROM agencies WHERE id = ?', [agencyId]);
    if (!ag.length) return res.status(404).json({ error: 'Agency not found' });

    const [user] = await db.query('SELECT id, role FROM users WHERE id = ?', [user_id]);
    if (!user.length) return res.status(404).json({ error: 'User not found' });
    if (user[0].role !== 'manager')
      return res.status(400).json({ error: 'User must have manager role' });

    const [existing] = await db.query(
      'SELECT 1 FROM agency_managers WHERE agency_id = ? AND user_id = ?',
      [agencyId, user_id]
    );
    if (existing.length)
      return res.status(409).json({ error: 'User is already a manager of this agency' });

    await db.query(
      'INSERT INTO agency_managers (agency_id, user_id) VALUES (?, ?)',
      [agencyId, user_id]
    );

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// DELETE /api/agencies/:id/managers/:userId — admin only
const removeManager = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const { id: agencyId, userId } = req.params;

    const [ag] = await db.query('SELECT id FROM agencies WHERE id = ?', [agencyId]);
    if (!ag.length) return res.status(404).json({ error: 'Agency not found' });

    const [user] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    const [link] = await db.query(
      'SELECT 1 FROM agency_managers WHERE agency_id = ? AND user_id = ?',
      [agencyId, userId]
    );
    if (!link.length)
      return res.status(404).json({ error: 'User is not a manager of this agency' });

    await db.query(
      'DELETE FROM agency_managers WHERE agency_id = ? AND user_id = ?',
      [agencyId, userId]
    );

    return res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, addManager, removeManager };
