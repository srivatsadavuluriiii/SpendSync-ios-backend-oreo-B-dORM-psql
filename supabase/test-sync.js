#!/usr/bin/env node

/**
 * Test script for Supabase to MongoDB synchronization
 * This script tests the sync functionality by creating test data in Supabase
 * and verifying it appears in MongoDB
 */

const { createClient } = require('@supabase/supabase-js');
const { MongoClient } = require('mongodb');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/spendsync'
  }
};

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

async function connectToMongoDB() {
  const client = new MongoClient(config.mongodb.uri);
  await client.connect();
  return client;
}

async function testUserProfileSync() {
  console.log('🧪 Testing user profile synchronization...');
  
  try {
    // Create a test user profile in Supabase
    const testProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890',
      preferences: { theme: 'dark', notifications: true }
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(testProfile)
      .select();

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    console.log('✅ Created test profile in Supabase:', data[0].id);

    // Wait for sync to complete
    console.log('⏳ Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if data exists in MongoDB
    const mongoClient = await connectToMongoDB();
    const db = mongoClient.db();
    const collection = db.collection('user_profiles');

    const mongoDoc = await collection.findOne({ _id: testProfile.id });
    
    if (!mongoDoc) {
      throw new Error('Document not found in MongoDB');
    }

    console.log('✅ Found synced document in MongoDB:', mongoDoc._id);

    // Verify data integrity
    if (mongoDoc.first_name !== testProfile.first_name ||
        mongoDoc.last_name !== testProfile.last_name ||
        mongoDoc.phone !== testProfile.phone) {
      throw new Error('Data mismatch between Supabase and MongoDB');
    }

    console.log('✅ Data integrity verified');

    // Clean up
    await supabase.from('user_profiles').delete().eq('id', testProfile.id);
    await collection.deleteOne({ _id: testProfile.id });
    await mongoClient.close();

    console.log('✅ Test cleanup completed');
    return true;

  } catch (error) {
    console.error('❌ User profile sync test failed:', error.message);
    return false;
  }
}

async function testGroupSync() {
  console.log('🧪 Testing group synchronization...');
  
  try {
    const testGroup = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Test Group',
      description: 'A test group for sync verification',
      created_by: '550e8400-e29b-41d4-a716-446655440001',
      members: ['550e8400-e29b-41d4-a716-446655440001'],
      settings: { currency: 'USD', auto_settle: false }
    };

    const { data, error } = await supabase
      .from('groups')
      .insert(testGroup)
      .select();

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    console.log('✅ Created test group in Supabase:', data[0].id);

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check MongoDB
    const mongoClient = await connectToMongoDB();
    const db = mongoClient.db();
    const collection = db.collection('groups');

    const mongoDoc = await collection.findOne({ _id: testGroup.id });
    
    if (!mongoDoc) {
      throw new Error('Group not found in MongoDB');
    }

    console.log('✅ Found synced group in MongoDB:', mongoDoc._id);

    // Clean up
    await supabase.from('groups').delete().eq('id', testGroup.id);
    await collection.deleteOne({ _id: testGroup.id });
    await mongoClient.close();

    console.log('✅ Group sync test completed');
    return true;

  } catch (error) {
    console.error('❌ Group sync test failed:', error.message);
    return false;
  }
}

async function testBulkSync() {
  console.log('🧪 Testing bulk synchronization...');
  
  try {
    // Call the bulk sync endpoint
    const response = await fetch(`${config.supabase.url}/functions/v1/sync-to-mongodb/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Bulk sync request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Bulk sync failed: ${result.error || 'Unknown error'}`);
    }

    console.log('✅ Bulk sync completed successfully');
    console.log('📊 Sync results:', result.results);
    return true;

  } catch (error) {
    console.error('❌ Bulk sync test failed:', error.message);
    return false;
  }
}

async function testHealthCheck() {
  console.log('🧪 Testing edge function health...');
  
  try {
    const response = await fetch(`${config.supabase.url}/functions/v1/sync-to-mongodb/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.supabase.serviceRoleKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.status !== 'healthy') {
      throw new Error(`Edge function is not healthy: ${result.status}`);
    }

    console.log('✅ Edge function is healthy');
    return true;

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Supabase to MongoDB sync tests...\n');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Profile Sync', fn: testUserProfileSync },
    { name: 'Group Sync', fn: testGroupSync },
    { name: 'Bulk Sync', fn: testBulkSync }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your sync system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs and configuration.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testUserProfileSync,
  testGroupSync,
  testBulkSync,
  testHealthCheck,
  runAllTests
}; 