// ============================================================
// GATE ENTRY & VERIFICATION SYSTEM
// SERVER.JS
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// ============================================================
// LOCAL IP
// ============================================================

function getLocalIPv4() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const item of interfaces[name] || []) {
            if (
                item.family === "IPv4" &&
                !item.internal
            ) {
                return item.address;
            }
        }
    }

    return "localhost";
}

const LOCAL_IP = getLocalIPv4();

const BASE_URL =
    process.env.APP_BASE_URL ||
    `http://${LOCAL_IP}:${PORT}`;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json({
        limit: "25mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "25mb"
    })
);

// ============================================================
// UPLOAD FOLDER
// ============================================================

const uploadFolder = path.join(
    __dirname,
    "uploads"
);

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}

app.use(
    "/uploads",
    express.static(uploadFolder)
);

// ============================================================
// DATABASE
// ============================================================

const dbPath = path.join(
    __dirname,
    "visitors.db"
);

const db = new sqlite3.Database(
    dbPath,
    (error) => {

        if (error) {
            console.error(
                "DATABASE ERROR:",
                error.message
            );
        } else {
            console.log(
                "DATABASE CONNECTED SUCCESSFULLY"
            );
        }
    }
);

// ============================================================
// CREATE DATABASE TABLE
// ============================================================

db.serialize(() => {

    db.run(
        `
        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            person_to_visit TEXT,
            person_email TEXT,
            purpose TEXT,
            photo TEXT,
            photos TEXT,
            status TEXT DEFAULT 'PENDING',
            entry_time TEXT,
            exit_time TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        `,
        (error) => {

            if (error) {
                console.error(
                    "TABLE ERROR:",
                    error.message
                );
            } else {
                console.log(
                    "VISITORS TABLE READY"
                );
            }
        }
    );

    const columns = [
        {
            name: "person_email",
            sql:
                "ALTER TABLE visitors ADD COLUMN person_email TEXT"
        },
        {
            name: "purpose",
            sql:
                "ALTER TABLE visitors ADD COLUMN purpose TEXT"
        },
        {
            name: "photo",
            sql:
                "ALTER TABLE visitors ADD COLUMN photo TEXT"
        },
        {
            name: "photos",
            sql:
                "ALTER TABLE visitors ADD COLUMN photos TEXT"
        },
        {
            name: "status",
            sql:
                "ALTER TABLE visitors ADD COLUMN status TEXT DEFAULT 'PENDING'"
        },
        {
            name: "entry_time",
            sql:
                "ALTER TABLE visitors ADD COLUMN entry_time TEXT"
        },
        {
            name: "exit_time",
            sql:
                "ALTER TABLE visitors ADD COLUMN exit_time TEXT"
        },
        {
            name: "created_at",
            sql:
                "ALTER TABLE visitors ADD COLUMN created_at TEXT"
        }
    ];

    columns.forEach(
        (column) => {

            db.all(
                "PRAGMA table_info(visitors)",
                (error, rows) => {

                    if (error) {
                        console.error(
                            "COLUMN CHECK ERROR:",
                            error.message
                        );
                        return;
                    }

                    const exists =
                        rows.some(
                            row =>
                                row.name ===
                                column.name
                        );

                    if (!exists) {

                        db.run(
                            column.sql,
                            (alterError) => {

                                if (alterError) {

                                    console.log(
                                        `${column.name} column could not be added:`,
                                        alterError.message
                                    );

                                } else {

                                    console.log(
                                        `${column.name} column added successfully.`
                                    );
                                }
                            }
                        );
                    }
                }
            );
        }
    );
});

// ============================================================
// EMAIL CONFIGURATION
// ============================================================

const EMAIL_USER =
    process.env.EMAIL_USER;

const EMAIL_PASSWORD =
    process.env.EMAIL_PASSWORD;

let transporter = null;

if (
    EMAIL_USER &&
    EMAIL_PASSWORD
) {

    transporter =
        nodemailer.createTransport({

            service: "gmail",

            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        });

    console.log(
        "EMAIL USER: Loaded"
    );

    console.log(
        "EMAIL PASSWORD: Loaded"
    );

} else {

    console.log(
        "EMAIL USER: NOT FOUND"
    );

    console.log(
        "EMAIL PASSWORD: NOT FOUND"
    );
}

// ============================================================
// VERIFY EMAIL
// ============================================================

async function verifyEmail() {

    if (!transporter) {

        console.log(
            "EMAIL CONFIGURATION MISSING"
        );

        return;
    }

    try {

        await transporter.verify();

        console.log(
            "EMAIL CONFIGURATION READY"
        );

    } catch (error) {

        console.error(
            "EMAIL CONFIGURATION ERROR:",
            error.message
        );
    }
}

// ============================================================
// HELPER - VALID EMAIL
// ============================================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email || "").trim()
    );
}

// ============================================================
// HELPER - VALID PHONE
// ============================================================

function isValidPhone(phone) {

    return /^[0-9]{10}$/.test(
        String(phone || "").trim()
    );
}

// ============================================================
// HELPER - ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// GET VISITOR
// ============================================================

function getVisitor(id) {

    return new Promise(
        (resolve, reject) => {

            db.get(
                `
                SELECT *
                FROM visitors
                WHERE id = ?
                `,
                [id],
                (error, visitor) => {

                    if (error) {
                        reject(error);
                    } else {
                        resolve(visitor);
                    }
                }
            );
        }
    );
}

// ============================================================
// DATABASE RUN HELPER
// ============================================================

function runQuery(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.run(
                sql,
                params,
                function (error) {

                    if (error) {
                        reject(error);
                    } else {

                        resolve({
                            changes:
                                this.changes,

                            lastID:
                                this.lastID
                        });
                    }
                }
            );
        }
    );
}

// ============================================================
// STATUS PAGE
// ============================================================

function statusPage(
    title,
    heading,
    message,
    type = "success"
) {

    let color = "#198754";

    if (type === "danger") {
        color = "#dc3545";
    }

    if (type === "warning") {
        color = "#f08c00";
    }

    return `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
>

<title>${escapeHtml(title)}</title>

<style>

body {
    margin:0;
    padding:20px;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
}

.card {
    max-width:650px;
    margin:60px auto;
    background:white;
    padding:40px;
    border-radius:15px;
    box-shadow:0 8px 30px rgba(0,0,0,.10);
    text-align:center;
}

h1 {
    color:${color};
}

p {
    color:#444;
    font-size:17px;
    line-height:1.6;
}

</style>

</head>

<body>

<div class="card">

<h1>
${escapeHtml(heading)}
</h1>

<p>
${message}
</p>

</div>

</body>

</html>
`;
}

