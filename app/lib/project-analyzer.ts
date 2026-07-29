// Project Analyzer - Understand any codebase structure and dependencies
// Detects languages, frameworks, databases, and build tools

import { detectLanguage, detectFrameworkFromPackageJson } from './language-detector'

export interface ProjectAnalysis {
  languages: string[]
  frameworks: string[]
  databases: string[]
  buildTools: string[]
  packageManagers: string[]
  entryPoints: string[]
  configFiles: string[]
  structure: ProjectStructure | null
  dependencies: Record<string, string[]>
  devDependencies: Record<string, string[]>
  scripts: Record<string, string>
  environment: EnvironmentInfo
}

export interface ProjectStructure {
  type: 'monorepo' | 'single' | 'microservices' | 'unknown'
  rootDir: string
  srcDirs: string[]
  testDirs: string[]
  publicDirs: string[]
  configDirs: string[]
}

export interface EnvironmentInfo {
  nodeVersion?: string
  pythonVersion?: string
  goVersion?: string
  rustVersion?: string
  javaVersion?: string
  runtime: string[]
}

/**
 * Analyze project structure and dependencies
 */
export async function analyzeProject(rootPath: string = '.'): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    languages: [],
    frameworks: [],
    databases: [],
    buildTools: [],
    packageManagers: [],
    entryPoints: [],
    configFiles: [],
    structure: null,
    dependencies: {},
    devDependencies: {},
    scripts: {},
    environment: { runtime: [] }
  }
  
  try {
    // Check for config files and analyze
    await analyzeConfigFiles(analysis, rootPath)
    
    // Detect languages from file extensions
    await detectLanguagesFromFiles(analysis, rootPath)
    
    // Analyze project structure
    analysis.structure = await analyzeStructure(rootPath)
    
    // Detect databases from dependencies and config
    await detectDatabases(analysis)
    
    // Detect environment
    await detectEnvironment(analysis)
    
  } catch (error) {
    console.error('Project analysis error:', error)
  }
  
  return analysis
}

/**
 * Analyze configuration files
 */
