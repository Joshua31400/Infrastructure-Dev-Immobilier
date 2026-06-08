const { Router }  = require('express');
const verifyToken = require('../middlewares/verifyToken');
const { getAll, getById, update, promote, remove } = require('../controllers/usersController');

const router = Router();

router.get('/',           verifyToken, getAll);
router.get('/:id',        verifyToken, getById);
router.put('/:id',        verifyToken, update);
router.put('/:id/promote', verifyToken, promote);
router.delete('/:id',     verifyToken, remove);

module.exports = router;
