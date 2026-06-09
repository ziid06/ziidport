const fs = require('fs');
const path = require('path');

// Helper to parse image dimensions natively
function getImageSize(filepath) {
  try {
    const buffer = fs.readFileSync(filepath);
    // Check if PNG
    if (buffer.toString('ascii', 1, 4) === 'PNG') {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    // Check if JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let i = 2;
      while (i < buffer.length) {
        if (buffer[i] === 0xFF && (buffer[i+1] >= 0xC0 && buffer[i+1] <= 0xC3)) {
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          return { width, height };
        }
        const length = buffer.readUInt16BE(i + 2);
        i += length + 2;
      }
    }
  } catch (err) {
    console.error(`Error parsing dimensions for ${filepath}:`, err.message);
  }
  return { width: 1080, height: 1440 }; // fallback default aspect ratio
}

const BASE_DIR = __dirname;
const WEB_DIR = path.join(BASE_DIR, 'zidd.fr');
const MAPPING_FILE = path.join(BASE_DIR, 'mapping.json');
const IMG_DIR = path.join(BASE_DIR, 'my-images');
const PROJECTS_DB_FILE = path.join(BASE_DIR, 'projects_db.json');

// Custom Contact Info
const GMAIL_ADDRESS = "lazyape06@gmail.com";
const INSTAGRAM_URL = "https://www.instagram.com/nisshalllll?igsh=eXY1bTdmYnJvZDF1&utm_source=qr";

if (!fs.existsSync(IMG_DIR)) {
  console.error(`Error: my-images directory does not exist at ${IMG_DIR}`);
  process.exit(1);
}

const MAIN_PROJECTS_DIR = path.join(IMG_DIR, 'main-projects');
const STANDALONE_PROJECTS_DIR = path.join(IMG_DIR, 'standalone-projects');

if (!fs.existsSync(MAIN_PROJECTS_DIR)) {
  console.error(`Error: main-projects directory does not exist at ${MAIN_PROJECTS_DIR}`);
  process.exit(1);
}
if (!fs.existsSync(STANDALONE_PROJECTS_DIR)) {
  console.error(`Error: standalone-projects directory does not exist at ${STANDALONE_PROJECTS_DIR}`);
  process.exit(1);
}

// Find standalone files directly in standalone-projects
const standaloneFiles = fs.readdirSync(STANDALONE_PROJECTS_DIR).filter(file => {
  const fullPath = path.join(STANDALONE_PROJECTS_DIR, file);
  if (fs.statSync(fullPath).isDirectory()) return false;
  const ext = path.extname(file).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
});

console.log(`Discovered ${standaloneFiles.length} projects inside standalone-projects.`);

const greyPlaceholder = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNmYGD4DwAEhQGD721S+QAAAABJRU5ErkJggg==";
const newMappings = {};

function getProjectInfo(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  let title = '';
  let slug = '';
  if (baseName === '900hp') {
    title = '900hp';
    slug = '900hp';
  } else if (baseName === 'composition1') {
    title = 'Composition 1';
    slug = 'composition-1';
  } else if (baseName === 'eyesofenvy') {
    title = 'Eyes of Envy';
    slug = 'eyes-of-envy';
  } else if (baseName === 'monichrome') {
    title = 'Monochrome';
    slug = 'monochrome';
  } else if (baseName === 'solitude') {
    title = 'Solitude';
    slug = 'solitude';
  } else if (baseName === 'sovara') {
    title = 'Surrealist Space';
    slug = 'surrealist-space';
  } else if (baseName === 'the prophet') {
    title = 'The Prophet';
    slug = 'the-prophet';
  } else if (baseName === 'ziddhimself') {
    title = 'Ziid Himself';
    slug = 'ziid-himself';
  } else if (baseName === 'bondandkisses') {
    title = 'Bond and Kisses';
    slug = 'bond-and-kisses';
  } else if (baseName === 'junkie') {
    title = 'Junkie';
    slug = 'junkie';
  } else if (baseName === 'protagonist') {
    title = 'Protagonist';
    slug = 'protagonist';
  } else {
    // Generic fallback
    title = baseName
      .replace(/[0-9]+/g, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    slug = baseName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  }
  
  const cover = `standalone-projects/${filename}`;
  
  const subDirPath = path.join(MAIN_PROJECTS_DIR, baseName);
  let visuals = [{ path: cover, videoPath: null }];
  if (fs.existsSync(subDirPath) && fs.statSync(subDirPath).isDirectory()) {
    const files = fs.readdirSync(subDirPath);
    // Find image files
    const imageFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
    });
    // Sort them alphabetically/numerically
    imageFiles.sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    
    const pairedMp4s = new Set();
    
    imageFiles.forEach(imgFile => {
      const imgBase = path.basename(imgFile, path.extname(imgFile));
      // Check if a matching .mp4 exists in the same folder
      const mp4File = files.find(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.mp4' && path.basename(f, ext) === imgBase;
      });
      
      if (mp4File) {
        pairedMp4s.add(mp4File);
      }
      
      visuals.push({
        path: `main-projects/${baseName}/${imgFile}`,
        videoPath: mp4File ? `main-projects/${baseName}/${mp4File}` : null
      });
    });

    // Handle standalone MP4 files that don't have matching image names
    const mp4Files = files.filter(f => path.extname(f).toLowerCase() === '.mp4');
    mp4Files.forEach(mp4File => {
      if (!pairedMp4s.has(mp4File)) {
        visuals.push({
          path: cover,
          videoPath: `main-projects/${baseName}/${mp4File}`
        });
        console.log(`Mapping standalone video: ${mp4File} with cover: ${cover}`);
      }
    });
  }

  return { title, slug, visuals, cover };
}

