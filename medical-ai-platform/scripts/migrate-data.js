const Database = require('better-sqlite3');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function run() {
    const sqlite = new Database('./data/vaidyavision.db');
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();

    // Arranged roughly by foreign-key dependency precedence ensuring strict referential integrity
    const tables = [
        "users", "hospitals", "specialties", "departments", 
        "hospital_memberships", "patient_hospital_links",
        "doctor_profiles", "email_connections", "templates", "hospital_report_templates",
        "scans", "cases", "case_artifacts", "case_assignments", "case_reports", "case_report_versions",
        "reports", "report_deliveries", "prescriptions", "medications", 
        "appointments", "conversations", "messages", "notifications"
    ];

    try {
        await pgClient.query('BEGIN');

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            let rows;
            try {
                rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
            } catch (err) {
                // Ignore if table doesn't exist in the current subset natively.
                continue; 
            }
            if (!rows || rows.length === 0) continue;

            const columns = Object.keys(rows[0]);
            
            for (const row of rows) {
                const boolCols = ['is_read', 'is_active', 'is_primary', 'is_default', 'patient_visible', 'responded'];
                const dateCols = ['created_at', 'updated_at', 'joined_at', 'opened_at', 'closed_at', 'due_at', 'accepted_at', 'completed_at', 'signed_at', 'released_at', 'sent_at', 'delivered_at', 'read_at', 'last_contact_at', 'expires_at', 'selected_slot', 'last_message_at', 'last_sign_in_at', 'start_time', 'end_time', 'reviewed_at', 'scheduled_at', 'uploaded_at'];

                const values = columns.map(c => {
                    let val = row[c];
                    if (val === null || val === undefined) return null;
                    if (boolCols.includes(c)) return val === 1 || val === "1" || val === true;
                    if (dateCols.includes(c)) {
                        let numVal = Number(val);
                        if (!isNaN(numVal)) {
                            // If timestamp is less than 2 Billion, it's UNIX Seconds (unixepoch). Multiply by 1000.
                            if (numVal < 2000000000) {
                                return new Date(numVal * 1000).toISOString();
                            }
                            // Otherwise it's JS milliseconds.
                            return new Date(numVal).toISOString();
                        }
                    }
                    if (c === 'uploaded_at' && val === "datetime('now')") {
                        return new Date().toISOString();
                    }
                    return val;
                });

                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const colsQuery = columns.map(c => `"${c}"`).join(', ');
                const query = `INSERT INTO "${table}" (${colsQuery}) VALUES (${placeholders})`;
                
                if (table === 'scans') {
                    console.log(`[DEBUG SCANS]:`, values);
                }

                await pgClient.query(query, values);
            }
            console.log(`✅ Migrated ${rows.length} rows for ${table}`);
            
            if (columns.includes('id')) {
                await pgClient.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 0) + 1, false) FROM "${table}";`);
            }
        }

        await pgClient.query('COMMIT');
        console.log("🎉 SQLite to Neon Migration Complete!");
    } catch (error) {
        await pgClient.query('ROLLBACK');
        console.error("Migration failed:", error);
    } finally {
        await pgClient.end();
        sqlite.close();
    }
}
run();
