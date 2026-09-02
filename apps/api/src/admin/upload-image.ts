/* Shape of a multer memory-storage upload; declared locally so the build
   does not depend on the Express.Multer global namespace. */
export type UploadedImage = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};
