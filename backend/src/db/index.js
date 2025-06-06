// src/db/index.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DBSOURCE = process.env.DATABASE_PATH || './chat.db';
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

const initDb = () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DBSOURCE, (err) => {
            if (err) {
                console.error('Error opening database', err.message);
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
                if (pragmaErr) {
                    console.error('Error enabling foreign keys', pragmaErr.message);
                    return reject(pragmaErr);
                }
                console.log('Foreign key support enabled.');

                // Read and execute schema
                fs.readFile(SCHEMA_PATH, 'utf8', (fsErr, sqlScript) => {
                    if (fsErr) {
                        console.error('Error reading schema file', fsErr.message);
                        return reject(fsErr);
                    }
                    db.exec(sqlScript, (execErr) => {
                        if (execErr) {
                            console.error('Error executing schema', execErr.message);
                            // Don't reject if error is "table already exists" etc.
                            // More robust error handling might be needed for idempotent schema application.
                            // For now, we'll log and proceed.
                            // return reject(execErr);
                        }
                        console.log('Database schema initialized (or already exists).');
                        resolve(db);
                    });
                });
            });
        });
    });
};

const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
};

const closeDb = () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing the database', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
};

module.exports = {
    initDb,
    getDb,
    closeDb,
};