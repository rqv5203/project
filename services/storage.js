const { Storage } = require('@google-cloud/storage');

let storage;
try {
  if (process.env.GCP_SA_KEY) {
    const credentials = JSON.parse(process.env.GCP_SA_KEY);
    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentials
    });
  } else {
    console.warn('GCP_SA_KEY not found, falling back to default credentials');
    storage = new Storage();
  }
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
  throw error;
}

const bucketName = 'weather-images-bucket';

const uploadToGCS = async (file, filename) => {
  console.log('Starting GCS upload with bucket:', bucketName);
  
  if (!bucketName) {
    console.error('Missing GOOGLE_CLOUD_STORAGE_BUCKET environment variable');
    throw new Error('No storage bucket name provided');
  }

  try {
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
        console.error('GCS upload stream error:', err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        try {
          // Make the file public
          await blob.makePublic();
          
          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
          console.log('Successfully uploaded to GCS:', publicUrl);
          resolve(publicUrl);
        } catch (err) {
          console.error('Error making blob public:', err);
          reject(err);
        }
      });

      console.log('Writing file to GCS stream...');
      blobStream.end(file.buffer);
    });
  } catch (err) {
    console.error('Error initializing GCS upload:', err);
    throw err;
  }
};

module.exports = {
  uploadToGCS
}; 