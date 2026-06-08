const db                        = require('../config/db');
const { uploadImage, deleteImage } = require('../utils/minio');

const parse = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
};

const isManagerOfRealState = async (userId, realStateId) => {
  const [rows] = await db.query(
    `SELECT 1 FROM agency_managers am
     JOIN real_states rs ON rs.agency_id = am.agency_id
     WHERE am.user_id = ? AND rs.id = ?`,
    [userId, realStateId]
  );
  return rows.length > 0;
};

const isManagerOfAgency = async (userId, agencyId) => {
  const [rows] = await db.query(
    'SELECT 1 FROM agency_managers WHERE user_id = ? AND agency_id = ?',
    [userId, agencyId]
  );
  return rows.length > 0;
};

// GET /api/real-states — public, non-sold only
const getAll = async (req, res, next) => {
  try {
    const { search, min_price, max_price, min_area, max_area, category, agency_id } = req.query;

    let where = 'WHERE rs.id NOT IN (SELECT real_state_id FROM sold_real_states)';
    const params = [];

    if (search) {
      where += ' AND (rs.description LIKE ? OR rs.category LIKE ? OR a.city LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (min_price)  { where += ' AND rs.price >= ?';     params.push(min_price); }
    if (max_price)  { where += ' AND rs.price <= ?';     params.push(max_price); }
    if (min_area)   { where += ' AND rs.area >= ?';      params.push(min_area); }
    if (max_area)   { where += ' AND rs.area <= ?';      params.push(max_area); }
    if (category)   { where += ' AND rs.category = ?';   params.push(category); }
    if (agency_id)  { where += ' AND rs.agency_id = ?';  params.push(agency_id); }

    const [rows] = await db.query(
      `SELECT
        rs.id, rs.description, rs.price, rs.area, rs.category,
        JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                    'city', a.city, 'postalCode', a.postal_code) AS address,
        JSON_OBJECT(
          'name', ag.name,
          'address', JSON_OBJECT('number', aa.number, 'street', aa.street,
                                 'neighborhood', aa.neighborhood, 'city', aa.city,
                                 'postalCode', aa.postal_code)
        ) AS agency,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'url', p.url))
           FROM real_state_pictures p WHERE p.real_state_id = rs.id),
          JSON_ARRAY()
        ) AS pictures
      FROM real_states rs
      JOIN addresses a  ON rs.address_id = a.id
      JOIN agencies  ag ON rs.agency_id  = ag.id
      JOIN addresses aa ON ag.address_id = aa.id
      ${where}`,
      params
    );

    const data = rows.map((r) => ({
      ...r,
      address:  parse(r.address),
      agency:   parse(r.agency),
      pictures: parse(r.pictures) ?? [],
    }));

    return res.json(data);
  } catch (err) { next(err); }
};

// GET /api/real-states/all — admin or manager, includes sold
const getAllAdmin = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await db.query(
      `SELECT
        rs.id, rs.description, rs.price, rs.area, rs.category,
        IF(srs.id IS NOT NULL,
          JSON_OBJECT('sold_to', srs.sold_to, 'sold_at', srs.sold_at),
          NULL
        ) AS sold,
        JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                    'city', a.city, 'postalCode', a.postal_code) AS address,
        JSON_OBJECT(
          'name', ag.name,
          'managers', COALESCE(
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('username', u.username, 'email', u.email))
             FROM agency_managers am JOIN users u ON am.user_id = u.id
             WHERE am.agency_id = ag.id),
            JSON_ARRAY()
          ),
          'address', JSON_OBJECT('number', aa.number, 'street', aa.street,
                                 'neighborhood', aa.neighborhood, 'city', aa.city,
                                 'postalCode', aa.postal_code)
        ) AS agency,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'url', p.url))
           FROM real_state_pictures p WHERE p.real_state_id = rs.id),
          JSON_ARRAY()
        ) AS pictures
      FROM real_states rs
      LEFT JOIN sold_real_states srs ON srs.real_state_id = rs.id
      JOIN addresses a  ON rs.address_id = a.id
      JOIN agencies  ag ON rs.agency_id  = ag.id
      JOIN addresses aa ON ag.address_id = aa.id`
    );

    const data = rows.map((r) => ({
      ...r,
      sold:     parse(r.sold),
      address:  parse(r.address),
      agency:   parse(r.agency),
      pictures: parse(r.pictures) ?? [],
    }));

    return res.json(data);
  } catch (err) { next(err); }
};

