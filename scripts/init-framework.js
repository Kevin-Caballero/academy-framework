#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
console.log(`${colors.bright}${colors.blue}   Academy Framework - Initialize${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Función principal
async function init() {
  try {
    // Comprobar si existen directorios
    const servicesDir = path.join(process.cwd(), 'services');
    if (!fs.existsSync(servicesDir)) {
      fs.mkdirSync(servicesDir, { recursive: true });
      console.log(`${colors.green}✓ Services directory created${colors.reset}`);
    }

    // Comprobar si existen directorios de base de datos
    const dbDir = path.join(process.cwd(), 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`${colors.green}✓ Database directory created${colors.reset}`);
    }

    // Comprobar si .env existe, si no crear desde .env.example
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(`${colors.green}✓ .env file created from .env.example${colors.reset}`);
    }

    // Preguntar si quiere inicializar los submódulos
    const answer = await askQuestion('¿Desea inicializar los submódulos Git? (s/n): ');
    
    if (answer.toLowerCase() === 's') {
      console.log(`${colors.yellow}Initializing Git submodules...${colors.reset}`);
      
      // Comprobar si .gitmodules existe
      const gitmodulesPath = path.join(process.cwd(), '.gitmodules');
      if (!fs.existsSync(gitmodulesPath)) {
        console.log(`${colors.yellow}No .gitmodules file found. Creating example repositories...${colors.reset}`);
        
        // Crear directorios de ejemplo para los servicios
        ['backend', 'admin', 'client'].forEach(service => {
          const serviceDir = path.join(servicesDir, service);
          if (!fs.existsSync(serviceDir)) {
            fs.mkdirSync(serviceDir, { recursive: true });
            fs.writeFileSync(
              path.join(serviceDir, 'README.md'),
              `# Servicio ${service.charAt(0).toUpperCase() + service.slice(1)}\n\nEste directorio debería contener un submódulo Git para el servicio ${service}.`
            );
            console.log(`${colors.green}✓ Example directory for ${service} created${colors.reset}`);
          }
        });
      } else {
        try {
          execSync('git submodule update --init --recursive', { stdio: 'inherit' });
          console.log(`${colors.green}✓ Submodules initialized correctly${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}✗ Error initializing submodules: ${error.message}${colors.reset}`);
        }
      }
    }

    // Preguntar si quiere iniciar la base de datos
    const startDb = await askQuestion('¿Desea iniciar la base de datos? (s/n): ');
    
    if (startDb.toLowerCase() === 's') {
      console.log(`${colors.yellow}Starting the database...${colors.reset}`);
      try {
        execSync('npm run db:up', { stdio: 'inherit' });
        console.log(`${colors.green}✓ Database started correctly${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error starting the database: ${error.message}${colors.reset}`);
      }
    }

    console.log(`\n${colors.bright}${colors.green}Framework initialized correctly!${colors.reset}`);
    console.log(`${colors.yellow}Execute 'npm start' to start all services${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error during initialization: ${error.message}${colors.reset}`);
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
init(); 