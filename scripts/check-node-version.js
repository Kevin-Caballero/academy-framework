#!/usr/bin/env node

/**
 * Script para verificar que se está usando la versión correcta de Node.js
 * y proporcionar instrucciones para instalar/cambiar si es necesario.
 */

const requiredVersion = '20.11.1';
const requiredMajor = 20;
const currentVersion = process.versions.node;
const currentMajor = parseInt(currentVersion.split('.')[0], 10);

const nodeVersionInfo = `
Versión actual de Node.js: ${currentVersion}
Versión requerida: ${requiredVersion} (o cualquier versión 20.x o superior)
`;

// Comprobar si la versión actual cumple los requisitos
if (currentMajor >= requiredMajor) {
  console.log('\x1b[32m%s\x1b[0m', '✅ VERSIÓN DE NODE.JS COMPATIBLE');
  console.log(nodeVersionInfo);
  console.log('\x1b[32m%s\x1b[0m', 'Tu versión de Node.js es compatible con este proyecto.');
  process.exit(0);
} else {
  console.log('\x1b[31m%s\x1b[0m', '❌ VERSIÓN DE NODE.JS INCOMPATIBLE');
  console.log(nodeVersionInfo);
  console.log('\x1b[31m%s\x1b[0m', `Tu versión de Node.js (${currentVersion}) es incompatible con este proyecto.`);
  console.log('\nPor favor, actualiza a Node.js 20.x o superior usando uno de los siguientes métodos:\n');
  
  // Instrucciones para Volta
  console.log('\x1b[33m%s\x1b[0m', 'Usando Volta (herramienta oficial, funciona en Windows/Mac/Linux):');
  console.log('   $ curl https://get.volta.sh | bash  # O seguir las instrucciones en https://volta.sh');
  console.log('   $ volta install node@20.11.1');
  console.log('   $ cd ' + process.cwd() + '  # Volver al directorio del proyecto, Volta usará la versión correcta automáticamente');
  
  console.log('\n\x1b[33m%s\x1b[0m', 'Instalación directa de Node.js:');
  console.log('   Descarga e instala desde https://nodejs.org/dist/v20.11.1/');
  
  console.log('\n\x1b[33m%s\x1b[0m', 'Para verificar después de la instalación:');
  console.log('   $ node -v  # Debería mostrar v20.x.x');
  
  // Salir con código de error, excepto si la variable de entorno NODE_VERSION_CHECK es 'warn'
  const skipCheck = process.env.NODE_VERSION_CHECK === 'warn';
  process.exit(skipCheck ? 0 : 1);
} 