// GET /api/real-states/sold — admin or manager
const getSold = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await db.query(
      `SELECT
        rs.id, rs.description, rs.price, rs.area, rs.category,
        JSON_OBJECT('sold_to', srs.sold_to, 'sold_at', srs.sold_at) AS sold_infos,
        JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                    'city', a.city, 'postalCode', a.postal_code) AS address,
        JSON_OBJECT(
          'name', ag.name,
          'managers', COALESCE(
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('username', u.username, 'email', u.email))
             FROM agency_managers am JOIN users u ON am.user_id = u.id
             WHERE am.agency_id = ag.id),
            JSON_ARRAY()
          ),
          'address', JSON_OBJECT('number', aa.number, 'street', aa.street,
                                 'neighborhood', aa.neighborhood, 'city', aa.city,
                                 'postalCode', aa.postal_code)
        ) AS agency
      FROM sold_real_states srs
      JOIN real_states rs ON srs.real_state_id = rs.id
      JOIN addresses  a  ON rs.address_id = a.id
      JOIN agencies   ag ON rs.agency_id  = ag.id
      JOIN addresses  aa ON ag.address_id = aa.id`
    );

    const data = rows.map((r) => ({
      ...r,
      sold_infos: parse(r.sold_infos),
      address:    parse(r.address),
      agency:     parse(r.agency),
    }));

    return res.json(data);
  } catch (err) { next(err); }
};

// GET /api/real-states/:id — public
const getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        rs.id, rs.description, rs.price, rs.area, rs.category,
        (srs.id IS NOT NULL) AS sold,
        JSON_OBJECT('number', a.number, 'street', a.street, 'neighborhood', a.neighborhood,
                    'city', a.city, 'postalCode', a.postal_code) AS address,
        JSON_OBJECT(
          'name', ag.name,
          'managers', COALESCE(
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('username', u.username, 'email', u.email))
             FROM agency_managers am JOIN users u ON am.user_id = u.id
             WHERE am.agency_id = ag.id),
            JSON_ARRAY()
          ),
          'address', JSON_OBJECT('number', aa.number, 'street', aa.street,
                                 'neighborhood', aa.neighborhood, 'city', aa.city,
                                 'postalCode', aa.postal_code)
        ) AS agency,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'url', p.url))
           FROM real_state_pictures p WHERE p.real_state_id = rs.id),
          JSON_ARRAY()
        ) AS pictures
      FROM real_states rs
      LEFT JOIN sold_real_states srs ON srs.real_state_id = rs.id
      JOIN addresses a  ON rs.address_id = a.id
      JOIN agencies  ag ON rs.agency_id  = ag.id
      JOIN addresses aa ON ag.address_id = aa.id
      WHERE rs.id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Real state not found' });

    const r = rows[0];
    return res.json({
      ...r,
      sold:     Boolean(r.sold),
      address:  parse(r.address),
      agency:   parse(r.agency),
      pictures: parse(r.pictures) ?? [],
    });
  } catch (err) { next(err); }
};

// POST /api/real-states/:id/sell — client only
const sell = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    if (role !== 'client')
      return res.status(403).json({ error: 'Only clients can buy real states' });

    const realStateId = req.params.id;

    const [rs] = await db.query('SELECT id FROM real_states WHERE id = ?', [realStateId]);
    if (!rs.length) return res.status(404).json({ error: 'Real state not found' });

    const [already] = await db.query(
      'SELECT id FROM sold_real_states WHERE real_state_id = ?',
      [realStateId]
    );
    if (already.length) return res.status(409).json({ error: 'Real state already sold' });

    await db.query(
      'INSERT INTO sold_real_states (real_state_id, sold_to) VALUES (?, ?)',
      [realStateId, id]
    );

    return res.json({ success: true, id: parseInt(realStateId) });
  } catch (err) { next(err); }
};

