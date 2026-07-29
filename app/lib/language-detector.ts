// Language Detection System - Automatic language and framework identification
// Supports 100+ programming languages and frameworks

export interface LanguageConfig {
  lang: string
  runner: string | null
  package: string
  testCommand?: string
  formatCommand?: string
  lintCommand?: string
  buildCommand?: string
}

export interface FrameworkCommands {
  create?: string
  dev: string
  build?: string
  test?: string
  deps?: string
  lint?: string
  format?: string
}

/**
 * Detect programming language from file extension
 */
export function detectLanguage(filePath: string): LanguageConfig {
  const ext = filePath.split('.').pop()?.toLowerCase()
  
  const languageMap: Record<string, LanguageConfig> = {
    // JavaScript/TypeScript
    'js': { lang: 'JavaScript', runner: 'node', package: 'npm', testCommand: 'npm test', formatCommand: 'prettier', lintCommand: 'eslint' },
    'mjs': { lang: 'JavaScript (ES Module)', runner: 'node', package: 'npm', testCommand: 'npm test' },
    'cjs': { lang: 'JavaScript (CommonJS)', runner: 'node', package: 'npm', testCommand: 'npm test' },
    'ts': { lang: 'TypeScript', runner: 'ts-node', package: 'npm', testCommand: 'npm test', formatCommand: 'prettier', lintCommand: 'eslint' },
    'tsx': { lang: 'React TypeScript', runner: 'ts-node', package: 'npm', testCommand: 'npm test' },
    'jsx': { lang: 'React', runner: 'node', package: 'npm', testCommand: 'npm test' },
    
    // Python
    'py': { lang: 'Python', runner: 'python3', package: 'pip', testCommand: 'pytest', formatCommand: 'black', lintCommand: 'pylint' },
    'pyi': { lang: 'Python Type Stub', runner: null, package: 'pip' },
    'pyw': { lang: 'Python (Windows)', runner: 'python', package: 'pip' },
    'ipynb': { lang: 'Jupyter Notebook', runner: 'jupyter', package: 'pip' },
    
    // Go
    'go': { lang: 'Go', runner: 'go run', package: 'go get', testCommand: 'go test ./...', formatCommand: 'go fmt', lintCommand: 'golangci-lint', buildCommand: 'go build' },
    
    // Rust
    'rs': { lang: 'Rust', runner: 'cargo run', package: 'cargo', testCommand: 'cargo test', formatCommand: 'cargo fmt', lintCommand: 'cargo clippy', buildCommand: 'cargo build' },
    
    // Java
    'java': { lang: 'Java', runner: 'java', package: 'maven', testCommand: 'mvn test', buildCommand: 'mvn package' },
    'class': { lang: 'Java Bytecode', runner: 'java', package: 'maven' },
    'jar': { lang: 'Java Archive', runner: 'java -jar', package: 'maven' },
    
    // C#
    'cs': { lang: 'C#', runner: 'dotnet run', package: 'dotnet', testCommand: 'dotnet test', buildCommand: 'dotnet build' },
    'csproj': { lang: 'C# Project', runner: null, package: 'dotnet' },
    
    // C/C++
    'c': { lang: 'C', runner: 'gcc', package: 'apt', buildCommand: 'gcc -o output', formatCommand: 'clang-format' },
    'h': { lang: 'C/C++ Header', runner: null, package: 'apt' },
    'cpp': { lang: 'C++', runner: 'g++', package: 'apt', buildCommand: 'g++ -o output', formatCommand: 'clang-format' },
    'cc': { lang: 'C++', runner: 'g++', package: 'apt' },
    'cxx': { lang: 'C++', runner: 'g++', package: 'apt' },
    'hpp': { lang: 'C++ Header', runner: null, package: 'apt' },
    
    // Ruby
    'rb': { lang: 'Ruby', runner: 'ruby', package: 'gem', testCommand: 'rspec', formatCommand: 'rubocop -a' },
    'erb': { lang: 'Embedded Ruby', runner: null, package: 'gem' },
    
    // PHP
    'php': { lang: 'PHP', runner: 'php', package: 'composer', testCommand: 'phpunit', formatCommand: 'php-cs-fixer' },
    
    // Mobile
    'dart': { lang: 'Dart/Flutter', runner: 'flutter run', package: 'pub', testCommand: 'flutter test', buildCommand: 'flutter build' },
    'swift': { lang: 'Swift', runner: 'swift', package: 'swift package', testCommand: 'swift test', buildCommand: 'swift build' },
    'kt': { lang: 'Kotlin', runner: 'kotlinc', package: 'gradle', testCommand: 'gradle test', buildCommand: 'gradle build' },
    'kts': { lang: 'Kotlin Script', runner: 'kotlin', package: 'gradle' },
    
    // Scripting
    'sh': { lang: 'Bash', runner: 'bash', package: 'apt', lintCommand: 'shellcheck' },
    'bash': { lang: 'Bash', runner: 'bash', package: 'apt', lintCommand: 'shellcheck' },
    'zsh': { lang: 'Zsh', runner: 'zsh', package: 'apt' },
    'fish': { lang: 'Fish', runner: 'fish', package: 'apt' },
    'ps1': { lang: 'PowerShell', runner: 'pwsh', package: 'choco' },
    'psm1': { lang: 'PowerShell Module', runner: 'pwsh', package: 'choco' },
    
    // Functional Languages
    'hs': { lang: 'Haskell', runner: 'runhaskell', package: 'cabal', buildCommand: 'ghc', testCommand: 'cabal test' },
    'lhs': { lang: 'Literate Haskell', runner: 'runhaskell', package: 'cabal' },
    'ml': { lang: 'OCaml', runner: 'ocaml', package: 'opam', buildCommand: 'ocamlc' },
    'fs': { lang: 'F#', runner: 'dotnet fsi', package: 'dotnet', testCommand: 'dotnet test' },
    'clj': { lang: 'Clojure', runner: 'clojure', package: 'lein', testCommand: 'lein test' },
    'ex': { lang: 'Elixir', runner: 'elixir', package: 'mix', testCommand: 'mix test', buildCommand: 'mix compile' },
    'exs': { lang: 'Elixir Script', runner: 'elixir', package: 'mix' },
    'erl': { lang: 'Erlang', runner: 'escript', package: 'rebar3', testCommand: 'rebar3 ct' },
    
    // Scala
    'scala': { lang: 'Scala', runner: 'scala', package: 'sbt', testCommand: 'sbt test', buildCommand: 'sbt compile' },
    
    // Data Science
    'r': { lang: 'R', runner: 'Rscript', package: 'install.packages' },
    'jl': { lang: 'Julia', runner: 'julia', package: 'Pkg' },
    'm': { lang: 'MATLAB/Objective-C', runner: 'matlab', package: null },
    
    // Web
    'html': { lang: 'HTML', runner: null, package: 'npm', lintCommand: 'htmlhint' },
    'htm': { lang: 'HTML', runner: null, package: 'npm' },
    'css': { lang: 'CSS', runner: null, package: 'npm', lintCommand: 'stylelint' },
    'scss': { lang: 'SCSS', runner: null, package: 'npm', lintCommand: 'stylelint' },
    'sass': { lang: 'Sass', runner: null, package: 'npm' },
    'less': { lang: 'LESS', runner: null, package: 'npm' },
    'vue': { lang: 'Vue', runner: 'npm run dev', package: 'npm', testCommand: 'npm test' },
    'svelte': { lang: 'Svelte', runner: 'npm run dev', package: 'npm', testCommand: 'npm test' },
    
    // Blockchain
    'sol': { lang: 'Solidity', runner: 'hardhat', package: 'npm', testCommand: 'hardhat test', buildCommand: 'hardhat compile' },
    
    // Game Development
    'gd': { lang: 'GDScript', runner: 'godot', package: null },
    'gdshader': { lang: 'Godot Shader', runner: null, package: null },
    
    // Config/Data
    'json': { lang: 'JSON', runner: null, package: null, lintCommand: 'jsonlint' },
    'yaml': { lang: 'YAML', runner: null, package: null, lintCommand: 'yamllint' },
    'yml': { lang: 'YAML', runner: null, package: null, lintCommand: 'yamllint' },
    'toml': { lang: 'TOML', runner: null, package: null },
    'xml': { lang: 'XML', runner: null, package: null, lintCommand: 'xmllint' },
    'ini': { lang: 'INI', runner: null, package: null },
    
    // Database
    'sql': { lang: 'SQL', runner: 'psql', package: null },
    'graphql': { lang: 'GraphQL', runner: null, package: 'npm' },
    'gql': { lang: 'GraphQL', runner: null, package: 'npm' },
    
    // Infrastructure
    'tf': { lang: 'Terraform', runner: 'terraform', package: null, testCommand: 'terraform validate', formatCommand: 'terraform fmt' },
    'hcl': { lang: 'HCL', runner: null, package: null },
    
    // Assembly
    'asm': { lang: 'Assembly', runner: 'nasm', package: 'apt', buildCommand: 'nasm -f elf64' },
    's': { lang: 'Assembly', runner: 'as', package: 'apt' },
    
    // Other Languages
    'lua': { lang: 'Lua', runner: 'lua', package: 'luarocks' },
    'pl': { lang: 'Perl', runner: 'perl', package: 'cpan', testCommand: 'prove' },
    'pm': { lang: 'Perl Module', runner: 'perl', package: 'cpan' },
    'zig': { lang: 'Zig', runner: 'zig run', package: 'zig', testCommand: 'zig test', buildCommand: 'zig build' },
    'nim': { lang: 'Nim', runner: 'nim c -r', package: 'nimble', testCommand: 'nim c -r tests', buildCommand: 'nim c' },
    'd': { lang: 'D', runner: 'dmd -run', package: 'dub', testCommand: 'dub test', buildCommand: 'dub build' },
    
    // Documentation
    'md': { lang: 'Markdown', runner: null, package: null },
    'mdx': { lang: 'MDX', runner: null, package: 'npm' },
    'rst': { lang: 'reStructuredText', runner: null, package: null },
    'tex': { lang: 'LaTeX', runner: 'pdflatex', package: null },
    
    // Docker
    'dockerfile': { lang: 'Dockerfile', runner: 'docker build', package: null, lintCommand: 'hadolint' },
  }
  
  return languageMap[ext || ''] || { lang: 'Unknown', runner: null, package: 'unknown' }
}

