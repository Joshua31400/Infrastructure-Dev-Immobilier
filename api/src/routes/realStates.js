const { Router }  = require('express');
const multer      = require('multer');
const verifyToken = require('../middlewares/verifyToken');
const {
  getAll, getAllAdmin, getSold, getById,
  sell, create, update, remove,
  uploadPicture, deletePicture,
} = require('../controllers/realStatesController');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// static segments must come before /:id
router.get('/all',  verifyToken, getAllAdmin);
router.get('/sold', verifyToken, getSold);

router.get('/',     getAll);
router.get('/:id',  getById);

router.post('/:id/sell',                       verifyToken, sell);
router.post('/:id/pictures',                   verifyToken, upload.single('image'), uploadPicture);
router.delete('/:id/pictures/:pictureId',      verifyToken, deletePicture);

router.post('/',    verifyToken, create);
router.put('/:id',  verifyToken, update);
router.delete('/:id', verifyToken, remove);

module.exports = router;
