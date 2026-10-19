const mysql = require('mysql2/promise');
const config = require('./config');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mysqlPool = null;
let dbInitPromise = null;

// Helper: Attempt to start local MySQL if installed via XAMPP and not running
function tryStartLocalMySQL() {
  const xamppMysqld = 'D:\\Coding App\\XAMPP\\mysql\\bin\\mysqld.exe';
  const xamppIni = 'D:\\Coding App\\XAMPP\\mysql\\bin\\my.ini';

  if (fs.existsSync(xamppMysqld)) {
    try {
      console.log('[DB] Attempting to auto-start local MySQL daemon from XAMPP...');
      const child = spawn(xamppMysqld, [`--defaults-file=${xamppIni}`], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } catch (e) {
      console.warn('[DB] Auto-start notice:', e.message);
    }
  }
}

async function initDatabaseConnection() {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    console.log(`[DB] Connecting to MySQL server at ${config.db.host}:${config.db.port}...`);
    
    // Auto-create database if not existing
    let connected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const rootConn = await mysql.createConnection({
          host: config.db.host,
          user: config.db.user,
          password: config.db.password,
          port: config.db.port,
          connectTimeout: 4000
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await rootConn.end();
        connected = true;
        break;
      } catch (err) {
        console.warn(`[DB] Connection attempt ${attempt} failed (${err.message}).`);
        if (attempt === 1) {
          tryStartLocalMySQL();
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (!connected) {
      console.error(`[DB] Could not connect to MySQL server at ${config.db.host}:${config.db.port}. Please ensure MySQL is running.`);
    }

    mysqlPool = mysql.createPool({
      ...config.db,
      dateStrings: true,
      waitForConnections: true,
      connectionLimit: 15,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    console.log(`[DB] MySQL pool established successfully for database: ${config.db.database}`);
  })();

  return dbInitPromise;
}

const dbQuery = async (sql, params = []) => {
  await initDatabaseConnection();
  const [rows] = await mysqlPool.execute(sql, params);
  return rows;
};

const getPool = () => {
  return {
    getConnection: async () => {
      await initDatabaseConnection();
      return await mysqlPool.getConnection();
    }
  };
};

module.exports = {
  initDatabaseConnection,
  dbQuery,
  getPool,
  isMySQL: () => true
};
