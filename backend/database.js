import sqlite3 from "sqlite3";
sqlite3.verbose();

const db = new sqlite3.Database("./logcache.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS cache (
      hash TEXT PRIMARY KEY,
      analysis TEXT
    )
  `);
});

export default db;
