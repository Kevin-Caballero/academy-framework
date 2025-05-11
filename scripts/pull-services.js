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
console.log(`${colors.bright}${colors.blue}   Academy Framework - Pull Services${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Función principal
async function pullServices() {
  try {
    // Verificar si estamos en un repositorio Git
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch (error) {
      console.error(`${colors.red}✗ No estás dentro de un repositorio Git. Inicializa primero el repositorio.${colors.reset}`);
      process.exit(1);
    }

    // Leer el package.json para obtener la información de los servicios
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.error(`${colors.red}✗ No se encontró el archivo package.json${colors.reset}`);
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Verificar si hay servicios configurados en el package.json
    if (!packageJson.services || Object.keys(packageJson.services).length === 0) {
      console.log(`${colors.yellow}No hay servicios configurados en el package.json.${colors.reset}`);
      console.log(`${colors.yellow}Comprobando archivo .gitmodules...${colors.reset}`);
      
      // Verificar si hay submódulos en .gitmodules
      const gitmodulesPath = path.join(process.cwd(), '.gitmodules');
      if (fs.existsSync(gitmodulesPath)) {
        console.log(`${colors.green}✓ Se encontró el archivo .gitmodules. Actualizando submódulos...${colors.reset}`);
        try {
          console.log(`${colors.yellow}Ejecutando: git submodule update --init --recursive${colors.reset}`);
          execSync('git submodule update --init --recursive', { stdio: 'inherit' });
          console.log(`${colors.green}✓ Submódulos actualizados correctamente${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}✗ Error al actualizar submódulos: ${error.message}${colors.reset}`);
        }
        rl.close();
        return;
      } else {
        console.log(`${colors.yellow}No se encontró el archivo .gitmodules.${colors.reset}`);
        
        // Preguntar si desea continuar
        const continuar = await askQuestion('¿Desea continuar y configurar los servicios? (s/n): ');
        if (continuar.toLowerCase() !== 's') {
          console.log(`${colors.yellow}Operación cancelada.${colors.reset}`);
          rl.close();
          return;
        }
      }
    }

    // Crear directorio services si no existe
    const servicesDir = path.join(process.cwd(), 'services');
    if (!fs.existsSync(servicesDir)) {
      fs.mkdirSync(servicesDir, { recursive: true });
      console.log(`${colors.green}✓ Se creó el directorio services${colors.reset}`);
    }

    // Lista de servicios disponibles
    const services = packageJson.services || {};
    const serviceNames = Object.keys(services);
    
    if (serviceNames.length === 0) {
      console.log(`${colors.yellow}No hay servicios configurados en el package.json para clonar.${colors.reset}`);
      rl.close();
      return;
    }

    console.log(`${colors.yellow}Servicios disponibles:${colors.reset}`);
    serviceNames.forEach((name, index) => {
      const service = services[name];
      console.log(`${index + 1}. ${colors.bright}${name}${colors.reset} - ${service.description || 'Sin descripción'}`);
      console.log(`   Repositorio: ${service.repository}`);
      console.log(`   Rama: ${service.branch || 'main'}`);
    });

    // Seleccionar servicios a clonar/actualizar
    const selection = await askQuestion('\nSeleccione los servicios a clonar/actualizar (números separados por coma, o "all" para todos): ');
    
    let selectedServices = [];
    
    if (selection.toLowerCase() === 'todos' || selection.toLowerCase() === 'all') {
      selectedServices = serviceNames;
    } else {
      const selectedIndices = selection.split(',')
        .map(s => s.trim())
        .map(s => parseInt(s) - 1)
        .filter(index => !isNaN(index) && index >= 0 && index < serviceNames.length);
      
      if (selectedIndices.length === 0) {
        console.log(`${colors.yellow}No se seleccionaron servicios válidos.${colors.reset}`);
        rl.close();
        return;
      }
      
      selectedServices = selectedIndices.map(index => serviceNames[index]);
    }

    console.log(`\n${colors.yellow}Clonando/actualizando los siguientes servicios:${colors.reset}`);
    selectedServices.forEach(serviceName => {
      console.log(`- ${colors.bright}${serviceName}${colors.reset}`);
    });

    // Procesar cada servicio seleccionado
    for (const serviceName of selectedServices) {
      const service = services[serviceName];
      const servicePath = path.join(servicesDir, serviceName);
      
      if (fs.existsSync(servicePath) && fs.existsSync(path.join(servicePath, '.git'))) {
        // El servicio ya existe, actualizar
        console.log(`\n${colors.yellow}Actualizando ${serviceName}...${colors.reset}`);
        
        try {
          process.chdir(servicePath);
          
          // Guardar cambios locales si los hay
          try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            if (status.trim()) {
              console.log(`${colors.yellow}Se detectaron cambios locales en ${serviceName}.${colors.reset}`);
              const stash = await askQuestion('¿Desea hacer stash de los cambios locales? (s/n): ');
              
              if (stash.toLowerCase() === 's') {
                console.log(`${colors.yellow}Haciendo stash de los cambios...${colors.reset}`);
                execSync('git stash', { stdio: 'inherit' });
              }
            }
          } catch (error) {
            // Ignorar errores en la detección de cambios
          }
          
          // Verificar la rama actual
          const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
          const targetBranch = service.branch || 'main';
          
          if (currentBranch !== targetBranch) {
            console.log(`${colors.yellow}Cambiando de rama ${currentBranch} a ${targetBranch}...${colors.reset}`);
            try {
              execSync(`git checkout ${targetBranch}`, { stdio: 'inherit' });
            } catch (error) {
              console.log(`${colors.yellow}La rama ${targetBranch} no existe localmente. Creándola...${colors.reset}`);
              execSync(`git checkout -b ${targetBranch} origin/${targetBranch}`, { stdio: 'inherit' });
            }
          }
          
          // Actualizar el repositorio
          console.log(`${colors.yellow}Actualizando repositorio...${colors.reset}`);
          execSync('git pull', { stdio: 'inherit' });
          
          console.log(`${colors.green}✓ ${serviceName} actualizado correctamente${colors.reset}`);
          
          // Volver al directorio principal
          process.chdir(process.cwd());
        } catch (error) {
          console.error(`${colors.red}✗ Error al actualizar ${serviceName}: ${error.message}${colors.reset}`);
          // Asegurarse de volver al directorio principal
          try {
            process.chdir(process.cwd());
          } catch (e) {
            // Ignorar errores al cambiar de directorio
          }
        }
      } else {
        // El servicio no existe, clonar
        console.log(`\n${colors.yellow}Clonando ${serviceName}...${colors.reset}`);
        
        try {
          // Eliminar el directorio si existe pero no es un repositorio Git
          if (fs.existsSync(servicePath)) {
            console.log(`${colors.yellow}El directorio ${serviceName} existe pero no es un repositorio Git. Eliminando...${colors.reset}`);
            fs.rmSync(servicePath, { recursive: true, force: true });
          }
          
          // Clonar el repositorio
          const branch = service.branch || 'main';
          console.log(`${colors.yellow}Clonando desde ${service.repository}, rama ${branch}...${colors.reset}`);
          
          execSync(`git clone -b ${branch} ${service.repository} ${servicePath}`, { stdio: 'inherit' });
          
          console.log(`${colors.green}✓ ${serviceName} clonado correctamente${colors.reset}`);
          
          // Agregar como submódulo si no existe en .gitmodules
          const gitmodulesPath = path.join(process.cwd(), '.gitmodules');
          if (!fs.existsSync(gitmodulesPath) || !fs.readFileSync(gitmodulesPath, 'utf8').includes(`[submodule "services/${serviceName}"]`)) {
            const addAsSubmodule = await askQuestion(`¿Desea agregar ${serviceName} como submódulo Git? (s/n): `);
            
            if (addAsSubmodule.toLowerCase() === 's') {
              console.log(`${colors.yellow}Eliminando directorio clonado para añadirlo como submódulo...${colors.reset}`);
              fs.rmSync(servicePath, { recursive: true, force: true });
              
              console.log(`${colors.yellow}Agregando ${serviceName} como submódulo...${colors.reset}`);
              execSync(`git submodule add -b ${branch} ${service.repository} services/${serviceName}`, { stdio: 'inherit' });
              
              console.log(`${colors.green}✓ ${serviceName} agregado como submódulo correctamente${colors.reset}`);
            }
          }
        } catch (error) {
          console.error(`${colors.red}✗ Error al clonar ${serviceName}: ${error.message}${colors.reset}`);
        }
      }
    }

    console.log(`\n${colors.bright}${colors.green}¡Operación completada!${colors.reset}`);
    console.log(`${colors.yellow}Ejecute 'npm run services:install' para instalar las dependencias de los servicios.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error durante la operación: ${error.message}${colors.reset}`);
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
pullServices();
