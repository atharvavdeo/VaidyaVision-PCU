const fs = require('fs');

let code = fs.readFileSync('lib/db/schema.ts', 'utf8');

// 1. Imports
code = code.replace(/import \{.*?\} from "drizzle-orm\/sqlite-core";/g, 'import { pgTable, text, integer, boolean, timestamp, serial, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";');
code = code.replace(/sqliteTable/g, 'pgTable');

// 2. Primary Keys
code = code.replace(/integer\("id"\)\.primaryKey\(\{ autoIncrement: true \}\)/g, 'serial("id").primaryKey()');

// 3. Booleans
code = code.replace(/integer\('([^']+)',\s*\{\s*mode:\s*"boolean"\s*\}\)/g, 'boolean(\'$1\')');
code = code.replace(/integer\("([^"]+)",\s*\{\s*mode:\s*"boolean"\s*\}\)/g, 'boolean("$1")');

// 4. Timestamps
code = code.replace(/integer\("([^"]+)",\s*\{\s*mode:\s*"timestamp"\s*\}\)\.\$defaultFn\(\(\)\s*=>\s*new Date\(\)\)/g, 'timestamp("$1", { mode: "date" }).defaultNow()');
code = code.replace(/integer\("([^"]+)",\s*\{\s*mode:\s*"timestamp"\s*\}\)/g, 'timestamp("$1", { mode: "date" })');

// Old epoch defaults
code = code.replace(/integer\("([^"]+)"\)\.default\(sql`\(unixepoch\(\)\)`\)/g, 'timestamp("$1", { mode: "date" }).defaultNow()');

// 5. JSON fields selectively mapped to JSONB natively
code = code.replace(/text\("content_json"\)/g, 'jsonb("content_json")');
code = code.replace(/text\("processing_result_json"\)/g, 'jsonb("processing_result_json")');
code = code.replace(/text\("section_schema_json"\)/g, 'jsonb("section_schema_json")');
code = code.replace(/text\("signature_config_json"\)/g, 'jsonb("signature_config_json")');
code = code.replace(/text\("released_medications_json"\)/g, 'jsonb("released_medications_json")');

fs.writeFileSync('lib/db/schema.ts', code);
console.log("Schema converted to PostgreSQL structurally!");
