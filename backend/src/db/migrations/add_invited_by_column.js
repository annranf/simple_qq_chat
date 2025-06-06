// Migration to add invited_by column to group_members table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../chat.db');

function runMigration() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                return reject(err);
            }
        });

        console.log('Starting migration: adding invited_by column to group_members table...');

        // Check if the column already exists
        db.get("PRAGMA table_info(group_members)", (err, result) => {
            if (err) {
                console.error('Error checking table info:', err);
                db.close();
                return reject(err);
            }

            // Get all columns
            db.all("PRAGMA table_info(group_members)", (err, columns) => {
                if (err) {
                    console.error('Error getting columns:', err);
                    db.close();
                    return reject(err);
                }

                const hasInvitedByColumn = columns.some(col => col.name === 'invited_by');
                
                if (hasInvitedByColumn) {
                    console.log('Column invited_by already exists, skipping migration.');
                    db.close();
                    return resolve();
                }

                // Add the invited_by column
                const alterTableSQL = `
                    ALTER TABLE group_members 
                    ADD COLUMN invited_by INTEGER 
                    REFERENCES users(id) ON DELETE SET NULL
                `;

                db.run(alterTableSQL, (err) => {
                    if (err) {
                        console.error('Error adding invited_by column:', err);
                        db.close();
                        return reject(err);
                    }

                    console.log('Successfully added invited_by column to group_members table.');
                    
                    // Create index for the new column
                    const createIndexSQL = `
                        CREATE INDEX IF NOT EXISTS idx_group_members_invited_by 
                        ON group_members(invited_by)
                    `;

                    db.run(createIndexSQL, (err) => {
                        if (err) {
                            console.error('Error creating index:', err);
                        } else {
                            console.log('Successfully created index for invited_by column.');
                        }

                        db.close((err) => {
                            if (err) {
                                console.error('Error closing database:', err);
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                });
            });
        });
    });
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { runMigration };
