// Storage entry point used by the API routes: uploads go to Cloudinary when it is configured
// (see lib/cloudinary-api.js), otherwise to PostgreSQL / local files (lib/file-storage.js).
export {
  saveUploadedFile,
  deleteUploadedFile,
  uploadToCloudinaryOrLocal,
  deleteFromCloudinary,
  optimizeImageBuffer,
  getUploadsDir
} from './file-storage.js';
export { cloudinaryConfig, uploadBufferToCloudinary, deleteCloudinaryUrl, signedUploadParams, parseCloudinaryUrl, isOurCloudinaryUrl } from './cloudinary-api.js';
