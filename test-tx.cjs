
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const db = drizzle(neon('postgres://test:test@localhost/test'));
db.transaction(async (tx) => { console.log('Transaction started'); }).catch(e => console.error(e.message));

