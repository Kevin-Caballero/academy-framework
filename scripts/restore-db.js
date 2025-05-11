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
console.log(`${colors.bright}${colors.blue}   Academy Framework - Restore DB${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Variables de entorno
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'framework_db';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';

// Función principal
async function restoreDb() {
  try {
    // Comprobar si existe el directorio de backups
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      console.error(`${colors.red}✗ Backup directory not found${colors.reset}`);
      rl.close();
      return;
    }

    // Obtener lista de archivos de backup
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(file => ({ name: file, path: path.join(backupDir, file) }));

    if (backupFiles.length === 0) {
      console.error(`${colors.red}✗ No backups found${colors.reset}`);
      rl.close();
      return;
    }

    // Mostrar lista de backups disponibles
    console.log(`${colors.yellow}Available backups:${colors.reset}`);
    backupFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
    });

    // Seleccionar backup a restaurar
    const selection = await askQuestion(`\nSeleccione el backup a restaurar (1-${backupFiles.length}): `);
    const index = parseInt(selection) - 1;

    if (isNaN(index) || index < 0 || index >= backupFiles.length) {
      console.error(`${colors.red}✗ Invalid selection${colors.reset}`);
      rl.close();
      return;
    }

    const selectedBackup = backupFiles[index];
    console.log(`${colors.yellow}You have selected: ${selectedBackup.name}${colors.reset}`);

    // Confirmar restauración
    const confirm = await askQuestion(`\n¡WARNING! This operation will overwrite the current database (${DB_NAME}).\nAre you sure you want to continue? (y/n): `);
    
    if (confirm.toLowerCase() !== 's') {
      console.log(`${colors.yellow}Operation cancelled${colors.reset}`);
      rl.close();
      return;
    }

    // Descomprimir si es necesario
    let fileToRestore = selectedBackup.path;
    if (selectedBackup.name.endsWith('.gz')) {
      console.log(`${colors.yellow}Decompressing file...${colors.reset}`);
      try {
        // Descomprimir con gunzip
        execSync(`gunzip -k "${fileToRestore}"`, { stdio: 'inherit' });
        fileToRestore = fileToRestore.slice(0, -3); // Eliminar .gz
        console.log(`${colors.green}✓ File decompressed${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error decompressing: ${error.message}${colors.reset}`);
        rl.close();
        return;
      }
    }

    console.log(`${colors.yellow}Restoring database from ${fileToRestore}...${colors.reset}`);
    
    // Intentar restaurar usando docker
    const command = `docker exec -i framework-postgres psql -U ${DB_USER} -d ${DB_NAME} < "${fileToRestore}"`;
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Database restored successfully${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error restoring: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}Trying alternative method...${colors.reset}`);
      
      // Método alternativo usando psql directamente
      const altCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < "${fileToRestore}"`;
      try {
        execSync(altCommand, { stdio: 'inherit' });
        console.log(`${colors.green}✓ Database restored successfully (alternative method)${colors.reset}`);
      } catch (altError) {
        console.error(`${colors.red}✗ Error in alternative method: ${altError.message}${colors.reset}`);
        throw new Error("Could not restore database");
      }
    }

    // Limpiar archivo descomprimido temporal si fue necesario
    if (selectedBackup.name.endsWith('.gz') && fs.existsSync(fileToRestore)) {
      fs.unlinkSync(fileToRestore);
      console.log(`${colors.green}✓ Temporary file deleted${colors.reset}`);
    }

    console.log(`\n${colors.bright}${colors.green}Restore completed!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error during restoration: ${error.message}${colors.reset}`);
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
restoreDb(); 