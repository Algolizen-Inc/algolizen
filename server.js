const express = require('express');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const marked = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure the 'data' directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Configure multer for image uploads
const upload = multer({
  dest: path.join(dataDir, 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

// Force consistent charset headers for HTML
app.use((req, res, next) => {
  if (req.accepts('html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  next();
});

// Health check endpoint (important for uptime/deployment checks)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Serve HTML pages
function servePage(route, file) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
}
servePage('/', 'index.html');
servePage('/about', 'about.html');
servePage('/contact', 'contact.html');
servePage('/service', 'service.html');
servePage('/admin', 'admin.html');
servePage('/blog', 'blog.html');
servePage('/search', 'search.html');
servePage('/blog/:id', 'blog-detail.html');

// SQLite DB init
let db;
(async () => {
  try {
    db = await open({
      filename: path.join(dataDir, 'contact.db'),
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ SQLite DB initialized.');
  } catch (err) {
    console.error('❌ SQLite DB error:', err);
    process.exit(1);
  }
})();

// Handle form submission
app.post('/submit-form', upload.none(), async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    await db.run(
      `INSERT INTO messages (name, email, message) VALUES (?, ?, ?)`,
      [name, email, message]
    );
    res.status(200).json({ message: '✅ Message stored successfully.' });
  } catch (err) {
    console.error('❌ Insert error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// API endpoint to get messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.all(`SELECT * FROM messages ORDER BY submitted_at DESC`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(messages);
  } catch (err) {
    console.error('❌ Fetch error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// API endpoint to create a new blog post
app.post('/api/blogs', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  try {
    await db.run(
      `INSERT INTO blogs (title, content, image_url) VALUES (?, ?, ?)`,
      [title, content, image]
    );
    res.status(201).json({ message: '✅ Blog post created successfully.' });
  } catch (err) {
    console.error('❌ Blog creation error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// API endpoint to fetch all blog posts
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await db.all(`SELECT id, title, content, image_url, published_at FROM blogs ORDER BY published_at DESC`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(blogs);
  } catch (err) {
    console.error('❌ Fetch blogs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// API endpoint to fetch a single blog post by ID
app.get('/api/blogs/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await db.get(`SELECT * FROM blogs WHERE id = ?`, [id]);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found.' });
    }

    // Ensure the image URL is served correctly
    const imageUrl = blog.image_url ? `${req.protocol}://${req.get('host')}${blog.image_url}` : null;

    res.status(200).json({
      ...blog,
      image_url: imageUrl, // Return the full URL for the image
    });
  } catch (err) {
    console.error('❌ Fetch blog details error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Mock data for search (replace with database or file-based search logic)
const searchData = [
  { title: 'Secure Web Development', description: 'Learn about our secure web development services.', url: '/service' },
  { title: 'Custom Software Solutions', description: 'Explore our custom software solutions.', url: '/service' },
  { title: 'About Algolizen', description: 'Learn more about our mission and team.', url: '/about' },
  { title: 'Contact Us', description: 'Get in touch with us for your project needs.', url: '/contact' },
];

// API endpoint for search
app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  const results = searchData.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
  );

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json(results);
});

app.post('/api/live-support', express.json(), (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Mock response from a support agent
  const responses = [
    "Hello! How can I assist you today?",
    "Thank you for reaching out. Let me check that for you.",
    "Can you please provide more details?",
    "Our team is looking into your issue. Please hold on.",
  ];
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ response: randomResponse });
});

app.get('/blog/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await db.get(`SELECT * FROM blogs WHERE id = ?`, [id]);
    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    const imageUrl = blog.image_url ? `${req.protocol}://${req.get('host')}${blog.image_url}` : '/uploads/default-image.jpg';

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${blog.title}</title>
        <meta property="og:title" content="${blog.title}">
        <meta property="og:description" content="${blog.description || blog.content.slice(0, 150)}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
        <meta property="og:type" content="article">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${blog.title}">
        <meta name="twitter:description" content="${blog.description || blog.content.slice(0, 150)}">
        <meta name="twitter:image" content="${imageUrl}">
        <meta name="twitter:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
      </head>
      <body>
        <h1>${blog.title}</h1>
        <p>${blog.content}</p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).send('Internal server error');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
