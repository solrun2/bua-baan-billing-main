const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database
const db = new sqlite3.Database('./billing.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Create customers table
      db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tax_id TEXT,
        phone TEXT,
        address TEXT
      )`);

      // Create documents table
      db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        document_number TEXT NOT NULL UNIQUE,
        document_type TEXT NOT NULL,
        document_date TEXT NOT NULL,
        valid_until TEXT,
        due_date TEXT,
        reference TEXT,
        notes TEXT,
        status TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL,
        tax REAL NOT NULL,
        total REAL NOT NULL,
        withholding_tax REAL NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`);

      // Create document_items table
      db.run(`CREATE TABLE IF NOT EXISTS document_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        product_title TEXT NOT NULL,
        description TEXT,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents (id)
      )`);

      console.log('Tables created or already exist.');
    });
  }
});

module.exports = db;
