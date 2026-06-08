const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { stringify } = require('devalue');

const PORT = 3000;
const BASE_DIR = __dirname;
const WEB_DIR = path.join(BASE_DIR, 'zidd.fr');
const ASSETS_DIR = path.join(BASE_DIR, 'www.datocms-assets.com');
const CUSTOM_IMAGES_DIR = path.join(BASE_DIR, 'my-images');
const MAPPING_FILE = path.join(BASE_DIR, 'mapping.json');

// Ensure custom images directory exists
if (!fs.existsSync(CUSTOM_IMAGES_DIR)) {
  fs.mkdirSync(CUSTOM_IMAGES_DIR, { recursive: true });
}

// Check mapping on startup
if (!fs.existsSync(MAPPING_FILE)) {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify({
    "1780589955-unveil_le_k_1.png": "your-custom-image.png"
  }, null, 2));
}
const PROJECTS_DB_FILE = path.join(BASE_DIR, 'projects_db.json');

function getFullProjectsArray() {
  if (fs.existsSync(PROJECTS_DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROJECTS_DB_FILE, 'utf8'));
    } catch (err) {
      console.error('Error reading projects_db.json:', err.message);
    }
  }
  return [];
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4'
};

const loggerScript = `
  <script>
    function logError(type, message, extra) {
      fetch('/remote-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, extra, url: window.location.href })
      }).catch(function() {});
    }
    window.addEventListener('error', function(e) {
      logError('js-error', e.message, { filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error ? e.error.stack : null });
    });
    window.addEventListener('unhandledrejection', function(e) {
      logError('promise-rejection', e.reason ? (e.reason.message || String(e.reason)) : 'unhandled promise rejection', { stack: e.reason ? e.reason.stack : null });
    });
    const originalConsoleError = console.error;
    console.error = function() {
      const args = Array.prototype.slice.call(arguments);
      originalConsoleError.apply(console, args);
      logError('console-error', args.map(function(arg) { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); }).join(' '));
    };
    // Intercept project page clicks to force native reload and prevent SvelteKit "Page not found" manifest mismatch
    window.addEventListener('click', function(e) {
      const anchor = e.target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('/') && href !== '/' && href !== '/research' && href !== '/studio' && href !== '/research/' && href !== '/studio/' && !href.includes('.')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.location.href = href;
        }
      }
    }, true);
  </script>
`;

