const { Router }  = require('express');
const verifyToken = require('../middlewares/verifyToken');
const {
  getAll, getById, create, update, remove,
  addManager, removeManager,
} = require('../controllers/agenciesController');

const router = Router();

router.get('/',                           verifyToken, getAll);
router.get('/:id',                        verifyToken, getById);
router.post('/',                          verifyToken, create);
router.put('/:id',                        verifyToken, update);
router.delete('/:id',                     verifyToken, remove);
router.post('/:id/managers',              verifyToken, addManager);
router.delete('/:id/managers/:userId',    verifyToken, removeManager);

module.exports = router;
