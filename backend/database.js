const Database = require("better-sqlite3");
const path = require("path");

// =====================================================
// DATABASE
// =====================================================

const databasePath = path.join(
    __dirname,
    "visitors.db"
);

const db = new Database(databasePath);


// =====================================================
// DATABASE SETTINGS
// =====================================================

db.pragma("journal_mode = WAL");


// =====================================================
// CREATE VISITORS TABLE
// =====================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS visitors (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        email TEXT NOT NULL,

        phone TEXT NOT NULL,

        person_to_visit TEXT NOT NULL,

        person_email TEXT,

        purpose TEXT,

        photo TEXT,

        status TEXT NOT NULL DEFAULT 'PENDING',

        entry_time TEXT,

        exit_time TEXT,

        created_at TEXT DEFAULT CURRENT_TIMESTAMP

    )
`).run();


// =====================================================
// CHECK EXISTING COLUMNS
// =====================================================

const columns = db
    .prepare(`PRAGMA table_info(visitors)`)
    .all();

const columnNames = columns.map(
    (column) => column.name
);


// =====================================================
// ADD MISSING COLUMNS
// =====================================================

// person_email
if (!columnNames.includes("person_email")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN person_email TEXT
    `).run();

    console.log(
        "Added missing column: person_email"
    );
}


// purpose
if (!columnNames.includes("purpose")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN purpose TEXT
    `).run();

    console.log(
        "Added missing column: purpose"
    );
}


// photo
if (!columnNames.includes("photo")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN photo TEXT
    `).run();

    console.log(
        "Added missing column: photo"
    );
}


// status
if (!columnNames.includes("status")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN status TEXT DEFAULT 'PENDING'
    `).run();

    console.log(
        "Added missing column: status"
    );
}


// entry_time
if (!columnNames.includes("entry_time")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN entry_time TEXT
    `).run();

    console.log(
        "Added missing column: entry_time"
    );
}


// exit_time
if (!columnNames.includes("exit_time")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN exit_time TEXT
    `).run();

    console.log(
        "Added missing column: exit_time"
    );
}


// created_at
if (!columnNames.includes("created_at")) {

    db.prepare(`
        ALTER TABLE visitors
        ADD COLUMN created_at TEXT
    `).run();

    console.log(
        "Added missing column: created_at"
    );
}


// =====================================================
// DATABASE CHECK
// =====================================================

const finalColumns = db
    .prepare(`PRAGMA table_info(visitors)`)
    .all();

console.log(
    "Visitors table ready."
);

console.log(
    "Columns:",
    finalColumns.map(
        (column) => column.name
    )
);


// =====================================================
// EXPORT DATABASE
// =====================================================

module.exports = db;