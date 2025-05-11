#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

// Mensaje de bienvenida
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}`);
console.log(`${colors.bright}${colors.blue}   ACADEMY Framework - Backup DB${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Variables de entorno
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'framework_db';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';

// Función principal
async function backupDb() {
  try {
    // Crear directorio de backups si no existe
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`${colors.green}✓ Backups directory created${colors.reset}`);
    }

    // Generar nombre de archivo de backup con fecha y hora
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
    const backupFile = path.join(backupDir, `${DB_NAME}_${timestamp}.sql`);

    console.log(`${colors.yellow}Creating backup of the database ${DB_NAME}...${colors.reset}`);
    
    // Ejecutar pg_dump para hacer backup
    const command = `docker exec framework-postgres pg_dump -U ${DB_USER} -d ${DB_NAME} > "${backupFile}"`;
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Backup created successfully: ${backupFile}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error creating backup: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}Trying alternative method...${colors.reset}`);
      
      // Método alternativo usando PGPASSWORD
      const altCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F p > "${backupFile}"`;
      try {
        execSync(altCommand, { stdio: 'inherit' });
        console.log(`${colors.green}✓ Backup created successfully (alternative method): ${backupFile}${colors.reset}`);
      } catch (altError) {
        console.error(`${colors.red}✗ Error in alternative method: ${altError.message}${colors.reset}`);
        throw new Error("Could not create backup");
      }
    }

    // Preguntar si quiere comprimir el archivo
    const compress = await askQuestion('Do you want to compress the backup file? (y/n): ');
    
    if (compress.toLowerCase() === 's') {
      console.log(`${colors.yellow}Compressing backup file...${colors.reset}`);
      try {
        // Usar gzip para comprimir
        execSync(`gzip "${backupFile}"`, { stdio: 'inherit' });
        console.log(`${colors.green}✓ Backup compressed: ${backupFile}.gz${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error compressing backup: ${error.message}${colors.reset}`);
      }
    }

    console.log(`\n${colors.bright}${colors.green}Backup completed!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error during backup process: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

// Función para hacer preguntas
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Ejecutar función principal
backupDb(); 