async function analyzeConfigFiles(analysis: ProjectAnalysis, rootPath: string) {
  // Node.js / JavaScript / TypeScript
  if (await fileExists(`${rootPath}/package.json`)) {
    analysis.configFiles.push('package.json')
    analysis.packageManagers.push('npm')
    analysis.languages.push('JavaScript')
    
    try {
      const pkg = await readJSONFile(`${rootPath}/package.json`)
      
      // Detect frameworks
      if (pkg.dependencies) {
        const frameworks = detectFrameworkFromPackageJson(pkg.dependencies)
        analysis.frameworks.push(...frameworks)
        analysis.dependencies['npm'] = Object.keys(pkg.dependencies)
      }
      
      if (pkg.devDependencies) {
        analysis.devDependencies['npm'] = Object.keys(pkg.devDependencies)
      }
      
      if (pkg.scripts) {
        analysis.scripts = pkg.scripts
      }
      
      // Detect build tools
      if (pkg.devDependencies?.webpack) analysis.buildTools.push('Webpack')
      if (pkg.devDependencies?.vite) analysis.buildTools.push('Vite')
      if (pkg.devDependencies?.rollup) analysis.buildTools.push('Rollup')
      if (pkg.devDependencies?.esbuild) analysis.buildTools.push('esbuild')
      if (pkg.devDependencies?.turbopack) analysis.buildTools.push('Turbopack')
      
      // Detect TypeScript
      if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
        analysis.languages.push('TypeScript')
      }
    } catch (e) {
      console.error('Error parsing package.json:', e)
    }
  }
  
  if (await fileExists(`${rootPath}/tsconfig.json`)) {
    analysis.configFiles.push('tsconfig.json')
    if (!analysis.languages.includes('TypeScript')) {
      analysis.languages.push('TypeScript')
    }
  }
  
  // Python
  if (await fileExists(`${rootPath}/requirements.txt`)) {
    analysis.configFiles.push('requirements.txt')
    analysis.packageManagers.push('pip')
    analysis.languages.push('Python')
    
    try {
      const deps = await readFile(`${rootPath}/requirements.txt`)
      const lines = deps.split('\n').filter(l => l.trim() && !l.startsWith('#'))
      analysis.dependencies['pip'] = lines
      
      // Detect Python frameworks
      if (lines.some(l => l.includes('django'))) analysis.frameworks.push('Django')
      if (lines.some(l => l.includes('flask'))) analysis.frameworks.push('Flask')
      if (lines.some(l => l.includes('fastapi'))) analysis.frameworks.push('FastAPI')
      if (lines.some(l => l.includes('tornado'))) analysis.frameworks.push('Tornado')
      if (lines.some(l => l.includes('pyramid'))) analysis.frameworks.push('Pyramid')
    } catch (e) {
      console.error('Error reading requirements.txt:', e)
    }
  }
  
  if (await fileExists(`${rootPath}/pyproject.toml`)) {
    analysis.configFiles.push('pyproject.toml')
    analysis.packageManagers.push('poetry')
  }
  
  if (await fileExists(`${rootPath}/Pipfile`)) {
    analysis.configFiles.push('Pipfile')
    analysis.packageManagers.push('pipenv')
  }
  
  if (await fileExists(`${rootPath}/setup.py`)) {
    analysis.configFiles.push('setup.py')
    analysis.buildTools.push('setuptools')
  }
  
  // Go
  if (await fileExists(`${rootPath}/go.mod`)) {
    analysis.configFiles.push('go.mod')
    analysis.packageManagers.push('go mod')
    analysis.languages.push('Go')
    
    try {
      const goMod = await readFile(`${rootPath}/go.mod`)
      const deps = goMod.match(/require\s+\(([\s\S]*?)\)/)?.[1]
        ?.split('\n')
        .filter(l => l.trim())
        .map(l => l.trim().split(' ')[0]) || []
      analysis.dependencies['go'] = deps
      
      // Detect Go frameworks
      if (deps.some(d => d.includes('gin'))) analysis.frameworks.push('Gin')
      if (deps.some(d => d.includes('echo'))) analysis.frameworks.push('Echo')
      if (deps.some(d => d.includes('fiber'))) analysis.frameworks.push('Fiber')
    } catch (e) {
      console.error('Error parsing go.mod:', e)
    }
  }
  
  // Rust
  if (await fileExists(`${rootPath}/Cargo.toml`)) {
    analysis.configFiles.push('Cargo.toml')
    analysis.packageManagers.push('cargo')
    analysis.languages.push('Rust')
    analysis.buildTools.push('Cargo')
    
    // Could parse TOML to detect frameworks (actix-web, rocket, etc.)
  }
  
  // Java
  if (await fileExists(`${rootPath}/pom.xml`)) {
    analysis.configFiles.push('pom.xml')
    analysis.packageManagers.push('maven')
    analysis.buildTools.push('Maven')
    analysis.languages.push('Java')
  }
  
  if (await fileExists(`${rootPath}/build.gradle`)) {
    analysis.configFiles.push('build.gradle')
    analysis.packageManagers.push('gradle')
    analysis.buildTools.push('Gradle')
    analysis.languages.push('Java')
  }
  
  // Ruby
  if (await fileExists(`${rootPath}/Gemfile`)) {
    analysis.configFiles.push('Gemfile')
    analysis.packageManagers.push('bundler')
    analysis.languages.push('Ruby')
    
    try {
      const gemfile = await readFile(`${rootPath}/Gemfile`)
      if (gemfile.includes('rails')) analysis.frameworks.push('Ruby on Rails')
      if (gemfile.includes('sinatra')) analysis.frameworks.push('Sinatra')
    } catch (e) {
      console.error('Error reading Gemfile:', e)
    }
  }
  
  // PHP
  if (await fileExists(`${rootPath}/composer.json`)) {
    analysis.configFiles.push('composer.json')
    analysis.packageManagers.push('composer')
    analysis.languages.push('PHP')
    
    try {
      const composer = await readJSONFile(`${rootPath}/composer.json`)
      if (composer.require) {
        analysis.dependencies['composer'] = Object.keys(composer.require)
        
        // Detect PHP frameworks
        if (composer.require['laravel/framework']) analysis.frameworks.push('Laravel')
        if (composer.require['symfony/symfony']) analysis.frameworks.push('Symfony')
        if (composer.require['codeigniter/framework']) analysis.frameworks.push('CodeIgniter')
      }
    } catch (e) {
      console.error('Error parsing composer.json:', e)
    }
  }
  
  // .NET / C#
  if (await fileExists(`${rootPath}/*.csproj`)) {
    analysis.configFiles.push('*.csproj')
    analysis.packageManagers.push('dotnet')
    analysis.languages.push('C#')
  }
  
  // Swift
  if (await fileExists(`${rootPath}/Package.swift`)) {
    analysis.configFiles.push('Package.swift')
    analysis.packageManagers.push('swift package')
    analysis.languages.push('Swift')
  }
  
  // Dart/Flutter
  if (await fileExists(`${rootPath}/pubspec.yaml`)) {
    analysis.configFiles.push('pubspec.yaml')
    analysis.packageManagers.push('pub')
    analysis.frameworks.push('Flutter')
    analysis.languages.push('Dart')
  }
  
  // Docker
  if (await fileExists(`${rootPath}/Dockerfile`)) {
    analysis.configFiles.push('Dockerfile')
    analysis.buildTools.push('Docker')
  }
  
  if (await fileExists(`${rootPath}/docker-compose.yml`)) {
    analysis.configFiles.push('docker-compose.yml')
    analysis.buildTools.push('Docker Compose')
  }
  
  // Kubernetes
  if (await fileExists(`${rootPath}/k8s`) || await fileExists(`${rootPath}/kubernetes`)) {
    analysis.buildTools.push('Kubernetes')
  }
  
  // Terraform
  if (await fileExists(`${rootPath}/*.tf`)) {
    analysis.configFiles.push('*.tf')
    analysis.buildTools.push('Terraform')
  }
}

