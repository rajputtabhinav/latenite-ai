// Code Generation Templates for All Major Languages and Frameworks
// Production-ready, idiomatic code templates

export interface CodeTemplate {
  language: string
  type: string
  generate: (name: string, options?: any) => string
}

/**
 * React/TypeScript Templates
 */
export const reactTemplates = {
  component: (name: string, props?: string[]) => {
    const propsInterface = props && props.length > 0
      ? `interface ${name}Props {\n  ${props.map(p => `${p}: any`).join('\n  ')}\n}\n\n`
      : ''
    
    const propsParam = props && props.length > 0 ? `{ ${props.join(', ')} }: ${name}Props` : ''
    
    return `${propsInterface}export default function ${name}(${propsParam}) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">${name}</h1>
    </div>
  )
}`
  },
  
  hook: (name: string) => `import { useState, useEffect } from 'react'

export function use${name}() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    // Implementation here
  }, [])
  
  return { data, loading, error }
}`,
  
  context: (name: string) => `import { createContext, useContext, useState, ReactNode } from 'react'

interface ${name}ContextType {
  // Define your context type here
}

const ${name}Context = createContext<${name}ContextType | undefined>(undefined)

export function ${name}Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({})
  
  const value = {
    // Context value here
  }
  
  return (
    <${name}Context.Provider value={value}>
      {children}
    </${name}Context.Provider>
  )
}

export function use${name}() {
  const context = useContext(${name}Context)
  if (context === undefined) {
    throw new Error('use${name} must be used within a ${name}Provider')
  }
  return context
}`,

  apiRoute: (name: string) => `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Implementation here
    return NextResponse.json({ success: true, data: {} })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Implementation here
    return NextResponse.json({ success: true, data: {} })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}`
}

/**
 * Python Templates
 */
export const pythonTemplates = {
  class: (name: string) => `class ${name}:
    """${name} class"""
    
    def __init__(self):
        """Initialize ${name}"""
        pass
    
    def __str__(self) -> str:
        """String representation"""
        return f"${name}()"
    
    def __repr__(self) -> str:
        """Developer representation"""
        return self.__str__()`,
  
  function: (name: string) => `def ${name}(*args, **kwargs):
    """
    ${name} function
    
    Args:
        *args: Variable positional arguments
        **kwargs: Variable keyword arguments
    
    Returns:
        None
    
    Raises:
        ValueError: If invalid arguments provided
    """
    pass`,
  
  flaskRoute: (path: string, method: string = 'GET') => `@app.route('${path}', methods=['${method}'])
def ${path.replace('/', '_').replace('-', '_')}():
    """Handle ${method} request to ${path}"""
    try:
        if request.method == '${method}':
            # Implementation here
            return jsonify({'success': True, 'data': {}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500`,
  
  fastapiRoute: (path: string) => `@app.get("${path}")
async def ${path.replace('/', '_').replace('-', '_')}():
    """
    Handle GET request to ${path}
    
    Returns:
        dict: Response data
    """
    try:
        # Implementation here
        return {"success": True, "data": {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`,
  
  djangoModel: (name: string) => `from django.db import models

class ${name}(models.Model):
    """${name} model"""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "${name}"
        verbose_name_plural = "${name}s"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"${name}({self.id})"`
}

/**
 * Go Templates
 */
export const goTemplates = {
  struct: (name: string) => `type ${name} struct {
\t// Add fields here
}

// New${name} creates a new ${name} instance
func New${name}() *${name} {
\treturn &${name}{}
}`,
  
  interface: (name: string) => `type ${name} interface {
\t// Add methods here
}`,
  
  handler: (name: string) => `func ${name}Handler(w http.ResponseWriter, r *http.Request) {
\tw.Header().Set("Content-Type", "application/json")
\t
\tswitch r.Method {
\tcase http.MethodGet:
\t\t// Handle GET
\t\tjson.NewEncoder(w).Encode(map[string]interface{}{
\t\t\t"success": true,
\t\t\t"data":    map[string]interface{}{},
\t\t})
\t\t
\tcase http.MethodPost:
\t\t// Handle POST
\t\tvar data map[string]interface{}
\t\tif err := json.NewDecoder(r.Body).Decode(&data); err != nil {
\t\t\thttp.Error(w, err.Error(), http.StatusBadRequest)
\t\t\treturn
\t\t}
\t\t
\t\tjson.NewEncoder(w).Encode(map[string]interface{}{
\t\t\t"success": true,
\t\t\t"data":    data,
\t\t})
\t\t
\tdefault:
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t}
}`,

  main: () => `package main

import (
\t"fmt"
\t"log"
)

func main() {
\tfmt.Println("Hello, World!")
}`
}

