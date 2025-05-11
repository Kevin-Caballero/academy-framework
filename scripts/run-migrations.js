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
console.log(`${colors.bright}${colors.blue}   ACADEMY Framework - Run Migrations${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Función principal
async function runMigrations() {
  try {
    // Detectar servicios disponibles
    const servicesDir = path.join(process.cwd(), 'services');
    if (!fs.existsSync(servicesDir)) {
      console.error(`${colors.red}✗ Directorio de servicios no encontrado${colors.reset}`);
      process.exit(1);
    }

    // Buscar el servicio de backend
    const backendServices = fs.readdirSync(servicesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const servicePath = path.join(servicesDir, dirent.name);
        const packageJsonPath = path.join(servicePath, 'package.json');
        
        // Verificar si existe package.json y tiene scripts de migración
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const hasMigrationScript = packageJson.scripts && 
                                      (packageJson.scripts.migrate || 
                                       packageJson.scripts['db:migrate'] || 
                                       packageJson.scripts['migration:run'] ||
                                       packageJson.scripts['db:migration:run']);
            
            // Buscar en los scripts cualquier referencia a migraciones
            const migrationScripts = packageJson.scripts ? 
              Object.keys(packageJson.scripts)
                .filter(script => 
                  script.includes('migrate') || 
                  script.includes('migration') || 
                  (script.includes('db') && script.includes('up'))
                )
              : [];
            
            return {
              name: dirent.name,
              path: servicePath,
              hasMigrationScript: !!hasMigrationScript || migrationScripts.length > 0,
              migrationScripts
            };
          } catch (error) {
            return {
              name: dirent.name,
              path: servicePath,
              hasMigrationScript: false,
              migrationScripts: []
            };
          }
        } else {
          return {
            name: dirent.name,
            path: servicePath,
            hasMigrationScript: false,
            migrationScripts: []
          };
        }
      })
      .filter(service => service.hasMigrationScript); // Solo servicios con script de migración

    if (backendServices.length === 0) {
      console.log(`${colors.yellow}No se encontraron servicios con scripts de migración. Asegúrese de que el backend tenga scripts de migración configurados.${colors.reset}`);
      
      // Preguntar si quiere continuar sin ejecutar migraciones
      const continueWithoutMigrations = await askQuestion('¿Desea continuar sin ejecutar migraciones? (s/n): ');
      
      if (continueWithoutMigrations.toLowerCase() !== 's' && continueWithoutMigrations.toLowerCase() !== 'y') {
        console.log(`${colors.yellow}Operación cancelada.${colors.reset}`);
        rl.close();
        return;
      }
      
      console.log(`${colors.yellow}Continuando sin ejecutar migraciones...${colors.reset}`);
      rl.close();
      return;
    }

    // Mostrar servicios disponibles con migraciones
    console.log(`${colors.yellow}Servicios con scripts de migración disponibles:${colors.reset}`);
    backendServices.forEach((service, index) => {
      console.log(`${index + 1}. ${colors.bright}${service.name}${colors.reset}`);
      if (service.migrationScripts.length > 0) {
        console.log(`   ${colors.green}✓${colors.reset} Scripts disponibles: ${service.migrationScripts.join(', ')}`);
      }
    });

    // Seleccionar servicio para ejecutar migraciones
    const selection = await askQuestion('\nSeleccione el servicio para ejecutar migraciones (número): ');
    
    const selectedIndex = parseInt(selection) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= backendServices.length) {
      console.log(`${colors.yellow}Selección inválida.${colors.reset}`);
      rl.close();
      return;
    }
    
    const selectedService = backendServices[selectedIndex];
    
    // Seleccionar script de migración si hay varios
    let scriptToRun = 'migrate'; // Script por defecto
    
    if (selectedService.migrationScripts.length > 1) {
      console.log(`\n${colors.yellow}Scripts de migración disponibles para ${selectedService.name}:${colors.reset}`);
      selectedService.migrationScripts.forEach((script, index) => {
        console.log(`${index + 1}. ${script}: ${selectedService.scripts?.[script] || '(script no encontrado)'}`);
      });
      
      const scriptSelection = await askQuestion(`\nSeleccione un script para ${selectedService.name} (1-${selectedService.migrationScripts.length}): `);
      const scriptIndex = parseInt(scriptSelection) - 1;
      
      if (!isNaN(scriptIndex) && scriptIndex >= 0 && scriptIndex < selectedService.migrationScripts.length) {
        scriptToRun = selectedService.migrationScripts[scriptIndex];
      }
    } else if (selectedService.migrationScripts.length === 1) {
      scriptToRun = selectedService.migrationScripts[0];
    }
    
    // Verificar si la base de datos está en ejecución
    console.log(`\n${colors.yellow}Verificando si la base de datos está en ejecución...${colors.reset}`);
    
    try {
      execSync('docker ps | grep framework-mariadb', { stdio: 'pipe' });
      console.log(`${colors.green}✓ Base de datos en ejecución.${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}La base de datos no parece estar en ejecución. Intentando iniciarla...${colors.reset}`);
      
      try {
        execSync('npm run db:up', { stdio: 'inherit' });
        console.log(`${colors.green}✓ Base de datos iniciada correctamente.${colors.reset}`);
        
        // Esperar un momento para que la base de datos esté lista
        console.log(`${colors.yellow}Esperando a que la base de datos esté lista...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (dbError) {
        console.error(`${colors.red}✗ Error al iniciar la base de datos: ${dbError.message}${colors.reset}`);
        console.log(`${colors.yellow}Intentando ejecutar migraciones de todos modos...${colors.reset}`);
      }
    }
    
    // Ejecutar migraciones
    console.log(`\n${colors.yellow}Ejecutando migraciones con '${scriptToRun}' en ${selectedService.name}...${colors.reset}`);
    
    try {
      execSync(`npm run ${scriptToRun}`, {
        cwd: selectedService.path,
        stdio: 'inherit'
      });
      
      console.log(`${colors.green}✓ Migraciones ejecutadas correctamente para ${selectedService.name}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error al ejecutar migraciones: ${error.message}${colors.reset}`);
    }

    console.log(`\n${colors.bright}${colors.green}¡Proceso de migración completado!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error durante el proceso de migración: ${error.message}${colors.reset}`);
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

