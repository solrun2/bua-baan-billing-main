const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// GET all customers
app.get('/api/customers', (req, res) => {
  const sql = 'SELECT * FROM customers ORDER BY name ASC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET all documents
app.get('/api/documents', (req, res) => {
  const sql = `SELECT d.id, d.document_number, c.name as customer_name, d.document_date as issue_date, d.total_amount, d.status, d.document_type 
               FROM documents d
               JOIN customers c ON d.customer_id = c.id`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json(rows);
  });
});

// POST a new document
app.post('/api/documents', (req, res) => {
  const { customer, items, summary, ...docData } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Find or create customer
    const findCustomerSql = `SELECT id FROM customers WHERE name = ? OR tax_id = ?`;
    db.get(findCustomerSql, [customer.name, customer.taxId], function(err, row) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(400).json({ "error": err.message });
      }

      const handleCustomer = (customerId) => {
        // 2. Insert into documents table
        const docSql = `INSERT INTO documents (customer_id, document_number, document_type, document_date, valid_until, due_date, reference, notes, status, subtotal, discount, tax, total, withholding_tax)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const docParams = [
          customerId, docData.documentNumber, docData.documentType, docData.documentDate, docData.validUntil, docData.dueDate,
          docData.reference, docData.notes, docData.status, summary.subtotal, summary.discount, summary.tax, summary.total, summary.withholdingTax
        ];

        db.run(docSql, docParams, function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(400).json({ "error": err.message });
          }
          const documentId = this.lastID;

          // 3. Insert into document_items table
          const itemSql = `INSERT INTO document_items (document_id, product_title, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)`;
          const itemStmt = db.prepare(itemSql);
          for (const item of items) {
            itemStmt.run(documentId, item.productTitle, item.description, item.quantity, item.unitPrice, item.amount);
          }
          itemStmt.finalize((err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(400).json({ "error": err.message });
            }
            db.run('COMMIT');
            res.json({ id: documentId, ...req.body });
          });
        });
      };

      if (row) {
        // Customer found
        handleCustomer(row.id);
      } else {
        // Customer not found, create new
        const insertCustomerSql = `INSERT INTO customers (name, tax_id, phone, address) VALUES (?, ?, ?, ?)`;
        db.run(insertCustomerSql, [customer.name, customer.taxId, customer.phone, customer.address], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(400).json({ "error": err.message });
          }
          handleCustomer(this.lastID);
        });
      }
    });
  });
});

// PUT (Update) a document
app.put('/api/documents/:id', (req, res) => {
  // Simplified update for now. A full implementation would be more complex.
  const { id } = req.params;
  const { customer, items, summary, ...docData } = req.body;

  const sql = `UPDATE documents SET
    document_number = ?,
    document_date = ?,
    status = ?,
    total = ?
    WHERE id = ?`;
  
  const params = [docData.documentNumber, docData.documentDate, docData.status, summary.total, id];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ "error": res.message });
    }
    res.json({ message: "Successfully updated", changes: this.changes });
  });
});


app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
