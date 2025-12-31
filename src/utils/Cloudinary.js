import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.COUDINARY_CLOUD_NAME,
  api_key: process.env.COUDINARY_API_KEY,
  api_secret: process.env.COUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    console.log("file is uploaded on cloudinary", response.secure_url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the localy saved temp file as the upload operation got failder
    console.log(error);
    return null;
  }
};

const deleteFromCloudinary = async (url) => {
  try {
    if (!url) return null;
    //delete from cloudinary
    const publicId = url.substring(
      url.lastIndexOf("/") + 1,
      url.lastIndexOf(".")
    );
    // console.log(publicId)
    const response = await cloudinary.uploader.destroy(publicId);
    console.log("Old image deleted")
    // console.log("RES form de", response);
    return response;
  } catch (error) {
    console.log("Error while deleting the file from cloudinary");
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
