const express = require('express');
const cors = require('cors');
const https = require('https');
const zlib = require('zlib');

const app = express();
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://weather-radar-app-frontend.onrender.com',
    'https://weather-radar-app-backend.onrender.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3001;

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 120000;

// Fetch latest file from MRMS
async function fetchLatestMRMSFile() {
  return new Promise((resolve, reject) => {
    const url = 'https://mrms.ncep.noaa.gov/data/2D/ReflectivityAtLowestAltitude/';
    
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Look for both .grib2 and .grib2.gz files
        const allFiles = data.match(/MRMS_ReflectivityAtLowestAltitude_\d{8}-\d{6}\.grib2(\.gz)?/g) || [];
        
        if (allFiles.length === 0) {
          reject(new Error('No MRMS files found'));
          return;
        }
        
        // Sort and get most recent
        const latestFile = allFiles.sort().reverse()[0];
        const isCompressed = latestFile.endsWith('.gz');
        
        console.log(`Found latest file: ${latestFile} (compressed: ${isCompressed})`);
        resolve({ filename: latestFile, isCompressed });
      });
    }).on('error', reject);
  });
}

// Download file from MRMS
async function downloadMRMSFile(filename, isCompressed) {
  return new Promise((resolve, reject) => {
    const url = `https://mrms.ncep.noaa.gov/data/2D/ReflectivityAtLowestAltitude/${filename}`;
    
    https.get(url, { timeout: 30000 }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        if (isCompressed) {
          // Decompress gzip
          zlib.gunzip(buffer, (err, decompressed) => {
            if (err) reject(err);
            else resolve(decompressed);
          });
        } else {
          resolve(buffer);
        }
      });
    }).on('error', reject);
  });
}

async function parseGRIB2Buffer(buffer) {
    try {
      // Use the grib2-simple library
      const grib2 = require('grib2-simple');
      
      console.log('Parsing GRIB2 file with grib2-simple...');
      
      // Parse the GRIB2 buffer
      const messages = await grib2.parseBuffer(buffer);
      
      if (!messages || messages.length === 0) {
        throw new Error('No data messages found in GRIB2 file');
      }
      
      // MRMS RALA should be in the first message
      const message = messages[0];
      const points = [];
      
      // Get grid dimensions
      const ni = message.header.ni || 7000; // columns
      const nj = message.header.nj || 3500; // rows
      const data = message.data;
      
      console.log(`Grid dimensions: ${ni}x${nj}, Data points: ${data.length}`);
      
      // MRMS CONUS grid specifications
      const grid = {
        minLat: 20.0,
        maxLat: 55.0,
        minLon: -130.0,
        maxLon: -60.0
      };
      
      const latStep = (grid.maxLat - grid.minLat) / nj;
      const lonStep = (grid.maxLon - grid.minLon) / ni;
      
      // Sample rate to reduce data points for frontend
      const sampleRate = 25;
      
      for (let j = 0; j < nj; j += sampleRate) {
        for (let i = 0; i < ni; i += sampleRate) {
          const index = j * ni + i;
          if (index < data.length) {
            const value = data[index];
            
            // Filter valid reflectivity values (5-80 dBZ)
            if (value > 5 && value < 80) {
              const lat = grid.minLat + j * latStep;
              const lon = grid.minLon + i * lonStep;
              
              points.push({
                lat: parseFloat(lat.toFixed(4)),
                lon: parseFloat(lon.toFixed(4)),
                value: parseFloat(value.toFixed(1))
              });
            }
          }
        }
      }
      
      console.log(`Successfully parsed ${points.length} radar points`);
      return points;
      
    } catch (error) {
      console.error('GRIB2 parsing error:', error);
      throw new Error(`Failed to parse GRIB2 data: ${error.message}`);
    }
  }

// Fallback: Generate realistic data if MRMS fails
function generateFallbackData() {
  console.log('Using fallback data generation');
  const points = [];
  
  const stormCenters = [
    { lat: 35.5, lon: -97.5, intensity: 55, radius: 2.5 },
    { lat: 30.2, lon: -81.6, intensity: 45, radius: 2.0 },
    { lat: 41.8, lon: -87.6, intensity: 40, radius: 1.8 },
    { lat: 33.7, lon: -84.4, intensity: 50, radius: 2.2 },
    { lat: 29.7, lon: -95.3, intensity: 38, radius: 1.5 },
  ];
  
  stormCenters.forEach(storm => {
    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI * 2 * i) / 80;
      const distance = Math.random() * storm.radius;
      const lat = storm.lat + distance * Math.cos(angle);
      const lon = storm.lon + distance * Math.sin(angle);
      const distanceFactor = 1 - (distance / storm.radius);
      const value = Math.max(5, Math.min(75, storm.intensity * distanceFactor + (Math.random() - 0.5) * 15));
      
      points.push({
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lon.toFixed(4)),
        value: parseFloat(value.toFixed(1))
      });
    }
  });
  
  for (let i = 0; i < 150; i++) {
    points.push({
      lat: parseFloat((25 + Math.random() * 25).toFixed(4)),
      lon: parseFloat((-125 + Math.random() * 55).toFixed(4)),
      value: parseFloat((5 + Math.random() * 20).toFixed(1))
    });
  }
  
  return points;
}

app.get('/api/radar/latest', async (req, res) => {
  try {
    const now = Date.now();
    
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return res.json(cachedData);
    }
    
    let radarPoints;
    let timestamp;
    let source = 'MRMS RALA (Live)';
    
    try {
      console.log('Attempting to fetch from MRMS...');
      const { filename, isCompressed } = await fetchLatestMRMSFile();
      
      console.log('Downloading file...');
      const buffer = await downloadMRMSFile(filename, isCompressed);
      
      console.log(`Processing ${buffer.length} bytes...`);
      radarPoints = parseGRIB2Buffer(buffer);
      
      timestamp = filename.match(/\d{8}-\d{6}/)[0];
      
      console.log(`Successfully processed ${radarPoints.length} points from MRMS`);
    } catch (error) {
      console.error('MRMS fetch failed:', error.message);
      console.log('Falling back to generated data');
      
      radarPoints = generateFallbackData();
      timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '-');
      source = 'Generated (MRMS unavailable)';
    }
    
    cachedData = {
      timestamp,
      data: radarPoints,
      count: radarPoints.length,
      source
    };
    lastFetchTime = now;
    
    res.json(cachedData);
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).json({ 
      error: 'Failed to process radar data',
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    cached: !!cachedData,
    cacheAge: cachedData ? Math.floor((Date.now() - lastFetchTime) / 1000) : null
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Weather Radar API',
    endpoints: {
      health: '/api/health',
      radar: '/api/radar/latest'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Radar endpoint: http://localhost:${PORT}/api/radar/latest`);
});