/**
 * Rust Templates
 */
export const rustTemplates = {
  struct: (name: string) => `#[derive(Debug, Clone)]
pub struct ${name} {
    // Add fields here
}

impl ${name} {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for ${name} {
    fn default() -> Self {
        Self::new()
    }
}`,
  
  function: (name: string) => `pub fn ${name}() -> Result<(), Box<dyn std::error::Error>> {
    // Implementation here
    Ok(())
}`,
  
  trait: (name: string) => `pub trait ${name} {
    // Add methods here
}`,
  
  actixRoute: (path: string) => `#[get("${path}")]
async fn ${path.replace('/', '_').replace('-', '_')}() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "success": true,
        "data": {}
    }))
}`
}

/**
 * Java Templates
 */
export const javaTemplates = {
  class: (name: string) => `public class ${name} {
    public ${name}() {
        // Constructor
    }
    
    @Override
    public String toString() {
        return "${name}{}";
    }
}`,
  
  interface: (name: string) => `public interface ${name} {
    // Add methods here
}`,
  
  springController: (name: string) => `import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/${name.toLowerCase()}")
public class ${name}Controller {
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", new ArrayList<>());
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }
}`,

  springBootMain: (name: string) => `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${name}Application {
    public static void main(String[] args) {
        SpringApplication.run(${name}Application.class, args);
    }
}`
}

/**
 * Ruby Templates
 */
export const rubyTemplates = {
  class: (name: string) => `class ${name}
  def initialize
    # Constructor
  end
  
  def to_s
    "${name}"
  end
end`,

  railsController: (name: string) => `class ${name}Controller < ApplicationController
  before_action :set_${name.toLowerCase()}, only: [:show, :update, :destroy]
  
  # GET /${name.toLowerCase()}s
  def index
    @${name.toLowerCase()}s = ${name}.all
    render json: @${name.toLowerCase()}s
  end
  
  # GET /${name.toLowerCase()}s/:id
  def show
    render json: @${name.toLowerCase()}
  end
  
  # POST /${name.toLowerCase()}s
  def create
    @${name.toLowerCase()} = ${name}.new(${name.toLowerCase()}_params)
    
    if @${name.toLowerCase()}.save
      render json: @${name.toLowerCase()}, status: :created
    else
      render json: @${name.toLowerCase()}.errors, status: :unprocessable_entity
    end
  end
  
  private
  
  def set_${name.toLowerCase()}
    @${name.toLowerCase()} = ${name}.find(params[:id])
  end
  
  def ${name.toLowerCase()}_params
    params.require(:${name.toLowerCase()}).permit(:attribute1, :attribute2)
  end
end`
}

/**
 * PHP Templates
 */
export const phpTemplates = {
  class: (name: string) => `<?php

class ${name}
{
    public function __construct()
    {
        // Constructor
    }
    
    public function __toString(): string
    {
        return '${name}';
    }
}`,

  laravelController: (name: string) => `<?php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;

class ${name}Controller extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }
    
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Add validation rules
        ]);
        
        return response()->json([
            'success' => true,
            'data' => $validated
        ], 201);
    }
}`
}

/**
 * Generate code from template
 */
export function generateCode(
  language: string,
  type: string,
  name: string,
  options?: any
): string {
  const templates: Record<string, Record<string, Function>> = {
    react: reactTemplates,
    typescript: reactTemplates,
    python: pythonTemplates,
    go: goTemplates,
    rust: rustTemplates,
    java: javaTemplates,
    ruby: rubyTemplates,
    php: phpTemplates,
  }
  
  const languageTemplates = templates[language.toLowerCase()]
  if (!languageTemplates) {
    throw new Error(`No templates available for language: ${language}`)
  }
  
  const template = languageTemplates[type]
  if (!template) {
    throw new Error(`No template type '${type}' for language: ${language}`)
  }
  
  return template(name, options)
}

/**
 * Get available templates for a language
 */
export function getAvailableTemplates(language: string): string[] {
  const templates: Record<string, string[]> = {
    react: ['component', 'hook', 'context', 'apiRoute'],
    typescript: ['component', 'hook', 'context', 'apiRoute'],
    python: ['class', 'function', 'flaskRoute', 'fastapiRoute', 'djangoModel'],
    go: ['struct', 'interface', 'handler', 'main'],
    rust: ['struct', 'function', 'trait', 'actixRoute'],
    java: ['class', 'interface', 'springController', 'springBootMain'],
    ruby: ['class', 'railsController'],
    php: ['class', 'laravelController'],
  }
  
  return templates[language.toLowerCase()] || []
}

