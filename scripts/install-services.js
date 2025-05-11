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
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Mensaje de bienvenida
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}`);
console.log(`${colors.bright}${colors.blue}   ACADEMY Framework - Install Services${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Función principal
async function installServices() {
  try {
    // Detectar servicios disponibles
    const servicesDir = path.join(process.cwd(), 'services');
    if (!fs.existsSync(servicesDir)) {
      console.error(`${colors.red}✗ Services directory not found${colors.reset}`);
      process.exit(1);
    }

    // Obtener lista de servicios disponibles
    const availableServices = fs.readdirSync(servicesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => ({
        name: dirent.name,
        path: path.join(servicesDir, dirent.name)
      }));

    if (availableServices.length === 0) {
      console.log(`${colors.yellow}No services found. Create services in the 'services/' directory.${colors.reset}`);
      rl.close();
      return;
    }

    // Mostrar servicios disponibles
    console.log(`${colors.yellow}Services available:${colors.reset}`);
    availableServices.forEach((service, index) => {
      console.log(`${index + 1}. ${colors.bright}${service.name}${colors.reset}`);
    });

    // Seleccionar servicios a instalar
    const selection = await askQuestion('\nSelect services to install (numbers separated by comma, or "all"): ');
    
    let selectedServices = [];
    
    if (selection.toLowerCase() === 'todos' || selection.toLowerCase() === 'all') {
      selectedServices = availableServices;
    } else {
      const selectedIndices = selection.split(',')
        .map(s => s.trim())
        .map(s => parseInt(s) - 1)
        .filter(index => !isNaN(index) && index >= 0 && index < availableServices.length);
      
      if (selectedIndices.length === 0) {
        console.log(`${colors.yellow}No valid services selected.${colors.reset}`);
        rl.close();
        return;
      }
      
      selectedServices = selectedIndices.map(index => availableServices[index]);
    }

    console.log(`\n${colors.yellow}Installing the following services:${colors.reset}`);
    selectedServices.forEach(service => {
      console.log(`- ${colors.bright}${service.name}${colors.reset}`);
    });

    // Instalar servicios seleccionados
    for (const service of selectedServices) {
      console.log(`\n${colors.yellow}Instalando dependencias para ${service.name}...${colors.reset}`);
      try {
        const packageJsonPath = path.join(service.path, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
          console.log(`${colors.red}✗ No package.json found in ${service.name}, skipping.${colors.reset}`);
          continue;
        }
        
        console.log(`Executing 'npm install' in ${service.path}`);
        
        execSync('npm install', {
          cwd: service.path,
          stdio: 'inherit'
        });
        
        console.log(`${colors.green}✓ Dependencies installed correctly for ${service.name}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error installing dependencies for ${service.name}: ${error.message}${colors.reset}`);
      }
    }

    console.log(`\n${colors.bright}${colors.green}Installation complete!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error during installation: ${error.message}${colors.reset}`);
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
installServices(); 