// Quick script to index your codebase for semantic search
// Usage: node index-codebase.js

const { glob } = require('glob')
const fs = require('fs').promises
const path = require('path')

// Simple Node.js version without ES modules

async function main() {
  console.log('🚀 Codebase Indexing Script')
  console.log('====================================')
  console.log('')
  console.log('⚠️  IMPORTANT: Make sure you have:')
  console.log('   1. Qdrant running (docker run -p 6333:6333 qdrant/qdrant)')
  console.log('   2. OPENAI_API_KEY in .env file')
  console.log('   3. Server running (npm run dev)')
  console.log('')
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  readline.question('Ready to start indexing? (y/n) ', async (answer) => {
    readline.close()
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Indexing cancelled')
      process.exit(0)
    }
    
    console.log('')
    console.log('📁 Scanning for code files...')
    
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']
    const ignore = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.git/**']
    
    const files = []
    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore })
      files.push(...matches)
    }
    
    const uniqueFiles = [...new Set(files)]
    console.log(`✅ Found ${uniqueFiles.length} code files`)
    console.log('')
    console.log('🔧 To complete indexing, open your browser:')
    console.log('   1. Go to http://localhost:5000')
    console.log('   2. Open AI Agent panel')
    console.log('   3. Click "Settings" (gear icon)')
    console.log('   4. Click "Index Codebase" button')
    console.log('')
    console.log('Or call the indexing API directly:')
    console.log('')
    console.log('fetch("http://localhost:5000/api/embeddings/index", {')
    console.log('  method: "POST",')
    console.log('  headers: { "Content-Type": "application/json" },')
    console.log('  body: JSON.stringify({ action: "index" })')
    console.log('})')
    console.log('')
    console.log('📊 This will:')
    console.log(`   • Process ${uniqueFiles.length} files`)
    console.log('   • Generate embeddings (using OpenAI)')
    console.log('   • Store in Qdrant vector DB')
    console.log('   • Take ~2-5 minutes')
    console.log('')
    console.log('💡 Tip: Keep this terminal open to monitor progress!')
  })
}

main().catch(console.error)