// ============================================================
// TEST API
// ============================================================

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            success: true,

            message:
                "Visitor Management Backend is working",

            baseUrl:
                BASE_URL,

            networkUrl:
                `http://${LOCAL_IP}:${PORT}`
        });
    }
);

// ============================================================
// HEALTH API
// ============================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,

            server:
                "running",

            database:
                "connected",

            email:
                transporter
                    ? "configured"
                    : "not configured"
        });
    }
);

// ============================================================
// GET ALL VISITORS
// ============================================================

app.get(
    "/api/visitors",
    (req, res) => {

        db.all(
            `
            SELECT *
            FROM visitors
            ORDER BY id DESC
            `,
            [],
            (error, visitors) => {

                if (error) {

                    console.error(
                        "GET VISITORS ERROR:",
                        error.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to load visitors",

                        error:
                            error.message
                    });
                }

                res.json({

                    success: true,

                    visitors
                });
            }
        );
    }
);

// ============================================================
// GET ONE VISITOR
// ============================================================

app.get(
    "/api/visitors/:id",
    async (req, res) => {

        try {

            const visitor =
    await getVisitor(
        req.params.id
    );
            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found"
                });
            }

            res.json({

                success: true,

                visitor
            });

        } catch (error) {

            console.error(
                "GET VISITOR ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load visitor",

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// CREATE VISITOR
// ============================================================

app.post(
    "/api/visitors",
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone,
                personToVisit,
                personEmail,
                person_email,
                purpose
            } = req.body;

            const finalPersonEmail =
                personEmail ||
                person_email ||
                "";

            if (
                !name ||
                !email ||
                !phone ||
                !personToVisit ||
                !finalPersonEmail
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill all required fields."
                });
            }

            if (!isValidEmail(email)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Visitor email address is invalid."
                });
            }

            if (
                !isValidEmail(
                    finalPersonEmail
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Person's email address is invalid."
                });
            }

            if (!isValidPhone(phone)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Phone number must contain exactly 10 digits."
                });
            }

            const result =
                await runQuery(
                    `
                    INSERT INTO visitors
                    (
                        name,
                        email,
                        phone,
                        person_to_visit,
                        person_email,
                        purpose,
                        status,
                        entry_time,
                        exit_time,
                        created_at
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        String(name).trim(),

                        String(email).trim(),

                        String(phone).trim(),

                        String(
                            personToVisit
                        ).trim(),

                        String(
                            finalPersonEmail
                        ).trim(),

                        purpose
                            ? String(
                                purpose
                              ).trim()
                            : "",

                        "PENDING",

                        null,

                        null,

                        new Date().toISOString()
                    ]
                );

            const visitor =
                await getVisitor(
                    result.lastID
                );

            console.log(
                "VISITOR SAVED SUCCESSFULLY:",
                result.lastID
            );

            res.status(201).json({

                success: true,

                message:
                    "Visitor saved successfully.",

                visitorId:
                    result.lastID,

                visitor
            });

        } catch (error) {

            console.error(
                "CREATE VISITOR ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to save visitor.",

                error:
                    error.message
            });
        }
    }
);
// ============================================================
// SAVE SINGLE PHOTO - COMPATIBILITY ENDPOINT
// ============================================================

async function savePhotosForVisitor(
    visitorId,
    photos
) {

    if (
        !Array.isArray(photos) ||
        photos.length === 0
    ) {
        throw new Error(
            "No photos were provided."
        );
    }

    const savedFiles = [];

    try {

        for (
            let index = 0;
            index < photos.length;
            index++
        ) {

            const photo =
                photos[index];

            if (
                typeof photo !== "string"
            ) {
                continue;
            }

            const match =
                photo.match(
                    /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
                );

            if (!match) {
                continue;
            }

            const extension =
                match[1]
                    .toLowerCase()
                    .replace(
                        "jpeg",
                        "jpg"
                    );

            const base64Data =
                match[2];

            const fileName =
                `visitor_${visitorId}_${Date.now()}_${index}.${extension}`;

            const filePath =
                path.join(
                    uploadFolder,
                    fileName
                );

            fs.writeFileSync(
                filePath,
                Buffer.from(
                    base64Data,
                    "base64"
                )
            );

            savedFiles.push(
                fileName
            );
        }

        if (
            savedFiles.length === 0
        ) {

            throw new Error(
                "No valid photos were received."
            );
        }

        const photoJson =
            JSON.stringify(
                savedFiles
            );

        const result =
            await runQuery(
                `
                UPDATE visitors

                SET
                    photo = ?,
                    photos = ?

                WHERE
                    id = ?
                `,
                [
                    savedFiles[0],
                    photoJson,
                    visitorId
                ]
            );

        if (
            result.changes === 0
        ) {

            throw new Error(
                "Visitor was not found."
            );
        }

        console.log(
            `VISITOR PHOTOS SAVED: ${visitorId} (${savedFiles.length} photo(s))`
        );

        return savedFiles;

    } catch (error) {

        for (
            const fileName
            of savedFiles
        ) {

            const filePath =
                path.join(
                    uploadFolder,
                    fileName
                );

            try {

                if (
                    fs.existsSync(
                        filePath
                    )
                ) {

                    fs.unlinkSync(
                        filePath
                    );
                }

            } catch (deleteError) {

                console.error(
                    "PHOTO CLEANUP ERROR:",
                    deleteError.message
                );
            }
        }

        throw error;
    }
}

// ============================================================
// GET ALL PHOTO FILENAMES
// ============================================================

function getVisitorPhotoFiles(
    visitor
) {

    const result = [];

    // --------------------------------------------------------
    // NEW MULTIPLE PHOTO FIELD
    // --------------------------------------------------------

    if (
        visitor &&
        visitor.photos
    ) {

        try {

            const parsed =
                typeof visitor.photos === "string"
                    ? JSON.parse(
                        visitor.photos
                    )
                    : visitor.photos;

            if (
                Array.isArray(parsed)
            ) {

                parsed.forEach(
                    (fileName) => {

                        if (
                            fileName &&
                            typeof fileName === "string" &&
                            !result.includes(fileName)
                        ) {

                            result.push(
                                fileName
                            );
                        }
                    }
                );
            }

        } catch (error) {

            console.error(
                "PHOTOS JSON PARSE ERROR:",
                error.message
            );
        }
    }

    // --------------------------------------------------------
    // OLD SINGLE PHOTO FIELD
    // --------------------------------------------------------

    if (
        visitor &&
        visitor.photo &&
        typeof visitor.photo === "string" &&
        !result.includes(
            visitor.photo
        )
    ) {

        result.push(
            visitor.photo
        );
    }

    return result;
}

// ============================================================
// SAVE SINGLE PHOTO
// ============================================================

app.put(
    "/api/visitors/:id/photo",
    async (req, res) => {

        try {

            const {
                photo
            } = req.body;

            if (!photo) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Photo is required."
                });
            }

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found."
                });
            }

            const savedFiles =
                await savePhotosForVisitor(
                    req.params.id,
                    [photo]
                );

            const updatedVisitor =
                await getVisitor(
                    req.params.id
                );

            console.log(
                "VISITOR PHOTO SAVED:",
                req.params.id
            );

            res.json({

                success: true,

                message:
                    "Photo saved successfully.",

                photo:
                    savedFiles[0],

                photos:
                    savedFiles,

                visitor:
                    updatedVisitor
            });

        } catch (error) {

            console.error(
                "SAVE PHOTO ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to save photo.",

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// SAVE MULTIPLE PHOTOS
// ============================================================

app.post(
    "/api/visitors/:id/photos",
    async (req, res) => {

        try {

            const {
                photos
            } = req.body;

            if (
                !Array.isArray(photos) ||
                photos.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "At least one photo is required."
                });
            }

            // Maximum 10 photos
            if (
                photos.length > 10
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Maximum 10 photos are allowed."
                });
            }

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found."
                });
            }

            const savedFiles =
                await savePhotosForVisitor(
                    req.params.id,
                    photos
                );

            const updatedVisitor =
                await getVisitor(
                    req.params.id
                );

            console.log(
                `VISITOR ${req.params.id}: ${savedFiles.length} PHOTO(S) SAVED`
            );

            res.json({

                success: true,

                message:
                    `${savedFiles.length} photo(s) saved successfully.`,

                photo:
                    savedFiles[0],

                photos:
                    savedFiles,

                visitor:
                    updatedVisitor
            });

        } catch (error) {

            console.error(
                "SAVE MULTIPLE PHOTOS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to save photos.",

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// SUBMIT VISITOR
// ============================================================

app.put(
    "/api/visitors/:id/submit",
    async (req, res) => {

        try {

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found."
                });
            }
                        const photoFiles =
                getVisitorPhotoFiles(
                    visitor
                );

            if (
                photoFiles.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please capture at least one visitor photo."
                });
            }

            const result =
                await runQuery(
                    `
                    UPDATE visitors

                    SET
                        status = 'PENDING'

                    WHERE
                        id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (
                result.changes === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Visitor could not be submitted."
                });
            }

            const updatedVisitor =
                await getVisitor(
                    req.params.id
                );

            try {

                await sendApprovalEmail(
                    updatedVisitor
                );

            } catch (emailError) {

                console.error(
                    "APPROVAL EMAIL ERROR:",
                    emailError.message
                );
            }

            console.log(
                "VISITOR SUBMITTED SUCCESSFULLY:",
                req.params.id
            );

            res.json({

                success: true,

                message:
                    "Visitor submitted successfully.",

                visitor:
                    updatedVisitor
            });

        } catch (error) {

            console.error(
                "SUBMIT VISITOR ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to submit visitor.",

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// SEND APPROVAL EMAIL
// ============================================================

async function sendApprovalEmail(
    visitor
) {

    if (!transporter) {

        throw new Error(
            "Email transporter is not configured."
        );
    }

    if (
        !visitor.person_email
    ) {

        throw new Error(
            "Person's email address is missing."
        );
    }

    // ========================================================
    // GET ALL PHOTOS
    // ========================================================

    const photoFiles =
        getVisitorPhotoFiles(
            visitor
        );

    const attachments = [];

    const photoHtmlParts = [];

    photoFiles.forEach(
        (
            fileName,
            index
        ) => {

            const safeFileName =
                path.basename(
                    fileName
                );

            const photoPath =
                path.join(
                    uploadFolder,
                    safeFileName
                );

            if (
                !fs.existsSync(
                    photoPath
                )
            ) {

                console.log(
                    "PHOTO FILE NOT FOUND:",
                    photoPath
                );

                return;
            }

            const extension =
                path.extname(
                    safeFileName
                ).toLowerCase();

            let contentType =
                "image/jpeg";

            if (
                extension === ".png"
            ) {

                contentType =
                    "image/png";

            } else if (
                extension === ".webp"
            ) {

                contentType =
                    "image/webp";
            }

            const cid =
                `visitor-photo-${visitor.id}-${index}`;

            attachments.push({

                filename:
                    safeFileName,

                path:
                    photoPath,

                cid,

                contentType
            });

            photoHtmlParts.push(`

                <div
                    style="
                        display:inline-block;
                        vertical-align:top;
                        margin:8px;
                        text-align:center;
                    "
                >

                    <img
                        src="cid:${cid}"
                        alt="Visitor Photo ${index + 1}"
                        style="
                            width:220px;
                            height:220px;
                            object-fit:cover;
                            border-radius:12px;
                            border:1px solid #ddd;
                            display:block;
                        "
                    >

                    <div
                        style="
                            margin-top:6px;
                            font-size:13px;
                            color:#666;
                        "
                    >
                        Photo ${index + 1}
                    </div>

                </div>

            `);
        }
    );

    const photosHtml =
        photoHtmlParts.length > 0
            ? `

                <h3>
                    Visitor Photos
                </h3>

                <div>
                    ${photoHtmlParts.join("")}
                </div>

            `
            : `

                <p>
                    No visitor photos available.
                </p>

            `;

    // ========================================================
    // APPROVAL LINKS
    // ========================================================

    const approveUrl =
        `${BASE_URL}/api/visitors/${visitor.id}/approve`;

    const rejectUrl =
        `${BASE_URL}/api/visitors/${visitor.id}/reject`;

    // ========================================================
    // EMAIL HTML
    // ========================================================

    const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
>

<title>
    Visitor Approval Request
</title>

</head>

<body
style="
    margin:0;
    padding:30px;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
"
>

<div
style="
    max-width:650px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:15px;
    box-shadow:0 5px 20px rgba(0,0,0,.08);
"
>

<h2>
    Visitor Approval Request
</h2>

<p>
    Please verify the following visitor
    before granting entry.
</p>

<hr>

<p>
    <strong>
        Visitor ID:
    </strong>

    ${escapeHtml(visitor.id)}
</p>

<p>
    <strong>
        Name:
    </strong>

    ${escapeHtml(visitor.name)}
</p>

<p>
    <strong>
        Email:
    </strong>

    ${escapeHtml(visitor.email)}
</p>

<p>
    <strong>
        Phone:
    </strong>

    ${escapeHtml(visitor.phone)}
</p>

<p>
    <strong>
        Person to Visit:
    </strong>

    ${escapeHtml(
        visitor.person_to_visit
    )}
</p>

<p>
    <strong>
        Purpose:
    </strong>

    ${escapeHtml(
        visitor.purpose ||
        "Not provided"
    )}
</p>

<p>
    <strong>
        Status:
    </strong>

    <span
        style="
            color:#f08c00;
            font-weight:bold;
        "
    >
        PENDING
    </span>
</p>

<hr>

${photosHtml}

<hr>

<h3>
    Please choose an action
</h3>

<p>
    Please verify the visitor before
    granting entry.
</p>

<div
style="
    margin-top:25px;
    text-align:center;
"
>

<a
href="${approveUrl}"
style="
    display:inline-block;
    padding:14px 28px;
    margin:5px;
    background:#198754;
    color:white;
    text-decoration:none;
    border-radius:7px;
    font-weight:bold;
"
>
    ✓ ACCEPT
</a>

<a
href="${rejectUrl}"
style="
    display:inline-block;
    padding:14px 28px;
    margin:5px;
    background:#dc3545;
    color:white;
    text-decoration:none;
    border-radius:7px;
    font-weight:bold;
"
>
    ✕ REJECT
</a>

</div>

<hr>

<p
style="
    color:#777;
    font-size:13px;
"
>
    This email was generated automatically
    by the Gate Entry & Verification System.
</p>

</div>

</body>

</html>

`;

    // ========================================================
    // SEND ONE EMAIL WITH ALL PHOTOS
    // ========================================================

    await transporter.sendMail({

        from:
            EMAIL_USER,

        to:
            visitor.person_email,

        subject:
            `Visitor Approval Request - ${visitor.name} (#${visitor.id})`,

        html,

        attachments
    });

    console.log(
        `APPROVAL EMAIL SENT: ${visitor.person_email} (${attachments.length} photo(s))`
    );
}
// ============================================================
// SUBMIT VISITOR
// ============================================================

app.put(
    "/api/visitors/:id/submit",
    async (req, res) => {

        try {

            const visitorId =
                Number(req.params.id);

            const visitor =
                await getVisitor(visitorId);

            if (!visitor) {

                return res.status(404).json({
                    success: false,
                    message: "Visitor not found"
                });
            }

            // ------------------------------------------------
            // DO NOT SUBMIT AN ALREADY APPROVED VISITOR
            // ------------------------------------------------

            if (
                visitor.status ===
                "APPROVED"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Visitor is already approved"
                });
            }

            // ------------------------------------------------
            // DO NOT SUBMIT A REJECTED VISITOR
            // ------------------------------------------------

            if (
                visitor.status ===
                "REJECTED"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Visitor has already been rejected"
                });
            }

            // ------------------------------------------------
            // CHECK ALL PHOTOS
            // ------------------------------------------------

            const photoFiles =
                getVisitorPhotoFiles(
                    visitor
                );

            if (
                photoFiles.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Visitor photos are not saved yet."
                });
            }

            // ------------------------------------------------
            // CHECK PERSON EMAIL
            // ------------------------------------------------

            if (
                !visitor.person_email
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Person's email is missing."
                });
            }

            // ------------------------------------------------
            // KEEP STATUS PENDING
            // ------------------------------------------------

            await runQuery(
                `
                UPDATE visitors

                SET
                    status = 'PENDING'

                WHERE
                    id = ?
                `,
                [
                    visitorId
                ]
            );

            const updatedVisitor =
                await getVisitor(
                    visitorId
                );

            // ------------------------------------------------
            // SEND APPROVAL EMAIL
            // ALL PHOTOS ARE INCLUDED
            // ------------------------------------------------

            await sendApprovalEmail(
                updatedVisitor
            );

            console.log(
                "VISITOR SUBMITTED SUCCESSFULLY:",
                visitorId
            );

            res.json({

                success: true,

                message:
                    "Visitor submitted successfully. Approval email sent.",

                emailSent:
                    true,

                visitor:
                    updatedVisitor
            });

        } catch (error) {

            console.error(
                "SUBMIT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to submit visitor"
            });
        }
    }
);

