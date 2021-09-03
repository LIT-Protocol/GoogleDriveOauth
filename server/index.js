const express = require("express")
const router = express.Router()
const PORT = process.env.port || 8080;
const bodyParser = require('body-parser')
const app = express();
const { google } = require('googleapis');
const { Pool } = require('pg')
const path = require('path')

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
  database: process.env.DB,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

router.post('/share', async (req, res) => {
    // First - get Google Drive refresh token (given acct email and drive)
    console.log(req.body);
    console.log(JSON.stringify(req.body['allowed-groups']));
    // Create a path to Google
    const jwt = new google.auth.OAuth2(
	process.env.CLIENT_KEY,
	process.env.CLIENT_SECRET,
	"http://testoauth.com:8080"
    );
    const { tokens } = await jwt.getToken(req.body.token);
    jwt.setCredentials(tokens);
    refresh_token = ""
    if (tokens.refresh_token) {
	console.log("Have refresh token!", tokens.refresh_token);
	refresh_token = tokens.refresh_token
    }
    console.log("Credentials set");
    // Now, get email + save information
    const drive = google.drive({
	version: 'v3',
	auth: jwt
    });

    const about_info = await drive.about.get({
	"fields": "user"});

    console.log(about_info.data.user.emailAddress)
    let id = ""
    // Write to DB
    if (refresh_token !== "") {
const query = {
  text: 'INSERT INTO sharers(email, latest_refresh_token) VALUES($1, $2) ON CONFLICT (email) DO UPDATE SET latest_refresh_token = $2 RETURNING *',
  values: [about_info.data.user.emailAddress, refresh_token],
}

	id = await (async () => {
  const client = await pool.connect()
  try {
    const res = await client.query(query)
    return res.rows[0].id
  } finally {
    // Make sure to release the client before any error handling,
    // just in case the error handling itself throws an error.
    client.release()
  }
	})().catch(err => console.log(err.stack))
	
    } else {
	// Get row
const query = {
  text: 'SELECT id FROM sharers WHERE email = $1',
  values: [about_info.data.user.emailAddress],
}

	id = await (async () => {
  const client = await pool.connect()
  try {
    const res = await client.query(query)
    return res.rows[0].id
  } finally {
    // Make sure to release the client before any error handling,
    // just in case the error handling itself throws an error.
    client.release()
  }
	})().catch(err => console.log(err.stack))	
    }

const query = {
    text: 'INSERT INTO links(drive_id, requirements, sharer_id, role) VALUES($1, $2, $3, $4) RETURNING *',
    values: [req.body['drive-id'], JSON.stringify(req.body['allowed-groups']), id, req.body.role],
}

	let uuid = await (async () => {
  const client = await pool.connect()
  try {
    const res = await client.query(query)
    return res.rows[0].id
  } finally {
    // Make sure to release the client before any error handling,
    // just in case the error handling itself throws an error.
    client.release()
  }
	})().catch(err => console.log(err.stack))	    
    console.log(uuid)
    res.end("http://testoauth.com/l/"+uuid);
});

router.post('/conditions', async (req, res) => {
    const uuid = req.body.uuid
const query = {
  text: 'SELECT requirements, drive_id, role FROM links WHERE id = $1',
  values: [uuid],
}

	let data = await (async () => {
  const client = await pool.connect()
  try {
    const res = await client.query(query)
    return res.rows[0]
  } finally {
    // Make sure to release the client before any error handling,
    // just in case the error handling itself throws an error.
    client.release()
  }
	})().catch(err => console.log(err.stack))
    res.end(JSON.stringify(data));
});

app.use('/api',router);
app.use(express.static('build'));
app.use((req, res) => res.sendFile(path.resolve(`${__dirname}/../build/index.html`)));