// Ejecutar automáticamente si se llama con --auto
if (process.argv.includes('--auto')) {
  // Ejecutar migraciones para el primer servicio encontrado, con el primer script disponible
  const servicesDir = path.join(process.cwd(), 'services');
  
  if (fs.existsSync(servicesDir)) {
    const backendServices = fs.readdirSync(servicesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const servicePath = path.join(servicesDir, dirent.name);
        const packageJsonPath = path.join(servicePath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const migrationScripts = packageJson.scripts ? 
              Object.keys(packageJson.scripts)
                .filter(script => 
                  script.includes('migrate') || 
                  script.includes('migration') || 
                  (script.includes('db') && script.includes('up'))
                )
              : [];
            
            return {
              name: dirent.name,
              path: servicePath,
              hasMigrationScript: migrationScripts.length > 0,
              migrationScripts
            };
          } catch (error) {
            return null;
          }
        }
        return null;
      })
      .filter(service => service !== null && service.hasMigrationScript);
    
    if (backendServices.length > 0) {
      const service = backendServices[0];
      const scriptToRun = service.migrationScripts[0];
      
      console.log(`${colors.yellow}Ejecutando automáticamente migraciones con '${scriptToRun}' en ${service.name}...${colors.reset}`);
      
      try {
        execSync(`npm run ${scriptToRun}`, {
          cwd: service.path,
          stdio: 'inherit'
        });
        
        console.log(`${colors.green}✓ Migraciones ejecutadas correctamente para ${service.name}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error al ejecutar migraciones: ${error.message}${colors.reset}`);
      }
      
      process.exit(0);
    } else {
      console.log(`${colors.yellow}No se encontraron servicios con scripts de migración para ejecución automática.${colors.reset}`);
      process.exit(0);
    }
  } else {
    console.error(`${colors.red}✗ Directorio de servicios no encontrado${colors.reset}`);
    process.exit(1);
  }
} else {
  // Ejecutar modo interactivo normal
  runMigrations();
} 