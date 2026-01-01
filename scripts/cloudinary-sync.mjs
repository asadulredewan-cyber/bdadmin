import fs from "fs";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const OUTPUT = "assets/json/cloudinary.json";

// 🔑 extract folder from public_id
function extractFolder(publicId) {
  if (!publicId.includes("/")) return "root";

  // Home/products/id 1-10/image → Home/products/id 1-10
  return publicId.split("/").slice(0, -1).join("/");
}

// 🔑 normalize to your UI requirement
function normalizeFolder(fullPath) {
  // তুমি চাও: Home/products/id 1-10 → id 1-10
  const parts = fullPath.split("/");

  const idx = parts.indexOf("products");
  if (idx !== -1 && parts[idx + 1]) {
    return parts[idx + 1]; // id 1-10
  }

  return fullPath;
}

async function getAllImages() {
  const folderMap = {};
  let nextCursor = null;

  do {
    const res = await cloudinary.v2.api.resources({
      type: "upload",
      max_results: 500,
      next_cursor: nextCursor
    });

    res.resources.forEach(img => {
      const fullFolder = extractFolder(img.public_id);
      const folder = normalizeFolder(fullFolder);

      if (!folderMap[folder]) folderMap[folder] = [];

      folderMap[folder].push({
        public_id: img.public_id.split("/").pop(),
        url: img.secure_url
      });
    });

    nextCursor = res.next_cursor;
  } while (nextCursor);

  return Object.keys(folderMap).map(folder => ({
    folder,
    images: folderMap[folder]
  }));
}

(async () => {
  console.log("🔄 Fetching Cloudinary images...");

  const folders = await getAllImages();

  const json = {
    updatedAt: Date.now(),
    folders
  };

  fs.mkdirSync("assets/json", { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(json, null, 2));

  console.log("✅ cloudinary.json updated (real folders detected)");
})();