// ============================================================
// SEND APPROVAL EMAIL AGAIN
// ============================================================

app.post(
    "/api/visitors/:id/send-approval",
    async (req, res) => {

        try {

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found"
                });
            }

            if (
                visitor.status !==
                "PENDING"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Visitor status is ${visitor.status}`
                });
            }

            await sendApprovalEmail(
                visitor
            );

            res.json({

                success: true,

                message:
                    "Approval request sent successfully."
            });

        } catch (error) {

            console.error(
                "SEND APPROVAL ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    }
);

// ============================================================
// APPROVAL CONFIRMATION PAGE
//
// GET = SHOW CONFIRMATION
// POST = ACTUALLY APPROVE
// ============================================================

app.get(
    "/api/visitors/:id/approve",
    async (req, res) => {

        try {

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).send(
                    statusPage(
                        "Visitor Not Found",
                        "Visitor Not Found",
                        "Visitor record was not found.",
                        "danger"
                    )
                );
            }

            if (
                visitor.status ===
                "APPROVED"
            ) {

                return res.send(
                    statusPage(
                        "Already Approved",
                        "Already Approved",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> is already approved.`
                    )
                );
            }

            if (
                visitor.status ===
                "REJECTED"
            ) {

                return res.send(
                    statusPage(
                        "Already Rejected",
                        "Cannot Approve",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> was already rejected.`,
                        "danger"
                    )
                );
            }

            res.send(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
>

<title>
    Confirm Visitor Approval
</title>

<style>

body {
    margin:0;
    padding:20px;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
}

.card {
    max-width:600px;
    margin:60px auto;
    background:white;
    padding:35px;
    border-radius:15px;
    box-shadow:0 8px 30px rgba(0,0,0,.1);
    text-align:center;
}

.info {
    background:#f7f9fc;
    padding:20px;
    border-radius:10px;
    text-align:left;
    margin:25px 0;
}

button {
    border:0;
    padding:15px 30px;
    border-radius:8px;
    font-size:16px;
    font-weight:bold;
    cursor:pointer;
    background:#198754;
    color:white;
}

</style>

</head>

<body>

<div class="card">

<h1>
    Confirm Visitor Approval
</h1>

<p>
    Please confirm that you want to approve this visitor.
</p>

<div class="info">

<p>
<strong>
    Visitor ID:
</strong>

${escapeHtml(visitor.id)}

</p>

<p>
<strong>
    Name:
</strong>

${escapeHtml(visitor.name)}

</p>

<p>
<strong>
    Email:
</strong>

${escapeHtml(visitor.email)}

</p>

<p>
<strong>
    Phone:
</strong>

${escapeHtml(visitor.phone)}

</p>

<p>
<strong>
    Person to Visit:
</strong>

${escapeHtml(
    visitor.person_to_visit
)}

</p>

<p>
<strong>
    Purpose:
</strong>

${escapeHtml(
    visitor.purpose ||
    "Not provided"
)}

</p>

</div>

<form
    method="POST"
    action="/api/visitors/${visitor.id}/approve"
>

<button type="submit">

✓ CONFIRM APPROVAL

</button>

</form>

</div>

</body>

</html>

`);

        } catch (error) {

            console.error(
                "APPROVAL PAGE ERROR:",
                error
            );

            res.status(500).send(
                statusPage(
                    "Server Error",
                    "Something went wrong",
                    escapeHtml(
                        error.message
                    ),
                    "danger"
                )
            );
        }
    }
);

