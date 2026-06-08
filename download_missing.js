const https = require('https');
const fs = require('fs');
const path = require('path');

const missing = [
  { url: 'https://www.datocms-assets.com/127841/1780590188-unveil_le_k_10.png', dest: 'www.datocms-assets.com/127841/1780590188-unveil_le_k_10.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590082-unveil_le_k_6.png', dest: 'www.datocms-assets.com/127841/1780590082-unveil_le_k_6.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590171-unveil_le_k_9.png', dest: 'www.datocms-assets.com/127841/1780590171-unveil_le_k_9.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590156-unveil_le_k_8.png', dest: 'www.datocms-assets.com/127841/1780590156-unveil_le_k_8.png' },
  { url: 'https://www.datocms-assets.com/127841/1780589955-unveil_le_k_1.png', dest: 'www.datocms-assets.com/127841/1780589955-unveil_le_k_1.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590342-unveil_le_k_15.png', dest: 'www.datocms-assets.com/127841/1780590342-unveil_le_k_15.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590264-unveil_le_k_12.png', dest: 'www.datocms-assets.com/127841/1780590264-unveil_le_k_12.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590230-unveil_le_k_11.png', dest: 'www.datocms-assets.com/127841/1780590230-unveil_le_k_11.png' },
  { url: 'https://www.datocms-assets.com/127841/1780589967-unveil_le_k_2.png', dest: 'www.datocms-assets.com/127841/1780589967-unveil_le_k_2.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590289-unveil_le_k_13.png', dest: 'www.datocms-assets.com/127841/1780590289-unveil_le_k_13.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590049-unveil_le_k_4.png', dest: 'www.datocms-assets.com/127841/1780590049-unveil_le_k_4.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590103-unveil_le_k_7.png', dest: 'www.datocms-assets.com/127841/1780590103-unveil_le_k_7.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590330-unveil_le_k_14.png', dest: 'www.datocms-assets.com/127841/1780590330-unveil_le_k_14.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590012-unveil_le_k_3.png', dest: 'www.datocms-assets.com/127841/1780590012-unveil_le_k_3.png' },
  { url: 'https://www.datocms-assets.com/127841/1780590064-unveil_le_k_5.png', dest: 'www.datocms-assets.com/127841/1780590064-unveil_le_k_5.png' }
];

async function download(url, destPath) {
  const fullDest = path.join(__dirname, destPath);
  fs.mkdirSync(path.dirname(fullDest), { recursive: true });
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(fullDest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (status code ${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(fullDest, () => reject(err));
    });
  });
}

async function main() {
  console.log("Starting download of missing files...");
  for (const item of missing) {
    try {
      await download(item.url, item.dest);
      console.log(`Success: ${item.dest}`);
    } catch (err) {
      console.error(`Error downloading ${item.url}:`, err.message);
    }
  }
  console.log("All downloads completed successfully.");
}

main();
