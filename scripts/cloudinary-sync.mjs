import fs from "fs";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const OUTPUT = "assets/json/cloudinary.json";

// 🔑 normalize folder path
function normalizeFolder(fullPath) {
  if (!fullPath) return "root";

  // remove leading "Home/"
  return fullPath.startsWith("Home/")
    ? fullPath.replace("Home/", "")
    : fullPath;
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
      const rawFolder = img.folder || "root";
      const folder = normalizeFolder(rawFolder);

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

  console.log("✅ cloudinary.json updated (folder paths fixed)");
})();
