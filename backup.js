const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: 'devrowfzo',
  api_key: '962457757898636',
  api_secret: 'Floo4TNiQOEjEnQeOg_7Wxfur5U',
});

const downloadFolder = '/backup';
if (!fs.existsSync(downloadFolder)) fs.mkdirSync(downloadFolder);

// Download a single image
async function downloadImage(imageUrl, folderPath, fileName) {
  const filePath = path.join(folderPath, fileName);
  const writer = fs.createWriteStream(filePath);
  const response = await axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(true));
    writer.on('error', reject);
  });
}

// Download all images from a folder with pagination
async function downloadFolderImages(folderName) {
  const localFolder = path.join(downloadFolder, folderName.replace(/\//g, '_'));
  if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder);

  let next_cursor = null;
  let total = 0;

  do {
    const result = await cloudinary.search
      .expression(`folder:${folderName}`)
      .max_results(500)
      .next_cursor(next_cursor)
      .execute();

    for (let resource of result.resources) {
      const fileName = path.basename(resource.secure_url);
      await downloadImage(resource.secure_url, localFolder, fileName);
      console.log(`✅ Downloaded ${fileName} to ${folderName}`);
      total++;
    }

    next_cursor = result.next_cursor;
  } while (next_cursor);

  console.log(`📁 ${folderName}: ${total} images downloaded`);
}

// Fetch all folders and download their contents
async function downloadAllFolders() {
  try {
    const foldersResponse = await cloudinary.api.sub_folders('');
    const folders = foldersResponse.folders.map(f => f.path);

    console.log(`📂 Folders found: ${folders.join(', ')}`);
    for (const folder of folders) {
      await downloadFolderImages(folder);
    }

    console.log('🎉 All folders backed up!');
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  }
}

downloadAllFolders();
