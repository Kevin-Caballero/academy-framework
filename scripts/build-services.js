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
console.log(`${colors.bright}${colors.blue}   ACADEMY Framework - Build Services${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Función principal
async function buildServices() {
  try {
    // Detectar servicios disponibles
    const servicesDir = path.join(process.cwd(), 'services');
    if (!fs.existsSync(servicesDir)) {
      console.error(`${colors.red}✗ Services directory not found${colors.reset}`);
      process.exit(1);
    }

    // Obtener lista de servicios disponibles con sus scripts
    const availableServices = fs.readdirSync(servicesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const servicePath = path.join(servicesDir, dirent.name);
        const packageJsonPath = path.join(servicePath, 'package.json');
        
        // Verificar si existe package.json y tiene script build
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const hasBuildScript = packageJson.scripts && 
                                   (packageJson.scripts.build || 
                                    packageJson.scripts['build:prod'] || 
                                    packageJson.scripts.prod);
            
            return {
              name: dirent.name,
              path: servicePath,
              hasBuildScript: !!hasBuildScript,
              buildScripts: packageJson.scripts ? 
                Object.keys(packageJson.scripts)
                  .filter(script => script.includes('build') || script.includes('prod'))
                : []
            };
          } catch (error) {
            return {
              name: dirent.name,
              path: servicePath,
              hasBuildScript: false,
              buildScripts: []
            };
          }
        } else {
          return {
            name: dirent.name,
            path: servicePath,
            hasBuildScript: false,
            buildScripts: []
          };
        }
      })
      .filter(service => service.hasBuildScript); // Solo mostrar servicios que tienen script de build

    if (availableServices.length === 0) {
      console.log(`${colors.yellow}No services with build scripts found. Ensure that services have 'build' scripts configured.${colors.reset}`);
      rl.close();
      return;
    }

    // Mostrar servicios disponibles
    console.log(`${colors.yellow}Services available to build:${colors.reset}`);
    availableServices.forEach((service, index) => {
      console.log(`${index + 1}. ${colors.bright}${service.name}${colors.reset}`);
      if (service.buildScripts.length > 0) {
        console.log(`   ${colors.green}✓${colors.reset} Scripts available: ${service.buildScripts.join(', ')}`);
      }
    });

    // Seleccionar servicios a construir
    const selection = await askQuestion('\nSelect services to build (numbers separated by comma, or "all"): ');
    
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

    console.log(`\n${colors.yellow}Building the following services:${colors.reset}`);
    selectedServices.forEach(service => {
      console.log(`- ${colors.bright}${service.name}${colors.reset}`);
    });

    // Construir servicios seleccionados
    for (const service of selectedServices) {
      // Si hay varios scripts de build, preguntar cuál usar
      let scriptToRun = 'build'; // Por defecto
      
      if (service.buildScripts.length > 1) {
        console.log(`\n${colors.yellow}Build scripts available for ${service.name}:${colors.reset}`);
        service.buildScripts.forEach((script, index) => {
          console.log(`${index + 1}. ${script}`);
        });
        
        const scriptSelection = await askQuestion(`\nSelect a script for ${service.name} (1-${service.buildScripts.length}): `);
        const scriptIndex = parseInt(scriptSelection) - 1;
        
        if (!isNaN(scriptIndex) && scriptIndex >= 0 && scriptIndex < service.buildScripts.length) {
          scriptToRun = service.buildScripts[scriptIndex];
        }
      } else if (service.buildScripts.length === 1) {
        scriptToRun = service.buildScripts[0];
      }
      
      console.log(`\n${colors.yellow}Building ${service.name} with '${scriptToRun}'...${colors.reset}`);
      
      try {
        execSync(`npm run ${scriptToRun}`, {
          cwd: service.path,
          stdio: 'inherit'
        });
        
        console.log(`${colors.green}✓ Build completed for ${service.name}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error building ${service.name}: ${error.message}${colors.reset}`);
      }
    }

    console.log(`\n${colors.bright}${colors.green}Build completed!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error during build: ${error.message}${colors.reset}`);
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
buildServices(); 