// ============================================================
// ACTUAL APPROVAL
// ============================================================

app.post(
    "/api/visitors/:id/approve",
    async (req, res) => {

        try {

            const visitorId =
                Number(req.params.id);

            const visitor =
                await getVisitor(
                    visitorId
                );

            if (!visitor) {

                return res.status(404).send(
                    statusPage(
                        "Visitor Not Found",
                        "Visitor Not Found",
                        "Visitor record was not found.",
                        "danger"
                    )
                );
            }

            // ------------------------------------------------
            // ALREADY APPROVED
            // ------------------------------------------------

            if (
                visitor.status ===
                "APPROVED"
            ) {

                return res.send(
                    statusPage(
                        "Already Approved",
                        "Already Approved",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> has already been approved.`
                    )
                );
            }

            // ------------------------------------------------
            // ALREADY REJECTED
            // ------------------------------------------------

            if (
                visitor.status ===
                "REJECTED"
            ) {

                return res.send(
                    statusPage(
                        "Already Rejected",
                        "Cannot Approve",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> was already rejected.`,
                        "danger"
                    )
                );
            }

            // ------------------------------------------------
            // ONLY PENDING CAN BE APPROVED
            // ------------------------------------------------

            if (
                visitor.status !==
                "PENDING"
            ) {

                return res.status(400).send(
                    statusPage(
                        "Invalid Status",
                        "Cannot Approve",
                        `Visitor status is ${escapeHtml(
                            visitor.status
                        )}.`,
                        "danger"
                    )
                );
            }

            // ------------------------------------------------
            // EXACT ENTRY TIME
            // ------------------------------------------------

            const entryTime =
                new Date().toISOString();

            const result =
                await runQuery(
                    `
                    UPDATE visitors

                    SET
                        status = 'APPROVED',
                        entry_time = ?,
                        exit_time = NULL

                    WHERE
                        id = ?

                    AND
                        status = 'PENDING'
                    `,
                    [
                        entryTime,
                        visitorId
                    ]
                );

            if (
                result.changes === 0
            ) {

                return res.status(400).send(
                    statusPage(
                        "Approval Failed",
                        "Could Not Approve",
                        "The visitor could not be approved.",
                        "danger"
                    )
                );
            }

            const updatedVisitor =
                await getVisitor(
                    visitorId
                );

            // ------------------------------------------------
            // SEND RESULT EMAIL
            // ------------------------------------------------

            try {

                await sendVisitorResultEmail(
                    updatedVisitor,
                    "APPROVED"
                );

            } catch (emailError) {

                console.error(
                    "APPROVED RESULT EMAIL ERROR:",
                    emailError.message
                );
            }

            // ------------------------------------------------
            // SEND E-PASS EMAIL TO VISITOR
            // ------------------------------------------------

            try {

                await sendEPassEmail(
                    updatedVisitor
                );

            } catch (emailError) {

                console.error(
                    "E-PASS EMAIL ERROR:",
                    emailError.message
                );
            }

            console.log(
                "VISITOR APPROVED:",
                visitorId
            );

            res.send(
                statusPage(
                    "Visitor Approved",
                    "✓ Visitor Approved",
                    `
                    <p>
                        Visitor
                        <strong>
                            ${escapeHtml(
                                updatedVisitor.name
                            )}
                        </strong>
                        has been approved successfully.
                    </p>

                    <p>
                        Entry Time:
                        <strong>
                            ${escapeHtml(
                                updatedVisitor.entry_time
                            )}
                        </strong>
                    </p>

                    <p>
                        The visitor can now use the
                        E-Pass for entry.
                    </p>
                    `
                )
            );

        } catch (error) {

            console.error(
                "POST APPROVE ERROR:",
                error
            );

            res.status(500).send(
                statusPage(
                    "Server Error",
                    "Approval Failed",
                    escapeHtml(
                        error.message
                    ),
                    "danger"
                )
            );
        }
    }
);
// ============================================================
// SEND E-PASS EMAIL TO VISITOR
// ============================================================

