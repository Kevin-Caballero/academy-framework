# Framework Modular

Un framework que incluye backend (services), admin, cliente público y base de datos como submódulos de Git.

## Estructura del Proyecto

```
my-framework/
├── services/              # Directorio que contiene todos los servicios como submódulos
│   ├── backend/           # API backend (submódulo Git)
│   ├── admin/             # Panel de administración (submódulo Git)
│   └── client/            # Cliente público (submódulo Git)
├── database/              # Servicios de base de datos con Docker Compose
│   ├── docker-compose.yml # Configuración de contenedores Docker
│   └── init/              # Scripts de inicialización de la base de datos
├── scripts/               # Scripts de utilidad para gestionar el framework
│   ├── init-framework.js  # Script para inicializar el framework
│   ├── add-service.js     # Script para añadir nuevos servicios
│   ├── start-services.js  # Script para iniciar servicios interactivamente
│   ├── install-services.js # Script para instalar dependencias de servicios
│   ├── build-services.js  # Script para construir servicios
│   ├── run-migrations.js  # Script para ejecutar migraciones de base de datos
│   ├── backup-db.js       # Script para hacer backup de la base de datos
│   └── restore-db.js      # Script para restaurar la base de datos
├── backups/               # Directorio para backups de la base de datos
├── .gitmodules            # Configuración de submódulos Git
├── .env                   # Variables de entorno
├── package.json           # Dependencias y scripts
└── README.md              # Documentación
```

## Instalación

1. Clonar el repositorio con todos los submódulos:

```bash
git clone --recurse-submodules https://github.com/tu-usuario/my-framework.git
cd my-framework
```

2. Instalar dependencias del proyecto principal:

```bash
npm install
```

3. Inicializar el framework (crea directorios necesarios, configura submódulos):

```bash
npm run init
```

4. Instalar dependencias de todos los servicios:

```bash
npm run services:install
```

Este comando mostrará un menú interactivo que te permitirá elegir qué servicios instalar.

## Uso

### Iniciar Servicios

El framework proporciona un menú interactivo para iniciar los servicios:

```bash
npm start
```

Este comando:
1. Muestra una lista de todos los servicios disponibles
2. Te permite elegir cuáles quieres iniciar
3. Te permite seleccionar qué script ejecutar para cada servicio
4. Opcionalmente inicia la base de datos

### Construir Servicios

Para construir los servicios de manera interactiva:

```bash
npm run services:build
```

Este comando:
1. Detecta automáticamente todos los servicios que tienen scripts de build
2. Te permite elegir cuáles construir
3. Si un servicio tiene varios scripts de build, te permite elegir cuál usar

### Gestión de Base de datos

Levantar la base de datos (ejecuta migraciones automáticamente):
```bash
npm run db:up
```

Detener la base de datos:
```bash
npm run db:down
```

Ver logs de la base de datos:
```bash
npm run db:logs
```

Reiniciar la base de datos (elimina todos los datos y ejecuta migraciones automáticamente):
```bash
npm run db:reset
```

Ejecutar migraciones manualmente:
```bash
npm run db:migrate
```

Hacer backup de la base de datos:
```bash
npm run db:backup
```

Restaurar la base de datos desde un backup:
```bash
npm run db:restore
```

### Migraciones de Base de Datos

El framework está configurado para ejecutar automáticamente las migraciones de la base de datos cuando:
- Se inicia la base de datos con `npm run db:up`
- Se reinicia la base de datos con `npm run db:reset`

El sistema detectará automáticamente los scripts de migración en los servicios (como el backend) y ejecutará el primer script de migración encontrado.

Para ejecutar migraciones manualmente o elegir qué script ejecutar:
```bash
npm run db:migrate
```

Este comando proporciona una interfaz interactiva para:
1. Detectar servicios con scripts de migración (como el backend)
2. Permitirte seleccionar qué servicio usar para las migraciones
3. Elegir qué script de migración ejecutar si hay varios disponibles

## Añadir un nuevo servicio

Para añadir un nuevo servicio al framework:

```bash
npm run add-service
```

Este comando interactivo le guiará a través del proceso de agregar un nuevo servicio, ya sea como un submódulo Git existente o creando uno nuevo.

## Gestión de Submódulos

Para actualizar todos los submódulos:

```bash
git submodule update --remote
```

Para añadir un nuevo submódulo manualmente:

```bash
git submodule add https://github.com/tu-usuario/nuevo-servicio.git services/nuevo-servicio
```

## Servicios

- **Backend API**: Servicios y lógica de negocio (en `services/backend`)
- **Admin Panel**: Panel de administración (en `services/admin`)
- **Client**: Aplicación pública para clientes (en `services/client`)
- **Database**: Servicios de base de datos con Docker (en `database/`) 