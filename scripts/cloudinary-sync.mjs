import fs from "fs";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const OUTPUT = "assets/json/cloudinary.json";

async function getAllImages() {
  let result = {};
  let nextCursor = null;

  do {
    const res = await cloudinary.v2.api.resources({
      type: "upload",
      max_results: 500,
      next_cursor: nextCursor
    });

    res.resources.forEach(img => {
      const folder = img.folder || "root";
      if (!result[folder]) result[folder] = [];
      result[folder].push(img.public_id.replace(folder + "/", ""));
    });

    nextCursor = res.next_cursor;
  } while (nextCursor);

  return result;
}

(async () => {
  console.log("🔄 Fetching Cloudinary images...");

  const folders = await getAllImages();

  const json = {
    base: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    updatedAt: Date.now(),
    folders
  };

  fs.mkdirSync("assets/json", { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(json, null, 2));

  console.log("✅ cloudinary.json updated");
})();
