const { Storage } = require('@google-cloud/storage');

let storage;
try {
  // Initialize storage with credentials from environment
  let credentials;
  
  if (process.env.GCP_SA_KEY) {
    try {
      let credentialsString = process.env.GCP_SA_KEY.trim();
      
      // First, check if it's already a JSON object (if someone accidentally stringified an object)
      if (credentialsString.startsWith('{') && credentialsString.endsWith('}')) {
        console.log('Detected JSON format credentials');
        credentials = JSON.parse(credentialsString);
      } else {
        // Check if it's base64 encoded
        // Base64 strings typically don't contain { } characters and are longer
        try {
          // Attempt to decode as base64
          const decoded = Buffer.from(credentialsString, 'base64').toString('utf-8');
          
          // Check if the decoded string is valid JSON
          if (decoded.startsWith('{') && decoded.endsWith('}')) {
            console.log('Detected base64 encoded credentials, decoding...');
            credentials = JSON.parse(decoded);
          } else {
            // If base64 decode doesn't result in JSON, treat original as JSON
            console.log('Base64 decode unsuccessful, treating as JSON string');
            credentials = JSON.parse(credentialsString);
          }
        } catch (base64Error) {
          // If base64 decoding fails, try parsing as direct JSON
          console.log('Not base64 encoded, parsing as JSON string');
          credentials = JSON.parse(credentialsString);
        }
      }
      
      // Validate required fields
      if (!credentials || typeof credentials !== 'object') {
        throw new Error('Credentials must be a valid JSON object');
      }
      
      if (!credentials.client_email) {
        throw new Error('Service account credentials missing client_email field');
      }
      
      if (!credentials.private_key) {
        throw new Error('Service account credentials missing private_key field');
      }
      
      if (!credentials.project_id) {
        throw new Error('Service account credentials missing project_id field');
      }
      
      if (credentials.type !== 'service_account') {
        throw new Error('Credentials type must be "service_account"');
      }
      
      console.log('Successfully parsed service account credentials');
      console.log('Project ID:', credentials.project_id);
      console.log('Client Email:', credentials.client_email);
      
    } catch (parseError) {
      console.error('Error parsing GCP_SA_KEY:', parseError.message);
      console.error('Raw GCP_SA_KEY length:', process.env.GCP_SA_KEY?.length);
      console.error('GCP_SA_KEY preview:', process.env.GCP_SA_KEY?.substring(0, 100) + '...');
      throw new Error(`Invalid GCP_SA_KEY format: ${parseError.message}`);
    }
  } else {
    console.log('No GCP_SA_KEY provided, attempting default authentication');
    credentials = undefined;
  }

  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || credentials?.project_id,
    credentials: credentials
  });
  
  console.log('Storage initialized successfully');
  console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT || credentials?.project_id);
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