const bcrypt = require('bcrypt');
const db     = require('../config/db');
const { uploadImage, deleteImage } = require('../utils/minio');

const parse = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
};

const REAL_STATES_SUBQUERY = `
  COALESCE(
    (SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'id',          rs.id,
        'description', rs.description,
        'price',       rs.price,
        'area',        rs.area,
        'category',    rs.category,
        'bought_at',   srs.sold_at,
        'address', JSON_OBJECT(
          'number', rsa.number, 'street', rsa.street,
          'neighborhood', rsa.neighborhood, 'city', rsa.city, 'postalCode', rsa.postal_code
        ),
        'agency', JSON_OBJECT(
          'name', ag.name,
          'address', JSON_OBJECT(
            'number', aga.number, 'street', aga.street,
            'neighborhood', aga.neighborhood, 'city', aga.city, 'postalCode', aga.postal_code
          )
        )
      )
    )
    FROM sold_real_states srs
    JOIN real_states rs  ON srs.real_state_id = rs.id
    JOIN addresses  rsa  ON rs.address_id      = rsa.id
    JOIN agencies   ag   ON rs.agency_id       = ag.id
    JOIN addresses  aga  ON ag.address_id      = aga.id
    WHERE srs.sold_to = u.id),
    JSON_ARRAY()
  ) AS real_states
`;

// GET /api/users — admin or manager
const getAll = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await db.query(
      `SELECT
        u.id, u.picture, u.username, u.email, u.role, u.created_at,
        JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                    'city', a.city, 'postalCode', a.postal_code) AS address,
        ${REAL_STATES_SUBQUERY}
      FROM users u
      LEFT JOIN addresses a ON u.address_id = a.id`
    );

    const data = rows.map((r) => ({
      ...r,
      address:     parse(r.address),
      real_states: parse(r.real_states) ?? [],
    }));

    return res.json(data);
  } catch (err) { next(err); }
};

// GET /api/users/:id — admin, manager or own profile
const getById = async (req, res, next) => {
  try {
    const { id: requesterId, role } = req.user;
    const targetId = parseInt(req.params.id);

    if (role !== 'admin' && role !== 'manager' && requesterId !== targetId)
      return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await db.query(
      `SELECT
        u.id, u.picture, u.username, u.email, u.role, u.created_at,
        JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                    'city', a.city, 'postalCode', a.postal_code) AS address,
        ${REAL_STATES_SUBQUERY}
      FROM users u
      LEFT JOIN addresses a ON u.address_id = a.id
      WHERE u.id = ?`,
      [targetId]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const r = rows[0];
    return res.json({
      ...r,
      address:     parse(r.address),
      real_states: parse(r.real_states) ?? [],
    });
  } catch (err) { next(err); }
};

// PUT /api/users/:id — own account or admin
const update = async (req, res, next) => {
  try {
    const { id: requesterId, role } = req.user;
    const targetId = parseInt(req.params.id);

    if (role !== 'admin' && requesterId !== targetId)
      return res.status(403).json({ error: 'Forbidden' });

    if (role !== 'admin' && requesterId !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [target] = await db.query('SELECT id, role, address_id FROM users WHERE id = ?', [targetId]);
    if (!target.length) return res.status(404).json({ error: 'User not found' });

    // prevent a non-admin from editing another admin
    if (target[0].role === 'admin' && requesterId !== targetId)
      return res.status(403).json({ error: 'Cannot modify another admin' });

    const { picture, username, email, password, address } = req.body;

    const hashed = password ? await bcrypt.hash(password, 10) : undefined;

    await db.query(
      `UPDATE users SET
        picture  = COALESCE(?, picture),
        username = COALESCE(?, username),
        email    = COALESCE(?, email),
        password = COALESCE(?, password)
       WHERE id = ?`,
      [picture ?? null, username ?? null, email ?? null, hashed ?? null, targetId]
    );

    if (address) {
      const { number, street, neighborhood, city, postalCode } = address;
      if (target[0].address_id) {
        await db.query(
          `UPDATE addresses SET
            number       = COALESCE(?, number),
            street       = COALESCE(?, street),
            neighborhood = COALESCE(?, neighborhood),
            city         = COALESCE(?, city),
            postal_code  = COALESCE(?, postal_code)
           WHERE id = ?`,
          [number, street, neighborhood, city, postalCode, target[0].address_id]
        );
      } else {
        const [addrResult] = await db.query(
          'INSERT INTO addresses (number, street, neighborhood, city, postal_code) VALUES (?, ?, ?, ?, ?)',
          [number, street, neighborhood, city, postalCode]
        );
        await db.query('UPDATE users SET address_id = ? WHERE id = ?', [addrResult.insertId, targetId]);
      }
    }

    return res.json({ success: true, id: targetId });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/promote — admin only
const promote = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const targetId = parseInt(req.params.id);
    const { role }  = req.body;

    if (!['admin', 'manager', 'client'].includes(role))
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager or client' });

    const [target] = await db.query('SELECT id, role FROM users WHERE id = ?', [targetId]);
    if (!target.length) return res.status(404).json({ error: 'User not found' });

    if (target[0].role === 'admin' && req.user.id !== targetId)
      return res.status(403).json({ error: 'Cannot change another admin\'s role' });

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);

    return res.json({ success: true, id: targetId });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id — own account or admin
const remove = async (req, res, next) => {
  try {
    const { id: requesterId, role } = req.user;
    const targetId = parseInt(req.params.id);

    if (role !== 'admin' && requesterId !== targetId)
      return res.status(403).json({ error: 'Forbidden' });

    const [target] = await db.query('SELECT id, role FROM users WHERE id = ?', [targetId]);
    if (!target.length) return res.status(404).json({ error: 'User not found' });

    if (target[0].role === 'admin' && requesterId !== targetId)
      return res.status(403).json({ error: 'Cannot delete another admin' });

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// POST /api/users/:id/picture — own account or admin
const uploadPicture = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    if (req.user.id !== targetId && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    if (!req.file)
      return res.status(400).json({ error: 'No image provided' });

    const [rows] = await db.query('SELECT picture FROM users WHERE id = ?', [targetId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    if (rows[0].picture) {
      try { await deleteImage(rows[0].picture); } catch {}
    }

    const url = await uploadImage(req.file);
    await db.query('UPDATE users SET picture = ? WHERE id = ?', [url, targetId]);

    return res.json({ success: true, url });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, update, promote, remove, uploadPicture };
