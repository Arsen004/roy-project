#!/usr/bin/env node

/**
 * Script to fix versioned imports in UI components
 * Removes version numbers from package imports
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uiDir = path.join(__dirname, '..', 'components', 'ui')

// Mapping of versioned imports to clean imports
const importMappings = {
  '@radix-ui/react-accordion@1.2.1': '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog@1.1.2': '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio@1.1.0': '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox@1.1.2': '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible@1.1.1': '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu@2.2.2': '@radix-ui/react-context-menu',
  '@radix-ui/react-dialog@1.1.2': '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card@1.1.2': '@radix-ui/react-hover-card',
  '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
  '@radix-ui/react-menubar@1.1.2': '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu@1.2.1': '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover@1.1.2': '@radix-ui/react-popover',
  '@radix-ui/react-progress@1.1.0': '@radix-ui/react-progress',
  '@radix-ui/react-radio-group@1.2.1': '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area@1.2.0': '@radix-ui/react-scroll-area',
  '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
  '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
  '@radix-ui/react-slider@1.2.1': '@radix-ui/react-slider',
  '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
  '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
  '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
  '@radix-ui/react-toast@1.2.2': '@radix-ui/react-toast',
  '@radix-ui/react-toggle@1.1.0': '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group@1.1.0': '@radix-ui/react-toggle-group',
  '@radix-ui/react-tooltip@1.1.3': '@radix-ui/react-tooltip',
  'class-variance-authority@0.7.1': 'class-variance-authority',
  'lucide-react@0.487.0': 'lucide-react'
}

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  let updatedContent = content

  // Replace all versioned imports
  for (const [versionedImport, cleanImport] of Object.entries(importMappings)) {
    const versionedPattern = new RegExp(versionedImport.replace(/[@.]/g, '\\$&'), 'g')
    updatedContent = updatedContent.replace(versionedPattern, cleanImport)
  }

  // Only write if there were changes
  if (updatedContent !== content) {
    fs.writeFileSync(filePath, updatedContent)
    console.log(`✅ Fixed imports in ${path.basename(filePath)}`)
    return true
  }
  
  return false
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir)
  let changedFiles = 0

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      changedFiles += processDirectory(filePath)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (fixImportsInFile(filePath)) {
        changedFiles++
      }
    }
  }

  return changedFiles
}

console.log('🔧 Fixing versioned imports in UI components...')

const componentsDir = path.join(__dirname, '..', 'components')
const changedFiles = processDirectory(componentsDir)

if (changedFiles > 0) {
  console.log(`\n✅ Fixed imports in ${changedFiles} files`)
} else {
  console.log('\n✅ All imports are already clean')
}

console.log('\n🎉 Import fixing complete!')