async function sendEPassEmail(visitor) {

    if (!transporter) {
        throw new Error(
            "Email transporter is not configured."
        );
    }

    if (!visitor.email) {
        throw new Error(
            "Visitor email address is missing."
        );
    }

    const photoFiles =
        getVisitorPhotoFiles(visitor);

    const attachments = [];
    const photoHtmlParts = [];

    photoFiles.forEach(
        (fileName, index) => {

            const safeFileName =
                path.basename(fileName);

            const photoPath =
                path.join(
                    uploadFolder,
                    safeFileName
                );

            if (
                !fs.existsSync(photoPath)
            ) {
                console.log(
                    "E-PASS PHOTO FILE NOT FOUND:",
                    photoPath
                );

                return;
            }

            const extension =
                path.extname(
                    safeFileName
                ).toLowerCase();

            let contentType =
                "image/jpeg";

            if (
                extension === ".png"
            ) {
                contentType =
                    "image/png";
            } else if (
                extension === ".webp"
            ) {
                contentType =
                    "image/webp";
            }

            const cid =
                `epass-photo-${visitor.id}-${index}`;

            attachments.push({
                filename:
                    safeFileName,

                path:
                    photoPath,

                cid,

                contentType
            });

            photoHtmlParts.push(`
                <div
                    style="
                        display:inline-block;
                        vertical-align:top;
                        margin:8px;
                        text-align:center;
                    "
                >

                    <img
                        src="cid:${cid}"
                        alt="Visitor Photo ${index + 1}"
                        style="
                            width:180px;
                            height:220px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid #ddd;
                            display:block;
                                                    "
                    >

                    <div
                        style="
                            margin-top:6px;
                            font-size:13px;
                            color:#666;
                        "
                    >
                        Photo ${index + 1}
                    </div>

                </div>
            `);
        }
    );

    const photosHtml =
        photoHtmlParts.length > 0
            ? `
                <h3>Visitor Photo</h3>

                <div>
                    ${photoHtmlParts.join("")}
                </div>
            `
            : `
                <p>No visitor photo available.</p>
            `;

    const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
>

<title>
    Visitor E-Pass
</title>

</head>

<body
style="
    margin:0;
    padding:30px;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
"
>

<div
style="
    max-width:650px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:15px;
    box-shadow:0 5px 20px rgba(0,0,0,.08);
"
>

<h2
style="
    color:#173b68;
"
>
    Gate Entry & Verification System
</h2>

<div
style="
    background:#198754;
    color:white;
    padding:20px;
    border-radius:10px;
    text-align:center;
"
>

<h1>
    ✓ VISITOR E-PASS
</h1>

<p>
    Your visitor request has been approved.
</p>

</div>

<hr>

<h3>
    E-Pass Details
</h3>

<p>
    <strong>
        Visitor ID:
    </strong>
    ${escapeHtml(visitor.id)}
</p>

<p>
    <strong>
        Visitor Name:
    </strong>
    ${escapeHtml(visitor.name)}
</p>

<p>
    <strong>
        Visitor Email:
    </strong>
    ${escapeHtml(visitor.email)}
</p>

<p>
    <strong>
        Phone:
    </strong>
    ${escapeHtml(visitor.phone)}
</p>

<p>
    <strong>
        Person to Visit:
    </strong>
    ${escapeHtml(visitor.person_to_visit)}
</p>

<p>
    <strong>
        Purpose:
    </strong>
    ${escapeHtml(
        visitor.purpose || "Not provided"
    )}
</p>

<p>
    <strong>
        Entry Time:
    </strong>
    ${escapeHtml(visitor.entry_time)}
</p>

<p>
    <strong>
        Status:
    </strong>

    <span
        style="
            color:#198754;
            font-weight:bold;
        "
    >
        APPROVED
    </span>
</p>

<hr>

${photosHtml}

<hr>

<p
style="
    color:#555;
    line-height:1.6;
"
>
    Please show this E-Pass at the security gate
    when entering the premises.
</p>

<p
style="
    color:#777;
    font-size:13px;
"
>
    This E-Pass was generated automatically by
    the Gate Entry & Verification System.
</p>

</div>

</body>

</html>

`;

    await transporter.sendMail({

        from:
            EMAIL_USER,

        to:
            visitor.email,

        subject:
            `Visitor E-Pass - ${visitor.name} (#${visitor.id})`,

        html,

        attachments
    });

    console.log(
        `E-PASS EMAIL SENT: ${visitor.email} (${attachments.length} photo(s))`
    );
}
// ============================================================
// GET APPROVAL STATUS
// ============================================================