// Build list of all project definitions
const projectDefinitions = standaloneFiles.map(file => getProjectInfo(file));

// Build the projects array for Svelte database (with ALL visuals)
const projectsArray = projectDefinitions.map((proj, idx) => {
  const { title, slug, visuals, cover } = proj;
  
  const coverPath = path.join(IMG_DIR, cover);
  const coverSize = getImageSize(coverPath);
  
  const coverFilename = `custom-cover-${slug}-${path.basename(cover)}`;
  const coverUrl = `https://www.datocms-assets.com/127841/${coverFilename}`;
  newMappings[coverFilename] = cover;

  const visualsObjects = visuals.map((vis, visIdx) => {
    const visFile = vis.path;
    const visPath = path.join(IMG_DIR, visFile);
    const visSize = getImageSize(visPath);
    
    const visFilename = `custom-vis-${slug}-${path.basename(visFile)}`;
    const visUrl = `https://www.datocms-assets.com/127841/${visFilename}`;
    newMappings[visFilename] = visFile;

    const aspect = visSize.width / visSize.height;

    let videoObj = null;
    if (vis.videoPath) {
      const videoFilename = `custom-video-${slug}-${visIdx}.mp4`;
      const videoUrl = `https://www.datocms-assets.com/127841/${videoFilename}`;
      newMappings[videoFilename] = vis.videoPath;
      
      videoObj = {
        video: {
          duration: 10,
          lowResUrl: videoUrl,
          mediumResUrl: videoUrl,
          streamingUrl: videoUrl
        }
      };
      console.log(`Video visual mapped: ${vis.videoPath} -> ${videoFilename}`);
    }

    return {
      id: `custom-visual-${slug}-${visIdx}`,
      tags: [],
      columnWidth: visIdx === 0 ? "full_width" : "half_width",
      image: {
        alt: null,
        height: visSize.height,
        width: visSize.width,
        url: visUrl,
        src: `${visUrl}?dpr=1&fit=max&h=2048&q=90&w=2048`,
        webp: `${visUrl}?dpr=1&fit=max&fm=webp&h=2048&q=90&w=2048`,
        optimizedSrc: `${visUrl}?dpr=1&fit=max&h=720&q=80&w=720`,
        optimizedWebp: `${visUrl}?dpr=1&fit=max&fm=webp&h=720&q=80&w=720`,
        optimizedSrcMobile: `${visUrl}?dpr=1&fit=max&h=512&q=80&w=512`,
        optimizedWebpMobile: `${visUrl}?dpr=1&fit=max&fm=webp&h=512&q=80&w=512`,
        blur: `${visUrl}?blur=16&dpr=1&fit=max&h=64&q=80&w=64`,
        blurWebp: `${visUrl}?blur=16&dpr=1&fit=max&fm=webp&h=64&q=80&w=64`,
        blurUpThumb: greyPlaceholder,
        responsiveImage: {
          alt: null,
          aspectRatio: aspect,
          srcSet: `${visUrl}?auto=compress&dpr=0.25&fit=max&h=2048&q=75&w=2048 240w,${visUrl}?auto=compress&dpr=0.5&fit=max&h=2048&q=75&w=2048 480w,${visUrl}?auto=compress&dpr=0.75&fit=max&h=2048&q=75&w=2048 720w,${visUrl}?auto=compress&dpr=1&fit=max&h=2048&q=75&w=2048 960w`,
          src: `${visUrl}?auto=compress&dpr=1&fit=max&h=2048&q=75&w=2048`,
          sizes: "(max-width: 960px) 100vw, 960px",
          webpSrcSet: `${visUrl}?auto=compress&dpr=0.25&fit=max&fm=webp&h=2048&q=75&w=2048 240w,${visUrl}?auto=compress&dpr=0.5&fit=max&fm=webp&h=2048&q=75&w=2048 480w,${visUrl}?auto=compress&dpr=0.75&fit=max&h=2048&q=75&w=2048 720w,${visUrl}?auto=compress&dpr=1&fit=max&fm=webp&h=2048&q=75&w=2048 960w`,
          width: visSize.width,
          height: visSize.height
        }
      },
      video: videoObj,
      videoMobile: null
    };
  });

  return {
    thumbnail: {
      alt: null,
      height: coverSize.height,
      width: coverSize.width,
      url: coverUrl,
      src: `${coverUrl}?dpr=1&fit=max&h=1024&q=90&w=1024`,
      webp: `${coverUrl}?dpr=1&fit=max&fm=webp&h=1024&q=90&w=1024`
    },
    title: title,
    slug: slug,
    year: "2026",
    tags: [{ tagName: "AI" }, { tagName: "Stills" }],
    visuals: visualsObjects,
    description: `A project by ZIID studio showcasing contemporary creative visuals.`,
    credits: [],
    _seoMetaTags: [
      {
        "__typename": "Tag",
        "attributes": null,
        "content": `${title} — ZIID®`,
        "tag": "title"
      },
      {
        "__typename": "Tag",
        "attributes": {
          "property": "og:title",
          "content": `${title}`
        },
        "content": null,
        "tag": "meta"
      },
      {
        "__typename": "Tag",
        "attributes": {
          "name": "description",
          "content": `Custom project ${title}`
        },
        "content": null,
        "tag": "meta"
      }
    ],
    seo: {
      image: {
        alt: null,
        url: coverUrl
      },
      title: title,
      description: `Custom project ${title}`
    }
  };
});

