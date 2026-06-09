const Minio = require('minio');

const client = new Minio.Client({
  endPoint:  process.env.MINIO_ENDPOINT,
  port:      parseInt(process.env.MINIO_PORT),
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET = process.env.MINIO_BUCKET;

const uploadImage = async (file) => {
  const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
  await client.putObject(BUCKET, filename, file.buffer, file.size, {
    'Content-Type': file.mimetype,
  });
  return `${process.env.MINIO_PUBLIC_URL}/${BUCKET}/${filename}`;
};

const deleteImage = async (url) => {
  const filename = url.split('/').pop();
  await client.removeObject(BUCKET, filename);
};

module.exports = { uploadImage, deleteImage };
