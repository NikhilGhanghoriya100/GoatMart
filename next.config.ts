import type {NextConfig} from "next";
const nextConfig:NextConfig={
  images:{remotePatterns:[{protocol:"https",hostname:"res.cloudinary.com"},{protocol:"https",hostname:"i.pravatar.cc"},{protocol:"https",hostname:"upload.wikimedia.org"},{protocol:"https",hostname:"*.pravatar.cc"}]},
  experimental:{serverActions:{allowedOrigins:["localhost:3000","bakrawale.com"]}},
};
export default nextConfig;
