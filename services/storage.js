const { Storage } = require('@google-cloud/storage');


let storage;
try {
  // Initialize storage using default authentication
  storage = new Storage();
  console.log('Storage initialized using default authentication');
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
  console.warn('Continuing without Google Cloud Storage - uploads may fail');
  storage = null;
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
  
  // Check if storage was properly initialized
  if (!storage) {
    console.error('Google Cloud Storage not initialized - cannot upload file');
    throw new Error('Storage service unavailable');
  }
  
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