/**
 * Detect languages from file extensions in project
 */
async function detectLanguagesFromFiles(analysis: ProjectAnalysis, rootPath: string) {
  // This would scan actual files in the project
  // For now, we rely on config files
  // In a real implementation, you'd scan the directory structure
}

/**
 * Analyze project structure
 */
async function analyzeStructure(rootPath: string): Promise<ProjectStructure> {
  const structure: ProjectStructure = {
    type: 'single',
    rootDir: rootPath,
    srcDirs: [],
    testDirs: [],
    publicDirs: [],
    configDirs: []
  }
  
  // Detect common patterns
  if (await fileExists(`${rootPath}/packages`)) {
    structure.type = 'monorepo'
  }
  
  if (await fileExists(`${rootPath}/services`)) {
    structure.type = 'microservices'
  }
  
  // Common source directories
  const srcPatterns = ['src', 'lib', 'app', 'source']
  for (const pattern of srcPatterns) {
    if (await fileExists(`${rootPath}/${pattern}`)) {
      structure.srcDirs.push(pattern)
    }
  }
  
  // Common test directories
  const testPatterns = ['test', 'tests', '__tests__', 'spec']
  for (const pattern of testPatterns) {
    if (await fileExists(`${rootPath}/${pattern}`)) {
      structure.testDirs.push(pattern)
    }
  }
  
  // Public/static directories
  const publicPatterns = ['public', 'static', 'dist', 'build']
  for (const pattern of publicPatterns) {
    if (await fileExists(`${rootPath}/${pattern}`)) {
      structure.publicDirs.push(pattern)
    }
  }
  
  return structure
}

/**
 * Detect databases from dependencies and config
 */
