#!/usr/bin/env node

import { postmanToBruno, postmanToBrunoEnvironment } from '@usebruno/converters';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function convertPostmanToBruno() {
  try {
    console.log('🔄 Starting Postman to Bruno conversion...\n');
    
    // Check if Postman collection file exists
    const collectionPath = process.argv[2] || 'postman-collection.json';
    const environmentPath = process.argv[3] || 'postman-environment.json';
    
    console.log(`📁 Looking for collection: ${collectionPath}`);
    
    // Read and convert collection
    try {
      const collectionData = await readFile(collectionPath, 'utf8');
      const postmanCollection = JSON.parse(collectionData);
      
      console.log(`✅ Found collection: ${postmanCollection.info?.name || 'Unnamed Collection'}`);
      
      // Convert collection
      const brunoCollection = postmanToBruno(postmanCollection);
      
      // Create output directory
      const outputDir = 'converted';
      await mkdir(outputDir, { recursive: true });
      
      // Write converted collection
      const outputPath = path.join(outputDir, 'bruno-collection.json');
      await writeFile(outputPath, JSON.stringify(brunoCollection, null, 2));
      console.log(`✅ Collection converted and saved to: ${outputPath}`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`❌ Collection file not found: ${collectionPath}`);
        console.log('\n📝 Usage: node convert-postman.js [collection.json] [environment.json]');
        console.log('   Place your exported Postman files in this directory and run again.');
        return;
      }
      throw error;
    }
    
    // Try to convert environment if it exists
    try {
      const envData = await readFile(environmentPath, 'utf8');
      const postmanEnv = JSON.parse(envData);
      
      console.log(`✅ Found environment: ${postmanEnv.name || 'Unnamed Environment'}`);
      
      // Convert environment
      const brunoEnv = postmanToBrunoEnvironment(postmanEnv);
      
      // Write converted environment
      const envOutputPath = path.join('converted', 'bruno-environment.json');
      await writeFile(envOutputPath, JSON.stringify(brunoEnv, null, 2));
      console.log(`✅ Environment converted and saved to: ${envOutputPath}`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`ℹ️  No environment file found (${environmentPath}) - skipping environment conversion`);
      } else {
        console.log(`⚠️  Error converting environment: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Conversion complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Review the converted files in the "converted" directory');
    console.log('2. Import them into Bruno using the app');
    console.log('3. Set up your .env file with credentials');
    console.log('4. Test your requests in Bruno');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

// Run the conversion
convertPostmanToBruno();