function parseKitStart(filename) {
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

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  // Decode the URL pathname to handle spaces (%20) and other encoded characters properly
  const decodedPathname = decodeURIComponent(parsedUrl.pathname);

  // Handle remote logs from browser console
  if (decodedPathname === '/remote-log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`\x1b[31m[REMOTE BROWSER LOG - ${payload.type}]\x1b[0m`, payload.message, payload.extra || '');
      } catch (e) {
        console.error('Error parsing remote log payload:', e.message);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${decodedPathname}`);

  // Handle SvelteKit __data.json navigation data requests
  if (decodedPathname.endsWith('__data.json')) {
    let route = decodedPathname.replace(/__data\.json$/, '');
    if (route.length > 1 && route.endsWith('/')) {
      route = route.slice(0, -1);
    }

    const indexData = parseKitStart('index.html');
    if (!indexData) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading index page data');
      return;
    }

    const projectsArray = indexData.data[0].data.projects.allProjects;
    const allTags = indexData.data[0].data.tags.allTags;

    let responseObj = null;

    if (route === '/' || route === '/index' || route === '/index.html' || route === '') {
      responseObj = {
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
    } else if (route === '/research') {
      const researchData = parseKitStart('research.html');
      responseObj = {
        type: "data",
        nodes: [
          null,
          {
            type: "data",
            data: JSON.parse(stringify(researchData ? researchData.data[1].data : {})),
            uses: {}
          }
        ]
      };
    } else if (route === '/studio') {
      const studioData = parseKitStart('studio.html');
      responseObj = {
        type: "data",
        nodes: [
          null,
          {
            type: "data",
            data: JSON.parse(stringify(studioData ? studioData.data[1].data : {})),
            uses: {}
          }
        ]
      };
    } else {
      // It is a project slug page
      const slug = route.replace(/^\//, '');
      const fullProjects = getFullProjectsArray();
      const matchedProject = fullProjects.find(p => p.slug === slug);
      if (matchedProject) {
        responseObj = {
          type: "data",
          nodes: [
            null,
            {
              type: "data",
              data: JSON.parse(stringify({
                project: { project: matchedProject },
                page: { page: null },
                tags: { allTags: allTags },
                key: `custom-project-${slug}`
              })),
              uses: {}
            }
          ]
        };
      }
    }

    if (responseObj) {
      const jsonString = JSON.stringify(responseObj) + '\n';
      // Rewrite absolute datocms CDN links to use local server paths dynamically in json data too
      const modifiedJsonString = jsonString.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(modifiedJsonString);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Route Not Found');
    return;
  }


  // 1. Check if requesting locally cached CDN assets
  if (decodedPathname.startsWith('/www.datocms-assets.com/')) {
    const relativePath = decodedPathname.replace('/www.datocms-assets.com/', '');
    const filename = path.basename(relativePath);

    // Read mapping dynamically on each request so no restarts are needed
    let currentMapping = {};
    if (fs.existsSync(MAPPING_FILE)) {
      try {
        currentMapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
      } catch (err) {
        console.error('Error reading mapping.json:', err.message);
      }
    }

    // Check if filename has a custom mapping override
    if (currentMapping[filename]) {
      const customFilePath = path.join(CUSTOM_IMAGES_DIR, currentMapping[filename]);
      if (fs.existsSync(customFilePath)) {
        console.log(`Mapping Override: serving ${currentMapping[filename]} for ${filename}`);
        serveFile(customFilePath, res, req);
        return;
      } else {
        console.warn(`Mapping Warning: ${currentMapping[filename]} mapped for ${filename} but file does not exist in my-images/`);
      }
    }

    const filePath = path.join(ASSETS_DIR, relativePath);
    serveFile(filePath, res, req);
    return;
  }

  // 2. Map route requests to respective HTML pages
  if (decodedPathname === '/' || decodedPathname === '/index' || decodedPathname === '/index.html') {
    serveHtmlFile(path.join(WEB_DIR, 'index.html'), res);
    return;
  }

  if (decodedPathname === '/research' || decodedPathname === '/research/') {
    serveHtmlFile(path.join(WEB_DIR, 'research.html'), res);
    return;
  }

  if (decodedPathname === '/studio' || decodedPathname === '/studio/') {
    serveHtmlFile(path.join(WEB_DIR, 'studio.html'), res);
    return;
  }

  // 3. Check if it's a static file in the zidd.fr directory
  const filePath = path.join(WEB_DIR, decodedPathname);
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(filePath, res, req);
      return;
    }

    // 4. SPA Dynamic Route Generation & Fallback
    // If it has no extension, we check if it matches a project slug in our index.html projects list
    const ext = path.extname(decodedPathname);
    if (!ext) {
      const slug = decodedPathname.replace(/^\//, ''); // e.g. "bond-and-kisses"
      
      const indexPath = path.join(WEB_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        const indexHtml = fs.readFileSync(indexPath, 'utf8');
        const match = indexHtml.match(/kit\.start\(app, element, (\{[\s\S]*?\})\);/);
        if (match) {
          try {
            const obj = eval('(' + match[1] + ')');
            const fullProjects = getFullProjectsArray();
            const matchedProject = fullProjects.find(p => p.slug === slug);
            
            if (matchedProject) {
              console.log(`Dynamic Project Route: serving detail view for slug "${slug}"`);
              
              // Rewrite SvelteKit options to load project page (node 3) instead of homepage (node 2)
              obj.node_ids = [0, 3];
              
              // Replace page data from "home" to "project"
              obj.data[1].data = {
                project: { project: matchedProject },
                page: { page: null },
                tags: { allTags: obj.data[0].data.tags.allTags },
                key: `custom-project-${slug}`
              };

              // Serialize back and replace
              const updatedObjStr = JSON.stringify(obj, null, 2);
              const replacement = `kit.start(app, element, ${updatedObjStr});`;
              const original = `kit.start(app, element, ${match[1]});`;
              
              const modifiedHtml = indexHtml.replace(original, replacement);
              
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              // Inject remote error logger script in HTML head for dynamic pages too
              const finalHtml = modifiedHtml
                .replace(/<head>/i, '<head>' + loggerScript)
                .replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/')
                .replace(/<div style="display: contents">[\s\S]*?<script>/i, '<div style="display: contents"><script>');
              res.end(finalHtml);
              return;
            }
          } catch (e) {
            console.error('Error evaluating index.html kit.start options:', e.message);
          }
        }
      }

      console.log(`SPA Route Fallback: serving index.html for ${decodedPathname}`);
      serveHtmlFile(path.join(WEB_DIR, 'index.html'), res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });
});

function serveFile(filePath, res, req) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const range = req ? req.headers.range : null;
    if (range && (ext === '.mp4' || ext === '.mp3')) {
      const totalLength = stats.size;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (start >= totalLength || end >= totalLength || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalLength}`
        });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

function serveHtmlFile(filePath, res) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Inject remote error logger script in HTML head
    let modifiedData = data.replace(/<head>/i, '<head>' + loggerScript);

    // Rewrite absolute datocms CDN links to use local server paths
    modifiedData = modifiedData.replace(/https:\/\/www\.datocms-assets\.com\//g, '/www.datocms-assets.com/');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(modifiedData);
  });
}

server.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `Server is running locally at http://localhost:${PORT}/`);
  console.log(`Serving website from: ${WEB_DIR}`);
  console.log(`Serving local CDN cache from: ${ASSETS_DIR}`);
  console.log(`Custom images folder: ${CUSTOM_IMAGES_DIR}`);
});
