#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
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
console.log(`${colors.bright}${colors.blue}   ACADEMY Framework - Start Services${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Procesos en ejecución
const runningProcesses = [];

// Función principal
async function startServices() {
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
      .map(dirent => {
        const servicePath = path.join(servicesDir, dirent.name);
        const packageJsonPath = path.join(servicePath, 'package.json');
        
        // Verificar si existe package.json
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return {
              name: dirent.name,
              path: servicePath,
              scripts: packageJson.scripts || {},
              description: packageJson.description || `Service ${dirent.name}`
            };
          } catch (error) {
            return {
              name: dirent.name,
              path: servicePath,
              scripts: {},
              description: `Service ${dirent.name} (error in package.json)`
            };
          }
        } else {
          return {
            name: dirent.name,
            path: servicePath,
            scripts: {},
            description: `Service ${dirent.name} (no package.json)`
          };
        }
      });

    if (availableServices.length === 0) {
      console.log(`${colors.yellow}No services found. Create services in the 'services/' directory.${colors.reset}`);
      rl.close();
      return;
    }

    // Verificar si se debe levantar la base de datos
    const startDb = await askQuestion('¿Desea iniciar la base de datos? (s/n): ');
    
    if (startDb.toLowerCase() === 's' || startDb.toLowerCase() === 'y') {
      console.log(`${colors.yellow}Starting the database...${colors.reset}`);
      try {
        execSync('npm run db:up', { stdio: 'inherit' });
        console.log(`${colors.green}✓ Database started successfully${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error starting the database: ${error.message}${colors.reset}`);
      }
    }

    // Mostrar servicios disponibles
    console.log(`\n${colors.yellow}Available services:${colors.reset}`);
    availableServices.forEach((service, index) => {
      console.log(`${index + 1}. ${colors.bright}${service.name}${colors.reset} - ${service.description}`);
      
      // Mostrar scripts disponibles
      const availableScripts = Object.keys(service.scripts).filter(script => 
        !script.includes('test') && !script.includes('lint') && 
        !script.includes('build') && !script.includes('install')
      );
      
      if (availableScripts.length > 0) {
        console.log(`   ${colors.green}✓${colors.reset} Available scripts: ${availableScripts.join(', ')}`);
      } else {
        console.log(`   ${colors.red}✗${colors.reset} No scripts found to run`);
      }
    });

    // Seleccionar servicios a iniciar
    const selection = await askQuestion('\nSelect services to start (numbers separated by comma, or "all"): ');
    
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

    // Para cada servicio seleccionado, preguntar qué script ejecutar
    for (const service of selectedServices) {
      const availableScripts = Object.keys(service.scripts).filter(script => 
        !script.includes('test') && !script.includes('lint') && 
        !script.includes('build') && !script.includes('install')
      );
      
      if (availableScripts.length === 0) {
        console.log(`${colors.red}✗ The service ${service.name} has no executable scripts.${colors.reset}`);
        continue;
      }
      
      // Si solo hay un script disponible, usarlo directamente
      let scriptToRun = availableScripts.length === 1 ? availableScripts[0] : null;
      
      // Si hay varios scripts, preguntar cuál usar
      if (!scriptToRun) {
        console.log(`\n${colors.yellow}Available scripts for ${service.name}:${colors.reset}`);
        availableScripts.forEach((script, index) => {
          console.log(`${index + 1}. ${script}: ${service.scripts[script]}`);
        });
        
        const scriptSelection = await askQuestion(`Seleccione un script para ${service.name} (1-${availableScripts.length}): `);
        const scriptIndex = parseInt(scriptSelection) - 1;
        
        if (isNaN(scriptIndex) || scriptIndex < 0 || scriptIndex >= availableScripts.length) {
          console.log(`${colors.red}✗ Invalid script selection for ${service.name}.${colors.reset}`);
          continue;
        }
        
        scriptToRun = availableScripts[scriptIndex];
      }
      
      // Ejecutar el script seleccionado
      console.log(`\n${colors.yellow}Starting ${service.name} with script '${scriptToRun}'...${colors.reset}`);
      
      // Usar spawn para iniciar el proceso en segundo plano
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      const proc = spawn(npmCmd, ['run', scriptToRun], {
        cwd: service.path,
        stdio: 'pipe',
        shell: true
      });
      
      // Manejar salida
      proc.stdout.on('data', (data) => {
        console.log(`${colors.cyan}[${service.name}]${colors.reset} ${data.toString().trim()}`);
      });
      
      proc.stderr.on('data', (data) => {
        console.error(`${colors.red}[${service.name}]${colors.reset} ${data.toString().trim()}`);
      });
      
      proc.on('close', (code) => {
        console.log(`${colors.yellow}[${service.name}] Process ended with code ${code}${colors.reset}`);
        
        // Remover de la lista de procesos en ejecución
        const index = runningProcesses.findIndex(p => p.service === service.name);
        if (index !== -1) {
          runningProcesses.splice(index, 1);
        }
      });
      
      // Guardar referencia al proceso
      runningProcesses.push({
        service: service.name,
        process: proc
      });
      
      console.log(`${colors.green}✓ Service ${service.name} started with '${scriptToRun}'${colors.reset}`);
    }

    if (runningProcesses.length === 0) {
      console.log(`${colors.yellow}No services started.${colors.reset}`);
      rl.close();
      return;
    }

    console.log(`\n${colors.bright}${colors.green}Services started successfully.${colors.reset}`);
    console.log(`${colors.yellow}Press Ctrl+C to stop all services.${colors.reset}`);
    
    // Manejar interrupción
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}Stopping all services...${colors.reset}`);
      
      // Terminar todos los procesos
      runningProcesses.forEach(({ service, process }) => {
        process.kill();
        console.log(`${colors.green}✓ Service ${service} stopped${colors.reset}`);
      });
      
      console.log(`${colors.bright}${colors.green}All services stopped!${colors.reset}`);
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`${colors.red}Error starting services: ${error.message}${colors.reset}`);
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

// No cerrar readline hasta que los servicios estén en ejecución
process.on('exit', () => {
  rl.close();
});

// Ejecutar función principal
startServices(); 