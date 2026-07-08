import {v2 as cloudinary} from "cloudinary";
cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET});
export interface UploadResult{url:string;publicId:string;width?:number;height?:number;format?:string;bytes?:number}
export async function uploadImage(source:string,folder="bakrawale/goats"):Promise<UploadResult>{
  const r=await cloudinary.uploader.upload(source,{folder,transformation:[{width:1000,height:1000,crop:"limit"},{quality:"auto:good"},{fetch_format:"auto"}]});
  return{url:r.secure_url,publicId:r.public_id,width:r.width,height:r.height,format:r.format,bytes:r.bytes};
}
export async function uploadVideo(source:string,folder="bakrawale/videos"):Promise<UploadResult>{
  const r=await cloudinary.uploader.upload(source,{resource_type:"video",folder,transformation:[{width:1280,height:720,crop:"limit"}]});
  return{url:r.secure_url,publicId:r.public_id,format:r.format,bytes:r.bytes};
}
export async function deleteFile(publicId:string,resourceType:"image"|"video"="image"):Promise<void>{
  await cloudinary.uploader.destroy(publicId,{resource_type:resourceType});
}
export function generateUploadSignature(folder:string){
  const timestamp=Math.round(new Date().getTime()/1000);
  const signature=cloudinary.utils.api_sign_request({timestamp,folder},process.env.CLOUDINARY_API_SECRET!);
  return{timestamp,signature,cloudName:process.env.CLOUDINARY_CLOUD_NAME,apiKey:process.env.CLOUDINARY_API_KEY,folder};
}
export default cloudinary;