app.get(
    "/api/visitors/:id/status",
    async (req, res) => {

        try {

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found"
                });
            }

            res.json({

                success: true,

                status:
                    visitor.status,

                visitor
            });

        } catch (error) {

            console.error(
                "GET STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to get visitor status",

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// UPDATE VISITOR STATUS
// ============================================================

app.put(
    "/api/visitors/:id/status",
    async (req, res) => {

        try {

            const visitorId =
                Number(req.params.id);

            const requestedStatus =
                String(
                    req.body.status || ""
                )
                .trim()
                .toUpperCase();

            const allowedStatuses = [
                "PENDING",
                "APPROVED",
                "REJECTED"
            ];

            if (
                !allowedStatuses.includes(
                    requestedStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid status"
                });
            }

            const visitor =
                await getVisitor(
                    visitorId
                );

            if (!visitor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Visitor not found"
                });
            }

            // ------------------------------------------------
            // DO NOT CHANGE AN EXITED VISITOR
            // ------------------------------------------------

            if (
                visitor.status ===
                "EXITED"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Exited visitor status cannot be changed"
                });
            }

            // ------------------------------------------------
            // APPROVE
            // ------------------------------------------------

            if (
                requestedStatus ===
                "APPROVED"
            ) {

                if (
                    visitor.status ===
                    "APPROVED"
                ) {

                    return res.json({

                        success: true,

                        message:
                            "Visitor is already approved",

                        visitor
                    });
                }

                if (
                    visitor.status ===
                    "REJECTED"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Rejected visitor cannot be approved"
                    });
                }

                const entryTime =
                    new Date().toISOString();

                const result =
                    await runQuery(
                        `
                        UPDATE visitors

                        SET
                            status = 'APPROVED',
                            entry_time = ?,
                            exit_time = NULL

                        WHERE
                            id = ?

                        AND
                            status = 'PENDING'
                        `,
                        [
                            entryTime,
                            visitorId
                        ]
                    );

                if (
                    result.changes === 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Visitor could not be approved"
                    });
                }

                const updatedVisitor =
                    await getVisitor(
                        visitorId
                    );

                // ------------------------------------------------
                // SEND APPROVED EMAIL
                // ------------------------------------------------

                try {

                    await sendVisitorResultEmail(
                        updatedVisitor,
                        "APPROVED"
                    );

                } catch (emailError) {

                    console.error(
                        "APPROVED EMAIL ERROR:",
                        emailError.message
                    );
                }
                try {

    await sendEPassEmail(
        updatedVisitor
    );

} catch (emailError) {

    console.error(
        "E-PASS EMAIL ERROR:",
        emailError.message
    );
}

                console.log(
                    "VISITOR APPROVED:",
                    visitorId
                );

                return res.json({

                    success: true,

                    message:
                        "Visitor approved successfully",

                    visitor:
                        updatedVisitor
                });
            }

            // ------------------------------------------------
            // REJECT
            // ------------------------------------------------

            if (
                requestedStatus ===
                "REJECTED"
            ) {

                if (
                    visitor.status ===
                    "REJECTED"
                ) {

                    return res.json({

                        success: true,

                        message:
                            "Visitor is already rejected",

                        visitor
                    });
                }

                if (
                    visitor.status ===
                    "APPROVED"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Approved visitor cannot be rejected"
                    });
                }

                const result =
                    await runQuery(
                        `
                        UPDATE visitors

                        SET
                            status = 'REJECTED',
                            entry_time = NULL,
                            exit_time = NULL

                        WHERE
                            id = ?

                        AND
                            status = 'PENDING'
                        `,
                        [
                            visitorId
                        ]
                    );

                if (
                    result.changes === 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Visitor could not be rejected"
                    });
                }

                const updatedVisitor =
                    await getVisitor(
                        visitorId
                    );

                // ------------------------------------------------
                // SEND REJECTION EMAIL
                // ------------------------------------------------

                try {

                    await sendVisitorResultEmail(
                        updatedVisitor,
                        "REJECTED"
                    );

                } catch (emailError) {

                    console.error(
                        "REJECTED EMAIL ERROR:",
                        emailError.message
                    );
                }

                console.log(
                    "VISITOR REJECTED:",
                    visitorId
                );

                return res.json({

                    success: true,

                    message:
                        "Visitor rejected successfully",

                    visitor:
                        updatedVisitor
                });
            }

            // ------------------------------------------------
            // PENDING
            // ------------------------------------------------

            if (
                requestedStatus ===
                "PENDING"
            ) {

                if (
                    visitor.status ===
                    "APPROVED"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Approved visitor cannot be moved back to pending"
                    });
                }

                if (
                    visitor.status ===
                    "REJECTED"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Rejected visitor cannot be moved back to pending"
                    });
                }

                return res.json({

                    success: true,

                    message:
                        "Visitor is already pending",

                    visitor
                });
            }

        } catch (error) {

            console.error(
                "UPDATE STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update visitor status",

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// REJECT VISITOR
// ============================================================

app.get(
    "/api/visitors/:id/reject",
    async (req, res) => {

        try {

            const visitor =
                await getVisitor(
                    req.params.id
                );

            if (!visitor) {

                return res.status(404).send(
                    statusPage(
                        "Visitor Not Found",
                        "Visitor Not Found",
                        "Visitor record was not found.",
                        "danger"
                    )
                );
            }

            if (
                visitor.status ===
                "REJECTED"
            ) {

                return res.send(
                    statusPage(
                        "Already Rejected",
                        "Already Rejected",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> has already been rejected.`,
                        "danger"
                    )
                );
            }

            if (
                visitor.status ===
                "APPROVED"
            ) {

                return res.send(
                    statusPage(
                        "Already Approved",
                        "Cannot Reject",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> has already been approved.`
                    )
                );
            }

            res.send(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
>

<title>
    Confirm Visitor Rejection
</title>

<style>

body {
    margin:0;
    padding:20px;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
}

.card {
    max-width:600px;
    margin:60px auto;
    background:white;
    padding:35px;
    border-radius:15px;
    box-shadow:0 8px 30px rgba(0,0,0,.1);
    text-align:center;
}

.info {
    background:#f7f9fc;
    padding:20px;
    border-radius:10px;
    text-align:left;
    margin:25px 0;
}

button {
    border:0;
    padding:15px 30px;
    border-radius:8px;
    font-size:16px;
    font-weight:bold;
    cursor:pointer;
    background:#dc3545;
    color:white;
}

</style>

</head>

<body>

<div class="card">

<h1>
    Confirm Visitor Rejection
</h1>

<p>
    Please confirm that you want to reject this visitor.
</p>

<div class="info">

<p>
<strong>
    Visitor ID:
</strong>

${escapeHtml(visitor.id)}

</p>

<p>
<strong>
    Name:
</strong>

${escapeHtml(visitor.name)}

</p>

<p>
<strong>
    Email:
</strong>

${escapeHtml(visitor.email)}

</p>

<p>
<strong>
    Phone:
</strong>

${escapeHtml(visitor.phone)}

</p>

<p>
<strong>
    Person to Visit:
</strong>

${escapeHtml(
    visitor.person_to_visit
)}

</p>

<p>
<strong>
    Purpose:
</strong>

${escapeHtml(
    visitor.purpose ||
    "Not provided"
)}

</p>

</div>

<form
    method="POST"
    action="/api/visitors/${visitor.id}/reject"
>

<button type="submit">

✕ CONFIRM REJECTION

</button>

</form>

</div>

</body>

</html>

`);

        } catch (error) {

            console.error(
                "REJECTION PAGE ERROR:",
                error
            );

            res.status(500).send(
                statusPage(
                    "Server Error",
                    "Something went wrong",
                    escapeHtml(
                        error.message
                    ),
                    "danger"
                )
            );
        }
    }
);

// ============================================================
// ACTUAL REJECTION
// ============================================================

app.post(
    "/api/visitors/:id/reject",
    async (req, res) => {

        try {

            const visitorId =
                Number(req.params.id);

            const visitor =
                await getVisitor(
                    visitorId
                );

            if (!visitor) {

                return res.status(404).send(
                    statusPage(
                        "Visitor Not Found",
                        "Visitor Not Found",
                        "Visitor record was not found.",
                        "danger"
                    )
                );
            }

            if (
                visitor.status ===
                "REJECTED"
            ) {

                return res.send(
                    statusPage(
                        "Already Rejected",
                        "Already Rejected",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> has already been rejected.`,
                        "danger"
                    )
                );
            }

            if (
                visitor.status ===
                "APPROVED"
            ) {

                return res.send(
                    statusPage(
                        "Already Approved",
                        "Cannot Reject",
                        `<strong>${escapeHtml(
                            visitor.name
                        )}</strong> has already been approved.`
                    )
                );
            }

            if (
                visitor.status !==
                "PENDING"
            ) {

                return res.status(400).send(
                    statusPage(
                        "Invalid Status",
                        "Cannot Reject",
                        `Visitor status is ${escapeHtml(
                            visitor.status
                        )}.`,
                        "danger"
                    )
                );
            }

            const result =
                await runQuery(
                    `
                    UPDATE visitors

                    SET
                        status = 'REJECTED',
                        entry_time = NULL,
                        exit_time = NULL

                    WHERE
                        id = ?

                    AND
                        status = 'PENDING'
                    `,
                    [
                        visitorId
                    ]
                );

            if (
                result.changes === 0
            ) {

                return res.status(400).send(
                    statusPage(
                        "Rejection Failed",
                        "Could Not Reject",
                        "The visitor could not be rejected.",
                        "danger"
                    )
                );
            }

            const updatedVisitor =
                await getVisitor(
                    visitorId
                );

            try {

                await sendVisitorResultEmail(
                    updatedVisitor,
                    "REJECTED"
                );

            } catch (emailError) {

                console.error(
                    "REJECTED RESULT EMAIL ERROR:",
                    emailError.message
                );
            }

            console.log(
                "VISITOR REJECTED:",
                visitorId
            );

            res.send(
                statusPage(
                    "Visitor Rejected",
                    "✕ Visitor Rejected",
                    `
                    <p>
                        Visitor
                        <strong>
                            ${escapeHtml(
                                updatedVisitor.name
                            )}
                        </strong>
                        has been rejected.
                    </p>
                    `
                    ,
                    "danger"
                )
            );

        } catch (error) {

            console.error(
                "POST REJECT ERROR:",
                error
            );

            res.status(500).send(
                statusPage(
                    "Server Error",
                    "Rejection Failed",
                    escapeHtml(
                        error.message
                    ),
                    "danger"
                )
            );
        }
    }
);
// ============================================================
// MARK VISITOR EXIT
// ============================================================