/**
 * Get framework-specific commands
 */
export function getFrameworkCommands(framework: string): FrameworkCommands | null {
  const commands: Record<string, FrameworkCommands> = {
    // JavaScript/TypeScript Frameworks
    'React': {
      create: 'npx create-react-app',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      deps: 'npm install',
      lint: 'npm run lint',
      format: 'npm run format'
    },
    'Next.js': {
      create: 'npx create-next-app@latest',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      deps: 'npm install'
    },
    'Vue': {
      create: 'npm create vue@latest',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      deps: 'npm install'
    },
    'Angular': {
      create: 'ng new',
      dev: 'ng serve',
      build: 'ng build',
      test: 'ng test',
      deps: 'npm install'
    },
    'Svelte': {
      create: 'npm create svelte@latest',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      deps: 'npm install'
    },
    
    // Python Frameworks
    'Django': {
      create: 'django-admin startproject',
      dev: 'python manage.py runserver',
      test: 'python manage.py test',
      deps: 'pip install -r requirements.txt'
    },
    'Flask': {
      create: 'mkdir project && cd project',
      dev: 'flask run',
      test: 'pytest',
      deps: 'pip install -r requirements.txt'
    },
    'FastAPI': {
      create: 'mkdir project && cd project',
      dev: 'uvicorn main:app --reload',
      test: 'pytest',
      deps: 'pip install -r requirements.txt'
    },
    
    // Go Frameworks
    'Go': {
      create: 'go mod init',
      dev: 'go run main.go',
      build: 'go build',
      test: 'go test ./...',
      deps: 'go mod download',
      format: 'go fmt ./...',
      lint: 'golangci-lint run'
    },
    
    // Rust
    'Rust': {
      create: 'cargo new',
      dev: 'cargo run',
      build: 'cargo build --release',
      test: 'cargo test',
      deps: 'cargo fetch',
      format: 'cargo fmt',
      lint: 'cargo clippy'
    },
    
    // Ruby
    'Rails': {
      create: 'rails new',
      dev: 'rails server',
      build: 'bundle install',
      test: 'rails test',
      deps: 'bundle install'
    },
    
    // PHP
    'Laravel': {
      create: 'composer create-project laravel/laravel',
      dev: 'php artisan serve',
      test: 'php artisan test',
      deps: 'composer install'
    },
    
    // Mobile
    'Flutter': {
      create: 'flutter create',
      dev: 'flutter run',
      build: 'flutter build apk',
      test: 'flutter test',
      deps: 'flutter pub get'
    },
    'React Native': {
      create: 'npx react-native init',
      dev: 'npm start',
      build: 'npm run build',
      test: 'npm test',
      deps: 'npm install'
    },
    
    // Java
    'Spring Boot': {
      create: 'spring init',
      dev: './mvnw spring-boot:run',
      build: './mvnw package',
      test: './mvnw test',
      deps: './mvnw dependency:resolve'
    },
  }
  
  return commands[framework] || null
}