// Save the full projects list with all visuals to projects_db.json for server.js to use
fs.writeFileSync(PROJECTS_DB_FILE, JSON.stringify(projectsArray, null, 2));
console.log('Saved projects_db.json with full multi-image datasets.');

// Build a simplified projects list for initial layout render (index.html, research.html, studio.html)
// This simplified list will have only the cover image in visuals so the landing page slider has only 1 card per project.
// We only keep the main multi-image projects (discovered in main-projects/).
const simplifiedProjectsArray = projectsArray.map(p => {
  const simplifiedVisuals = p.visuals && p.visuals.length ? [p.visuals[0]] : [];
  return Object.assign({}, p, {
    visuals: simplifiedVisuals
  });
});

// Gather research images - ONLY main cover images (standalone files)
const researchSourceFiles = [];

// Add all standalone files (which represent the cover image of all projects)
standaloneFiles.forEach(f => {
  researchSourceFiles.push(`standalone-projects/${f}`);
});

console.log(`Discovered ${researchSourceFiles.length} main images for the Research page`);

const researchVisualsArray = researchSourceFiles.map((file, idx) => {
  const filePath = path.join(IMG_DIR, file);
  const size = getImageSize(filePath);
  const filename = `custom-research-${idx}-${path.basename(file)}`;
  const imgUrl = `https://www.datocms-assets.com/127841/${filename}`;
  newMappings[filename] = file;

  const aspect = size.width / size.height;

  return {
    image: {
      alt: null,
      height: size.height,
      width: size.width,
      url: imgUrl,
      src: `${imgUrl}?dpr=1&fit=max&h=2048&q=90&w=2048`,
      webp: `${imgUrl}?dpr=1&fit=max&fm=webp&h=2048&q=90&w=2048`,
      responsiveImage: {
        alt: null,
        aspectRatio: aspect,
        srcSet: `${imgUrl}?auto=compress&dpr=0.25&fit=max&h=2048&q=75&w=2048 240w,${imgUrl}?auto=compress&dpr=0.5&fit=max&h=2048&q=75&w=2048 480w,${imgUrl}?auto=compress&dpr=0.75&fit=max&h=2048&q=75&w=2048 720w,${imgUrl}?auto=compress&dpr=1&fit=max&h=2048&q=75&w=2048 960w`,
        src: `${imgUrl}?auto=compress&dpr=1&fit=max&h=2048&q=75&w=2048`,
        sizes: "(max-width: 960px) 100vw, 960px",
        webpSrcSet: `${imgUrl}?auto=compress&dpr=0.25&fit=max&fm=webp&h=2048&q=75&w=2048 240w,${imgUrl}?auto=compress&dpr=0.5&fit=max&fm=webp&h=2048&q=75&w=2048 480w,${imgUrl}?auto=compress&dpr=0.75&fit=max&h=2048&q=75&w=2048 720w,${imgUrl}?auto=compress&dpr=1&fit=max&h=2048&q=75&w=2048 960w`,
        width: size.width,
        height: size.height
      },
      responsiveThumbnail: {
        alt: null,
        aspectRatio: aspect,
        srcSet: `${imgUrl}?auto=compress&dpr=0.25&fit=max&h=256&q=75&w=256 51w,${imgUrl}?auto=compress&dpr=0.5&fit=max&h=256&q=75&w=256 102w,${imgUrl}?auto=compress&dpr=0.75&fit=max&h=256&q=75&w=256 153w,${imgUrl}?auto=compress&dpr=1&fit=max&h=256&q=75&w=256 204w,${imgUrl}?auto=compress&dpr=1.5&fit=max&h=256&q=75&w=256 307w,${imgUrl}?auto=compress&dpr=2&fit=max&h=256&q=75&w=256 409w,${imgUrl}?auto=compress&dpr=3&fit=max&h=256&q=75&w=256 614w,${imgUrl}?auto=compress&dpr=4&fit=max&h=256&q=75&w=256 819w`,
        src: `${imgUrl}?auto=compress&dpr=1&fit=max&h=256&q=75&w=256`,
        sizes: "(max-width: 204px) 100vw, 204px",
        webpSrcSet: `${imgUrl}?auto=compress&dpr=0.25&fit=max&fm=webp&h=256&q=75&w=256 51w,${imgUrl}?auto=compress&dpr=0.5&fit=max&h=256&q=75&w=256 102w,${imgUrl}?auto=compress&dpr=0.75&fit=max&h=256&q=75&w=256 153w,${imgUrl}?auto=compress&dpr=1&fit=max&h=256&q=75&w=256 204w,${imgUrl}?auto=compress&dpr=1.5&fit=max&h=256&q=75&w=256 307w,${imgUrl}?auto=compress&dpr=2&fit=max&h=256&q=75&w=256 409w,${imgUrl}?auto=compress&dpr=3&fit=max&h=256&q=75&w=256 614w,${imgUrl}?auto=compress&dpr=4&fit=max&h=256&q=75&w=256 819w`,
        width: 204,
        height: Math.round(204 / aspect)
      }
    },
    video: null
  };
});