// POST /api/real-states — admin or manager
const create = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const { description, price, area, category, address, agency_id } = req.body;
    if (!description || !price || !area || !category || !address || !agency_id)
      return res.status(400).json({ error: 'All fields are required' });

    if (role === 'manager' && !(await isManagerOfAgency(userId, agency_id)))
      return res.status(403).json({ error: 'You do not manage this agency' });

    const { number, street, neighborhood, city, postalCode } = address;
    const [addrResult] = await db.query(
      'INSERT INTO addresses (number, street, neighborhood, city, postal_code) VALUES (?, ?, ?, ?, ?)',
      [number, street, neighborhood, city, postalCode]
    );

    const [rsResult] = await db.query(
      'INSERT INTO real_states (description, price, area, category, agency_id, address_id) VALUES (?, ?, ?, ?, ?, ?)',
      [description, price, area, category, agency_id, addrResult.insertId]
    );

    return res.status(201).json({ success: true, id: rsResult.insertId });
  } catch (err) { next(err); }
};

// PUT /api/real-states/:id — admin or manager of this real state
const update = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const realStateId = req.params.id;

    const [rs] = await db.query(
      'SELECT id, address_id FROM real_states WHERE id = ?',
      [realStateId]
    );
    if (!rs.length) return res.status(404).json({ error: 'Real state not found' });

    if (role === 'manager' && !(await isManagerOfRealState(userId, realStateId)))
      return res.status(403).json({ error: 'You do not manage this real state' });

    const { description, price, area, category, address, agency_id } = req.body;

    await db.query(
      `UPDATE real_states SET
        description = COALESCE(?, description),
        price       = COALESCE(?, price),
        area        = COALESCE(?, area),
        category    = COALESCE(?, category),
        agency_id   = COALESCE(?, agency_id)
       WHERE id = ?`,
      [description, price, area, category, agency_id, realStateId]
    );

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
        [number, street, neighborhood, city, postalCode, rs[0].address_id]
      );
    }

    return res.json({ success: true, id: parseInt(realStateId) });
  } catch (err) { next(err); }
};

// DELETE /api/real-states/:id — admin or manager of this real state
const remove = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const realStateId = req.params.id;

    const [rs] = await db.query('SELECT id FROM real_states WHERE id = ?', [realStateId]);
    if (!rs.length) return res.status(404).json({ error: 'Real state not found' });

    if (role === 'manager' && !(await isManagerOfRealState(userId, realStateId)))
      return res.status(403).json({ error: 'You do not manage this real state' });

    const [pics] = await db.query(
      'SELECT url FROM real_state_pictures WHERE real_state_id = ?',
      [realStateId]
    );
    await Promise.all(pics.map((p) => deleteImage(p.url).catch(() => {})));

    await db.query('DELETE FROM real_states WHERE id = ?', [realStateId]);

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// POST /api/real-states/:id/pictures — admin or manager of this real state
const uploadPicture = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const realStateId = req.params.id;

    const [rs] = await db.query('SELECT id FROM real_states WHERE id = ?', [realStateId]);
    if (!rs.length) return res.status(404).json({ error: 'Real state not found' });

    if (role === 'manager' && !(await isManagerOfRealState(userId, realStateId)))
      return res.status(403).json({ error: 'You do not manage this real state' });

    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    const url = await uploadImage(req.file);
    const [result] = await db.query(
      'INSERT INTO real_state_pictures (real_state_id, url) VALUES (?, ?)',
      [realStateId, url]
    );

    return res.status(201).json({ success: true, id: result.insertId, url });
  } catch (err) { next(err); }
};

// DELETE /api/real-states/:id/pictures/:pictureId — admin or manager of this real state
const deletePicture = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'admin' && role !== 'manager')
      return res.status(403).json({ error: 'Forbidden' });

    const { id: realStateId, pictureId } = req.params;

    if (role === 'manager' && !(await isManagerOfRealState(userId, realStateId)))
      return res.status(403).json({ error: 'You do not manage this real state' });

    const [pics] = await db.query(
      'SELECT id, url FROM real_state_pictures WHERE id = ? AND real_state_id = ?',
      [pictureId, realStateId]
    );
    if (!pics.length) return res.status(404).json({ error: 'Picture not found' });

    await deleteImage(pics[0].url);
    await db.query('DELETE FROM real_state_pictures WHERE id = ?', [pictureId]);

    return res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getAllAdmin, getSold, getById,
  sell, create, update, remove,
  uploadPicture, deletePicture,
};
