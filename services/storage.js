const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

const uploadToGCS = async (file, filename) => {
  if (!bucketName) {
    throw new Error('No storage bucket name provided');
  }

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(filename);
  
  // Create a write stream and pipe the file buffer to it
  const blobStream = blob.createWriteStream({
    resumable: false,
    gzip: true,
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      // Make the file public
      await blob.makePublic();
      
      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};

module.exports = {
  uploadToGCS
}; 