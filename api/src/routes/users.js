const { Router }  = require('express');
const multer      = require('multer');
const verifyToken = require('../middlewares/verifyToken');
const { getAll, getById, update, promote, remove, uploadPicture } = require('../controllers/usersController');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/',                verifyToken, getAll);
router.get('/:id',             verifyToken, getById);
router.put('/:id',             verifyToken, update);
router.put('/:id/promote',     verifyToken, promote);
router.post('/:id/picture',    verifyToken, upload.single('image'), uploadPicture);
router.delete('/:id',          verifyToken, remove);

module.exports = router;