async function detectDatabases(analysis: ProjectAnalysis) {
  const allDeps = [
    ...(analysis.dependencies['npm'] || []),
    ...(analysis.dependencies['pip'] || []),
    ...(analysis.dependencies['go'] || []),
    ...(analysis.dependencies['composer'] || [])
  ]
  
  const dbMap: Record<string, string> = {
    'pg': 'PostgreSQL',
    'postgres': 'PostgreSQL',
    'psycopg2': 'PostgreSQL',
    'mysql': 'MySQL',
    'mysql2': 'MySQL',
    'mariadb': 'MariaDB',
    'mongodb': 'MongoDB',
    'mongoose': 'MongoDB',
    'redis': 'Redis',
    'ioredis': 'Redis',
    'cassandra-driver': 'Cassandra',
    'neo4j-driver': 'Neo4j',
    'sqlite': 'SQLite',
    'sqlite3': 'SQLite',
    'prisma': 'Prisma ORM',
    'typeorm': 'TypeORM',
    'sequelize': 'Sequelize',
    'drizzle-orm': 'Drizzle ORM',
    'sqlalchemy': 'SQLAlchemy',
    'django.db': 'Django ORM'
  }
  
  for (const dep of allDeps) {
    for (const [key, db] of Object.entries(dbMap)) {
      if (dep.toLowerCase().includes(key)) {
        if (!analysis.databases.includes(db)) {
          analysis.databases.push(db)
        }
      }
    }
  }
}

/**
 * Detect environment and runtime versions
 */
async function detectEnvironment(analysis: ProjectAnalysis) {
  // This would execute version commands
  // For now, we just note which runtimes are likely needed
  
  if (analysis.languages.includes('JavaScript') || analysis.languages.includes('TypeScript')) {
    analysis.environment.runtime.push('Node.js')
  }
  
  if (analysis.languages.includes('Python')) {
    analysis.environment.runtime.push('Python')
  }
  
  if (analysis.languages.includes('Go')) {
    analysis.environment.runtime.push('Go')
  }
  
  if (analysis.languages.includes('Rust')) {
    analysis.environment.runtime.push('Rust')
  }
  
  if (analysis.languages.includes('Java')) {
    analysis.environment.runtime.push('JVM')
  }
  
  if (analysis.languages.includes('Ruby')) {
    analysis.environment.runtime.push('Ruby')
  }
  
  if (analysis.languages.includes('PHP')) {
    analysis.environment.runtime.push('PHP')
  }
}

/**
 * Helper: Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  // In a real implementation, this would use fs.access or similar
  // For now, return false as placeholder
  return false
}

/**
 * Helper: Read file
 */
async function readFile(path: string): Promise<string> {
  // In a real implementation, this would use fs.readFile
  return ''
}

/**
 * Helper: Read JSON file
 */
async function readJSONFile(path: string): Promise<any> {
  const content = await readFile(path)
  return JSON.parse(content)
}

/**
 * Get recommended next steps based on project analysis
 */
export function getRecommendedActions(analysis: ProjectAnalysis): string[] {
  const actions: string[] = []
  
  // Package installation
  if (analysis.packageManagers.length > 0) {
    const pm = analysis.packageManagers[0]
    if (pm === 'npm') actions.push('npm install')
    if (pm === 'pip') actions.push('pip install -r requirements.txt')
    if (pm === 'go mod') actions.push('go mod download')
    if (pm === 'cargo') actions.push('cargo fetch')
  }
  
  // Build steps
  if (analysis.buildTools.length > 0) {
    if (analysis.buildTools.includes('Webpack')) actions.push('npm run build')
    if (analysis.buildTools.includes('Cargo')) actions.push('cargo build')
    if (analysis.buildTools.includes('Maven')) actions.push('mvn package')
  }
  
  // Testing
  if (analysis.scripts['test']) {
    actions.push('npm test')
  }
  
  // Development server
  if (analysis.scripts['dev'] || analysis.scripts['start']) {
    actions.push(analysis.scripts['dev'] ? 'npm run dev' : 'npm start')
  }
  
  return actions
}