/**
 * Detect framework from package.json dependencies
 */
export function detectFrameworkFromPackageJson(dependencies: Record<string, string>): string[] {
  const frameworks: string[] = []
  
  const frameworkMap: Record<string, string> = {
    'react': 'React',
    'next': 'Next.js',
    'vue': 'Vue',
    '@angular/core': 'Angular',
    'svelte': 'Svelte',
    'express': 'Express',
    'fastify': 'Fastify',
    'nest js': 'NestJS',
    '@nestjs/core': 'NestJS',
    'koa': 'Koa',
    'gatsby': 'Gatsby',
    'remix': 'Remix',
    'astro': 'Astro',
    'solid-js': 'Solid.js',
    'qwik': 'Qwik',
    'electron': 'Electron',
    '@tauri-apps/api': 'Tauri',
    'react-native': 'React Native',
  }
  
  for (const [dep, framework] of Object.entries(frameworkMap)) {
    if (dependencies[dep]) {
      frameworks.push(framework)
    }
  }
  
  return frameworks
}

/**
 * Get recommended tools for a language
 */
export function getRecommendedTools(language: string): {
  packageManager: string
  linter: string[]
  formatter: string[]
  testFramework: string[]
  buildTool: string[]
} {
  const tools: Record<string, any> = {
    'JavaScript': {
      packageManager: 'npm/yarn/pnpm',
      linter: ['ESLint'],
      formatter: ['Prettier'],
      testFramework: ['Jest', 'Vitest', 'Mocha'],
      buildTool: ['Webpack', 'Vite', 'esbuild']
    },
    'TypeScript': {
      packageManager: 'npm/yarn/pnpm',
      linter: ['ESLint', 'TSLint'],
      formatter: ['Prettier'],
      testFramework: ['Jest', 'Vitest'],
      buildTool: ['tsc', 'Webpack', 'Vite']
    },
    'Python': {
      packageManager: 'pip/poetry/conda',
      linter: ['pylint', 'flake8', 'mypy'],
      formatter: ['Black', 'autopep8'],
      testFramework: ['pytest', 'unittest'],
      buildTool: ['setuptools', 'poetry']
    },
    'Go': {
      packageManager: 'go get/go mod',
      linter: ['golangci-lint', 'staticcheck'],
      formatter: ['go fmt', 'goimports'],
      testFramework: ['go test'],
      buildTool: ['go build']
    },
    'Rust': {
      packageManager: 'cargo',
      linter: ['clippy'],
      formatter: ['rustfmt'],
      testFramework: ['cargo test'],
      buildTool: ['cargo build']
    },
  }
  
  return tools[language] || {
    packageManager: 'unknown',
    linter: [],
    formatter: [],
    testFramework: [],
    buildTool: []
  }
}

