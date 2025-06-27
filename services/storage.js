const { Storage } = require('@google-cloud/storage');

let storage;
try {
  // Initialize storage with credentials from environment

  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    credentials: process.env.GCP_SA_KEY
  });
  console.log('Storage initialized with project:', process.env.GOOGLE_CLOUD_PROJECT);
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
  throw error;
}

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

const uploadToGCS = async (file, filename) => {
  console.log('Starting GCS upload with bucket:', bucketName);
  console.log('File details:', {
    filename,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer ? 'Buffer present' : 'No buffer'
  });
  
  if (!bucketName) {
    console.error('Missing GOOGLE_CLOUD_STORAGE_BUCKET environment variable');
    throw new Error('No storage bucket name provided');
  }

  try {
    const bucket = storage.bucket(bucketName);
    console.log('Accessing bucket:', bucketName);
    const blob = bucket.file(filename);
    console.log('Created blob for file:', filename);
    
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
      if (!file.buffer) {
        reject(new Error('No file buffer provided'));
        return;
      }
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