app.put(
    "/api/visitors/:id/exit",
    async (req, res) => {
        try {
            const visitor =
                await getVisitor(
                    req.params.id
                );

            console.log(
                "EXIT REQUEST:",
                req.params.id
            );

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Visitor not found"
                });
            }

            console.log(
                "EXIT VISITOR:",
                visitor
            );

            // ------------------------------------------------
            // STATUS CHECK
            // ------------------------------------------------

            const status = String(
                visitor.status || ""
            )
                .trim()
                .toUpperCase();

            if (status !== "APPROVED") {
                return res.status(400).json({
                    success: false,
                    message:
                        `Visitor status is ${status || "UNKNOWN"}. Only APPROVED visitors can exit.`,
                    visitor: visitor
                });
            }

            // ------------------------------------------------
            // ENTRY CHECK
            // ------------------------------------------------

            if (!visitor.entry_time) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Visitor has no entry time."
                });
            }

            // ------------------------------------------------
            // ALREADY EXITED CHECK
            // ------------------------------------------------

            if (visitor.exit_time) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Visitor has already exited.",
                    visitor: visitor
                });
            }

            // ------------------------------------------------
            // CREATE EXACT EXIT TIME
            // ------------------------------------------------

            const exitTime =
                new Date().toISOString();

            console.log(
                "RECORDING EXIT TIME:",
                exitTime
            );

            // ------------------------------------------------
            // UPDATE DATABASE
            // ------------------------------------------------

            const result =
                await runQuery(
                    `
                    UPDATE visitors
                    SET
                        status = 'EXITED',
                        exit_time = ?
                    WHERE
                        id = ?
                    AND
                        status = 'APPROVED'
                    AND
                        exit_time IS NULL
                    `,
                    [
                        exitTime,
                        req.params.id
                    ]
                );

            console.log(
                "EXIT UPDATE RESULT:",
                result
            );

            if (
                !result ||
                result.changes === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Visitor exit could not be recorded."
                });
            }

            // ------------------------------------------------
            // GET UPDATED RECORD
            // ------------------------------------------------

            const updatedVisitor =
                await getVisitor(
                    req.params.id
                );

            console.log(
                `VISITOR ${req.params.id} EXITED AT ${updatedVisitor.exit_time}`
            );

            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({
                success: true,
                message:
                    "Visitor exit recorded successfully.",
                visitor:
                    updatedVisitor
            });

        } catch (error) {
            console.error(
                "EXIT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to record visitor exit.",
                error:
                    error.message
            });
        }
    }
);
app.listen(
    PORT,
    "0.0.0.0",
    async () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "GATE ENTRY & VERIFICATION SYSTEM"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `Local:   http://localhost:${PORT}`
        );

        console.log(
            `Network: http://${LOCAL_IP}:${PORT}`
        );

        console.log(
            `Test:    http://localhost:${PORT}/api/test`
        );

        console.log(
            `Health:  http://localhost:${PORT}/api/health`
        );

        console.log(
            `Uploads: http://localhost:${PORT}/uploads/`
        );

        console.log(
            "=========================================="
        );

        console.log(
            "SERVER RUNNING"
        );

        console.log(
            "=========================================="
        );

        await verifyEmail();

        console.log("");
    }
);