// Write to mapping.json
let existingMappings = {};
if (fs.existsSync(MAPPING_FILE)) {
  try {
    existingMappings = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  } catch (err) {}
}
const mergedMappings = Object.assign({}, existingMappings, newMappings);
fs.writeFileSync(MAPPING_FILE, JSON.stringify(mergedMappings, null, 2));
console.log('Updated mapping.json with custom project and research image rules.');

// Function to update HTML database inside a file
function updateHtmlFile(filename) {
  const filepath = path.join(WEB_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`File ${filename} does not exist.`);
    return;
  }

  const bakPath = filepath + '.bak';
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, fs.readFileSync(filepath, 'utf8'), 'utf8');
  }
  let html = fs.readFileSync(bakPath, 'utf8');

  // Apply brand name replacements (UNVEIL -> ZIID)
  html = html.replace(/UNVEIL®/g, 'ZIID®');
  html = html.replace(/UNVEIL/g, 'ZIID');
  html = html.replace(/UNVEIL_STUDIO_3072x3072\.png/g, 'ZIID_STUDIO_3072x3072.png');
  html = html.replace(/contact@unveil\.fr/g, 'contact@ziid.fr');

  // Custom index page scripts and custom-project-list-wrapper were removed to restore the original 3D WebGL horizontal project slider.
  
  // Inject style tag in the head to hide the 3rd contact item (Location) and set original image/video sizes centered and fit within screen
  if (!html.includes('section.svelte-1jcynm8 li:nth-child(3)')) {
    html = html.replace(/<\/head>/i, `<style>
section.svelte-1jcynm8 li:nth-child(3) { display: none !important; }
section.svelte-1brxil6 .grid {
  max-width: 1400px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 100% !important;
}
section.svelte-1brxil6 .grid > div {
  max-height: 80vh !important;
  max-height: 80svh !important;
  border: 1px solid #ffffff !important;
}
section.svelte-1brxil6 img, section.svelte-1brxil6 video {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  max-width: 100% !important;
  max-height: 100% !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
}
/* Align left-column sub-project images/videos to the right edge of their cell */
section.svelte-1brxil6 .grid > div:nth-child(2n) img,
section.svelte-1brxil6 .grid > div:nth-child(2n) video {
  left: auto !important;
  right: 0 !important;
  transform: translate(0, -50%) !important;
}
/* Align right-column sub-project images/videos to the left edge of their cell */
section.svelte-1brxil6 .grid > div:nth-child(2n+3) img,
section.svelte-1brxil6 .grid > div:nth-child(2n+3) video {
  left: 0 !important;
  right: auto !important;
  transform: translate(0, -50%) !important;
}
</style></head>`);
  }

  // Replace pre-rendered contact list in body (Gmail + Instagram + hidden dummy Location)
  const contactListRegex = /<ul class="flex translate-y-\[75%\] gap-x-0\.5 px-\[14px\] sm:translate-y-\[0px\]">[\s\S]*?<\/ul>/;
  const replacementContactList = `<ul class="flex translate-y-[75%] gap-x-0.5 px-[14px] sm:translate-y-[0px]"><!--[--><li class="flex-shrink-0 opacity-0 flex"><a class="button px-4 py-3.5 rounded-[0.375rem] " href="mailto:${GMAIL_ADDRESS}" target="_blank" rel="noopener nofollow noreferrer"><span class="flex translate-y-[1.5px] opacity-30">Gmail</span></a></li><li class="flex-shrink-0 opacity-0 flex"><a class="button px-4 py-3.5 rounded-full " href="${INSTAGRAM_URL}" target="_blank" rel="noopener nofollow noreferrer"><span class="flex translate-y-[1.5px] opacity-30">Instagram</span></a></li><li class="flex-shrink-0 opacity-0 hidden sm:flex"><a class="button px-4 py-3.5 rounded-full mr-1 sm:mr-0" href="https://maps.google.com/" target="_blank" rel="noopener nofollow noreferrer"><span class="flex translate-y-[1.5px] opacity-30">Location</span></a></li><!--]--></ul>`;
  
  html = html.replace(contactListRegex, replacementContactList);

  if (filename === 'studio.html') {
    // Replace pre-rendered Clients list
    const clientsRegex = /<ul class="text-11 px-\[14px\] opacity-0"><li class="flex"><span class="leading-\[1\.25\] opacity-30" style="width: 2px">Clients<\/span> <div class="flex flex-col"><!--\[--><!--\[!--><span class="leading-\[1\.25\]">Balenciaga <\/span><!--]-->[\s\S]*?<\/div><\/li><\/ul>/;
    const replacementClients = '<ul class="text-11 px-[14px] opacity-0"><li class="flex"><span class="leading-[1.25] opacity-30" style="width: 2px">Clients</span> <div class="flex flex-col"><!--[--><!--[!--><span class="leading-[1.25]">Coming soon!</span><!--]--><!--]--></div></li></ul>';
    html = html.replace(clientsRegex, replacementClients);

    // Replace pre-rendered Services list
    const servicesRegex = /<ul class="text-11 px-\[14px\] opacity-0"><li class="flex"><span class="leading-\[1\.25\] opacity-30" style="width: 2px">Services<\/span> <div class="flex flex-col"><!--\[--><!--\[!--><span class="leading-\[1\.25\]">Creative Direction<\/span><!--]-->[\s\S]*?<\/div><\/li><\/ul>/;
    const replacementServices = '<ul class="text-11 px-[14px] opacity-0"><li class="flex"><span class="leading-[1.25] opacity-30" style="width: 2px">Services</span> <div class="flex flex-col"><!--[--><!--[!--><span class="leading-[1.25]">Coming soon!</span><!--]--><!--]--></div></li></ul>';
    html = html.replace(servicesRegex, replacementServices);

    // Replace pre-rendered Press list
    const pressRegex = /<ul class="text-11 px-\[14px\] opacity-0"><li class="flex"><span class="leading-\[1\.25\] opacity-30" style="width: 2px">Press<\/span> <div class="flex flex-col"><!--\[--><!--\[--><a class="leading-\[1\.25\]" href="https:\/\/podcasts\.apple\.com\/fr\/podcast\/theboldway\/id1300541489\?i=1000755694144"[\s\S]*?<\/div><\/li><\/ul>/;
    const replacementPress = '<ul class="text-11 px-[14px] opacity-0"><li class="flex"><span class="leading-[1.25] opacity-30" style="width: 2px">Press</span> <div class="flex flex-col"><!--[--><!--[!--><span class="leading-[1.25]">Coming soon!</span><!--]--><!--]--></div></li></ul>';
    html = html.replace(pressRegex, replacementPress);

    // Replace pre-rendered Recognitions list
    const recognitionsRegex = /<ul class="text-11 px-\[14px\] opacity-0"><li class="flex"><span class="leading-\[1\.25\] opacity-30" style="width: 2px">Recognitions<\/span> <div class="flex flex-col"><!--\[--><!--\[--><a class="leading-\[1\.25\]" href="https:\/\/gen48\.runwayml\.com"[\s\S]*?<\/div><\/li><\/ul>/;
    const replacementRecognitions = '<ul class="text-11 px-[14px] opacity-0"><li class="flex"><span class="leading-[1.25] opacity-30" style="width: 2px">Recognitions</span> <div class="flex flex-col"><!--[--><!--[!--><span class="leading-[1.25]">Coming soon!</span><!--]--><!--]--></div></li></ul>';
    html = html.replace(recognitionsRegex, replacementRecognitions);
  }

  const match = html.match(/kit\.start\(app, element, (\{[\s\S]*?\})\);/);
  if (!match) {
    console.error(`Could not find kit.start block in ${filename}`);
    fs.writeFileSync(filepath, html, 'utf8');
    return;
  }

  // Parse and update
  const obj = eval('(' + match[1] + ')');
  
  // Set the simplified projects array in layouts
  obj.data[0].data.projects.allProjects = simplifiedProjectsArray;

  // Set the custom contact links in kit.start data (Gmail, Instagram, Location)
  if (obj.data && obj.data[0] && obj.data[0].data && obj.data[0].data.contact) {
    const contactLinks = [
      {
        "label": "Gmail",
        "url": `mailto:${GMAIL_ADDRESS}`
      },
      {
        "label": "Instagram",
        "url": INSTAGRAM_URL
      },
      {
        "label": "Location",
        "url": "https://maps.google.com/"
      }
    ];
    obj.data[0].data.contact.links = contactLinks;
    if (obj.data[0].data.contact.contact) {
      obj.data[0].data.contact.contact.links = contactLinks;
    }
  }

  // Clear research visuals if it is the research page and replace with your own images
  if (filename === 'research.html' && obj.data[1] && obj.data[1].data && obj.data[1].data.research) {
    obj.data[1].data.research.visuals = researchVisualsArray;
    console.log('Successfully injected custom research visuals inside research.html');
  }

  // Update studio page blocks inside kit.start data
  if (filename === 'studio.html' && obj.data[1] && obj.data[1].data && obj.data[1].data.studio) {
    const blocks = obj.data[1].data.studio.blocks;
    if (blocks) {
      blocks.forEach(block => {
        if (block.label === 'Clients') {
          block.lines = [
            {
              id: 'coming-soon-clients',
              text: 'Coming soon!'
            }
          ];
        } else if (block.label === 'Services') {
          block.lines = [
            {
              id: 'coming-soon-services',
              text: 'Coming soon!'
            }
          ];
        } else if (block.label === 'Press') {
          block.lines = [
            {
              text: 'Coming soon!'
            }
          ];
        } else if (block.label === 'Recognitions') {
          block.lines = [
            {
              text: 'Coming soon!'
            }
          ];
        }
      });
    }
    console.log('Successfully updated studio blocks inside kit.start data');
  }

  // Stringify the updated object
  const updatedObjStr = JSON.stringify(obj, null, 2);
  
  // Replace the block in HTML
  const replacement = `kit.start(app, element, ${updatedObjStr});`;
  const original = `kit.start(app, element, ${match[1]});`;
  
  html = html.replace(original, replacement);

  if (filename === 'index.html') {
    const listHtml = `
<div class="custom-project-list-container">
  <ul class="custom-project-list">
    ${simplifiedProjectsArray.map(p => {
      const coverUrl = `/www.datocms-assets.com/127841/${p.thumbnail.url.split('/').pop()}`;
      return `
      <li class="custom-project-item">
        <a href="/${p.slug}" data-cover="${coverUrl}">${p.title}</a>
      </li>`;
    }).join('')}
  </ul>
</div>
<img class="custom-hover-image-preview" src="" alt="" />
<style>
.custom-project-list-container {
  display: none; /* Hidden by default to avoid showing on the horizontal slider landing page */
  position: fixed;
  bottom: 3.5rem;
  left: 14px;
  z-index: 999;
  pointer-events: auto;
}
.custom-project-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.custom-project-item a {
  font-family: 'NB International Pro', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  text-decoration: none;
  color: #000000;
  opacity: 0.3;
  transition: opacity 0.2s ease, padding-left 0.2s ease;
  display: inline-block;
}
.custom-project-item a:hover {
  opacity: 1;
  padding-left: 6px;
}
.custom-hover-image-preview {
  position: fixed;
  top: 14px;
  right: 14px;
  height: 50vh;
  width: 50vh;
  max-width: 50vw;
  max-height: 50vh;
  object-fit: cover;
  pointer-events: none;
  z-index: 998;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  border-radius: 4px;
}
</style>
<script>
  (function() {
    const container = document.querySelector('.custom-project-list-container');
    const preview = document.querySelector('.custom-hover-image-preview');
    const links = document.querySelectorAll('.custom-project-item a');
    
    let currentPath = '';
    
    function checkRoute() {
      const path = window.location.pathname;
      if (path === currentPath) return;
      currentPath = path;
      
      const isIndexPage = path === '/index' || path === '/index.html';
      if (isIndexPage) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
        preview.style.opacity = '0';
      }
    }
    
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const path = window.location.pathname;
        const isIndexPage = path === '/index' || path === '/index.html';
        if (isIndexPage) {
          const cover = link.getAttribute('data-cover');
          preview.src = cover;
          preview.style.opacity = '1';
        }
      });
      link.addEventListener('mouseleave', () => {
        preview.style.opacity = '0';
      });
    });
    
    setInterval(checkRoute, 100);
    checkRoute();
  })();
</script>
`;
    html = html.replace('</body>', listHtml + '</body>');
  }

  html = html.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');
  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`Successfully updated projects database and contact links inside ${filename}`);
}

// Function to update compiled JS bundle references (UNVEIL -> ZIID)
function updateJsFiles() {
  const node0Path = path.join(WEB_DIR, '_app/immutable/nodes/0.CvEaJ_33.js');
  if (fs.existsSync(node0Path)) {
    let js = fs.readFileSync(node0Path, 'utf8');
    js = js.replace(/<span>UNVEIL<\/span>/g, '<span>ZIID</span>');
    fs.writeFileSync(node0Path, js, 'utf8');
    console.log('Successfully replaced UNVEIL with ZIID inside 0.CvEaJ_33.js');
  }

  const node2Path = path.join(WEB_DIR, '_app/immutable/nodes/2.9_4w7tFj.js');
  if (fs.existsSync(node2Path)) {
    let js = fs.readFileSync(node2Path, 'utf8');
    js = js.replace(/a\.content="UNVEIL®"/g, 'a.content="ZIID®"');
    fs.writeFileSync(node2Path, js, 'utf8');
    console.log('Successfully replaced UNVEIL® with ZIID® inside 2.9_4w7tFj.js');
  }
}

// Function to clean up the source assets directory by removing unused old images
function cleanupSourceAssets() {
  const cdnDir = path.join(BASE_DIR, 'www.datocms-assets.com', '127841');
  if (!fs.existsSync(cdnDir)) return;
  const layoutAssets = [
    '1714642321-unveil_favicon_512x512.png',
    '1763650338-unveil_seo_2.png',
    '1763650636-unveil_research_seo_1.png'
  ];
  const files = fs.readdirSync(cdnDir);
  let deletedCount = 0;
  files.forEach(file => {
    if (!layoutAssets.includes(file)) {
      try {
        fs.unlinkSync(path.join(cdnDir, file));
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting ${file}:`, err.message);
      }
    }
  });
  console.log(`Cleaned up source assets: deleted ${deletedCount} unused files from www.datocms-assets.com/127841/`);
}

// Function to copy assets and generate SvelteKit data navigation files for Vercel static hosting
function buildForVercel() {
  console.log('Preparing static website folder (zidd.fr/) for Vercel deployment...');
  
  const { stringify } = require('devalue');
  const targetCdnDir = path.join(WEB_DIR, 'www.datocms-assets.com', '127841');
  
  // Ensure the target datocms CDN directory exists inside zidd.fr/
  fs.mkdirSync(targetCdnDir, { recursive: true });

  // 1. Copy original used files from www.datocms-assets.com/127841/
  const originalCdnSource = path.join(BASE_DIR, 'www.datocms-assets.com', '127841');
  const layoutAssets = [
    '1714642321-unveil_favicon_512x512.png',
    '1763650338-unveil_seo_2.png',
    '1763650636-unveil_research_seo_1.png'
  ];
  layoutAssets.forEach(file => {
    const src = path.join(originalCdnSource, file);
    const dest = path.join(targetCdnDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else {
      console.warn(`Warning: original asset ${file} not found in ${src}`);
    }
  });

  // 2. Read mapping.json and copy all mapped files from my-images/ to zidd.fr/www.datocms-assets.com/127841/
  if (fs.existsSync(MAPPING_FILE)) {
    try {
      const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
      Object.keys(mapping).forEach(key => {
        const relativeVal = mapping[key];
        const src = path.join(IMG_DIR, relativeVal);
        const dest = path.join(targetCdnDir, key);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        } else {
          console.warn(`Warning: mapped source image ${relativeVal} not found in ${src}`);
        }
      });
      console.log(`Successfully copied ${Object.keys(mapping).length} mapped assets to zidd.fr/www.datocms-assets.com/127841/`);
    } catch (err) {
      console.error('Error reading/processing mapping.json for Vercel build:', err.message);
    }
  }

  // 3. Helper to parse kit.start from static HTML files in zidd.fr/
  function parseKitStartStatic(filename) {
    const filepath = path.join(WEB_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    const html = fs.readFileSync(filepath, 'utf8');
    const match = html.match(/kit\.start\(app, element, (\{[\s\S]*?\})\);/);
    if (!match) return null;
    try {
      return eval('(' + match[1] + ')');
    } catch (e) {
      console.error(`Error parsing kit.start in ${filename}:`, e.message);
      return null;
    }
  }

  const indexData = parseKitStartStatic('index.html');
  if (!indexData) {
    console.error('Error: Failed to parse index.html kit.start block for static data generation');
    return;
  }
  const allTags = indexData.data[0].data.tags.allTags;

  // 3b. Generate root __data.json and index/__data.json
  const homeResObj = {
    type: "data",
    nodes: [
      null,
      {
        type: "data",
        data: JSON.parse(stringify(indexData.data[1].data)),
        uses: {}
      }
    ]
  };
  let homeJsonStr = JSON.stringify(homeResObj) + '\n';
  homeJsonStr = homeJsonStr.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');
  fs.writeFileSync(path.join(WEB_DIR, '__data.json'), homeJsonStr, 'utf8');
  console.log('Generated root __data.json');

  const indexDestDir = path.join(WEB_DIR, 'index');
  fs.mkdirSync(indexDestDir, { recursive: true });
  fs.writeFileSync(path.join(indexDestDir, '__data.json'), homeJsonStr, 'utf8');
  console.log('Generated index/__data.json');

  // 4. Generate research/__data.json
  const researchData = parseKitStartStatic('research.html');
  if (researchData) {
    const resObj = {
      type: "data",
      nodes: [
        null,
        {
          type: "data",
          data: JSON.parse(stringify(researchData.data[1].data)),
          uses: {}
        }
      ]
    };
    const destDir = path.join(WEB_DIR, 'research');
    fs.mkdirSync(destDir, { recursive: true });
    let jsonStr = JSON.stringify(resObj) + '\n';
    jsonStr = jsonStr.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');
    fs.writeFileSync(path.join(destDir, '__data.json'), jsonStr, 'utf8');
    console.log('Generated research/__data.json');
  }

  // 5. Generate studio/__data.json
  const studioData = parseKitStartStatic('studio.html');
  if (studioData) {
    const resObj = {
      type: "data",
      nodes: [
        null,
        {
          type: "data",
          data: JSON.parse(stringify(studioData.data[1].data)),
          uses: {}
        }
      ]
    };
    const destDir = path.join(WEB_DIR, 'studio');
    fs.mkdirSync(destDir, { recursive: true });
    let jsonStr = JSON.stringify(resObj) + '\n';
    jsonStr = jsonStr.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');
    fs.writeFileSync(path.join(destDir, '__data.json'), jsonStr, 'utf8');
    console.log('Generated studio/__data.json');
  }

  // 6. Generate [slug]/__data.json for each custom project in projects_db.json
  if (fs.existsSync(PROJECTS_DB_FILE)) {
    try {
      const fullProjects = JSON.parse(fs.readFileSync(PROJECTS_DB_FILE, 'utf8'));
      fullProjects.forEach(proj => {
        const slug = proj.slug;
        const resObj = {
          type: "data",
          nodes: [
            null,
            {
              type: "data",
              data: JSON.parse(stringify({
                project: { project: proj },
                page: { page: null },
                tags: { allTags: allTags },
                key: `custom-project-${slug}`
              })),
              uses: {}
            }
          ]
        };
        const destDir = path.join(WEB_DIR, slug);
        fs.mkdirSync(destDir, { recursive: true });
        let jsonStr = JSON.stringify(resObj) + '\n';
        jsonStr = jsonStr.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');
        fs.writeFileSync(path.join(destDir, '__data.json'), jsonStr, 'utf8');
        console.log(`Generated ${slug}/__data.json`);
      });
    } catch (err) {
      console.error('Error generating project data files for Vercel:', err.message);
    }
  }

  // 7. Write vercel.json config file to zidd.fr/
  const vercelConfig = {
    "cleanUrls": true,
    "rewrites": [
      {
        "source": "/research",
        "destination": "/research.html"
      },
      {
        "source": "/studio",
        "destination": "/studio.html"
      },
      {
        "source": "/((?!_app|fonts|icons|www.datocms-assets.com|.*\\.).*)",
        "destination": "/index.html"
      }
    ]
  };
  fs.writeFileSync(path.join(WEB_DIR, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf8');
  console.log('Created vercel.json configuration in zidd.fr/ for routing.');
}

// Update the files
cleanupSourceAssets();
updateHtmlFile('index.html');
updateHtmlFile('research.html');
updateHtmlFile('studio.html');
updateJsFiles();
buildForVercel();

console.log('Portfolio rebuild complete! Open http://localhost:3000 to see your new projects.');
