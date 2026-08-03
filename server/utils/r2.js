import dotenv from 'dotenv';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || value.startsWith('<') || value === '...') {
    throw new Error(`Missing R2 configuration: ${name} is not set in server/.env`);
  }
  return value;
};

const accountId = requireEnv('R2_ACCOUNT_ID');
const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
const bucketName = requireEnv('R2_BUCKET_NAME');
export const publicUrl = requireEnv('R2_PUBLIC_URL');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const getExtension = (originalName) => {
  if (!originalName) return '';
  const parts = originalName.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  return ext && /^[a-zA-Z0-9]{1,5}$/.test(ext) ? `.${ext.toLowerCase()}` : '';
};

export const uploadImage = async (buffer, contentType, originalName) => {
  const key = `uploads/${Date.now()}-${crypto.randomUUID()}${getExtension(originalName)}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    })
  );

  return { key, url: `${publicUrl}/${key}` };
};

export const deleteImage = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
};
