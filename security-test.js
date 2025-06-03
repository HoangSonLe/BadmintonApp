/**
 * Security Test Script - Badminton App
 * 
 * Chạy script này trong browser console để test các biện pháp bảo mật
 * 
 * Cách sử dụng:
 * 1. Mở browser developer tools (F12)
 * 2. Vào tab Console
 * 3. Copy và paste script này
 * 4. Chạy từng test function
 */

console.log('🔐 Security Test Script - Badminton App');
console.log('=====================================');

// Test 1: Thử bypass admin bằng localStorage manipulation
function testLocalStorageBypass() {
  console.log('\n🧪 Test 1: localStorage Bypass Attempt');
  console.log('---------------------------------------');
  
  // Thử set admin status trực tiếp
  localStorage.setItem('badminton_v2_admin_status', 'true');
  localStorage.setItem('badminton_v2_admin_auth_time', Date.now().toString());
  
  console.log('✅ Set localStorage admin_status = true');
  console.log('✅ Set localStorage admin_auth_time = current time');
  
  // Reload page để test
  console.log('🔄 Reload page để test...');
  console.log('❓ Kết quả mong đợi: Admin tabs vẫn KHÔNG hiển thị vì thiếu valid token');
}

// Test 2: Thử forge admin token
function testTokenForging() {
  console.log('\n🧪 Test 2: Token Forging Attempt');
  console.log('----------------------------------');
  
  // Thử tạo fake token
  const fakeToken = 'fake.token.123';
  localStorage.setItem('badminton_v2_admin_token', fakeToken);
  
  console.log('✅ Set fake admin token:', fakeToken);
  console.log('🔄 Reload page để test...');
  console.log('❓ Kết quả mong đợi: Token bị reject, session bị clear');
}

// Test 3: Thử access admin functions trực tiếp
function testDirectAdminAccess() {
  console.log('\n🧪 Test 3: Direct Admin Function Access');
  console.log('----------------------------------------');
  
  try {
    // Thử gọi admin function trực tiếp (nếu có trong global scope)
    if (window.DatabaseSecurityService) {
      window.DatabaseSecurityService.secureDeleteRegistration('test-id');
    } else {
      console.log('⚠️ DatabaseSecurityService không có trong global scope (tốt!)');
    }
  } catch (error) {
    console.log('✅ Admin function bị block:', error.message);
  }
  
  console.log('❓ Kết quả mong đợi: Throw error "Unauthorized: Admin token required"');
}

// Test 4: Kiểm tra DOM cho admin elements
function testDOMInspection() {
  console.log('\n🧪 Test 4: DOM Inspection for Admin Elements');
  console.log('----------------------------------------------');
  
  // Tìm admin tabs trong DOM
  const adminTabs = document.querySelectorAll('[data-node-key="settings"], [data-node-key="data"], [data-node-key="demo"], [data-node-key="security"], [data-node-key="storage"]');
  
  console.log('🔍 Tìm admin tabs trong DOM...');
  console.log('Admin tabs found:', adminTabs.length);
  
  if (adminTabs.length === 0) {
    console.log('✅ Admin tabs KHÔNG có trong DOM (bảo mật tốt!)');
  } else {
    console.log('❌ Admin tabs vẫn có trong DOM (có thể bị bypass!)');
    adminTabs.forEach((tab, index) => {
      console.log(`Tab ${index + 1}:`, tab);
    });
  }
  
  // Tìm admin buttons
  const adminButtons = document.querySelectorAll('button:contains("Admin"), button:contains("Cài đặt"), button:contains("Dữ liệu")');
  console.log('Admin buttons found:', adminButtons.length);
  
  console.log('❓ Kết quả mong đợi: 0 admin tabs/buttons trong DOM khi chưa login admin');
}

// Test 5: Kiểm tra session persistence
function testSessionPersistence() {
  console.log('\n🧪 Test 5: Session Persistence Test');
  console.log('------------------------------------');
  
  const adminToken = localStorage.getItem('badminton_v2_admin_token');
  const adminStatus = localStorage.getItem('badminton_v2_admin_status');
  const adminAuthTime = localStorage.getItem('badminton_v2_admin_auth_time');
  
  console.log('Current session data:');
  console.log('- Admin Token:', adminToken ? 'Present' : 'Not found');
  console.log('- Admin Status:', adminStatus);
  console.log('- Admin Auth Time:', adminAuthTime);
  
  if (adminToken) {
    console.log('🔍 Analyzing token structure...');
    const parts = adminToken.split('.');
    console.log('Token parts:', parts.length);
    
    if (parts.length === 3) {
      const [timestamp, randomBytes, hash] = parts;
      const tokenAge = Date.now() - parseInt(timestamp);
      const ageInHours = tokenAge / (1000 * 60 * 60);
      
      console.log('- Timestamp:', new Date(parseInt(timestamp)).toISOString());
      console.log('- Random bytes:', randomBytes);
      console.log('- Hash:', hash);
      console.log('- Token age:', ageInHours.toFixed(2), 'hours');
      console.log('- Expires in:', (24 - ageInHours).toFixed(2), 'hours');
      
      if (ageInHours > 24) {
        console.log('⚠️ Token đã expire (>24h)');
      } else {
        console.log('✅ Token vẫn valid (<24h)');
      }
    } else {
      console.log('❌ Token format không đúng (không phải 3 parts)');
    }
  }
}

// Test 6: Network request interception
function testNetworkSecurity() {
  console.log('\n🧪 Test 6: Network Request Security');
  console.log('------------------------------------');
  
  // Monitor network requests
  const originalFetch = window.fetch;
  let requestCount = 0;
  
  window.fetch = function(...args) {
    requestCount++;
    console.log(`🌐 Network Request ${requestCount}:`, args[0]);
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Network monitoring enabled');
  console.log('❓ Thử thực hiện admin actions và xem requests có bị block không');
  
  // Restore sau 30 giây
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('🔄 Network monitoring disabled');
  }, 30000);
}

// Chạy tất cả tests
function runAllSecurityTests() {
  console.log('🚀 Running All Security Tests...');
  console.log('=================================');
  
  testLocalStorageBypass();
  testTokenForging();
  testDirectAdminAccess();
  testDOMInspection();
  testSessionPersistence();
  testNetworkSecurity();
  
  console.log('\n📋 Test Summary:');
  console.log('- Test 1: localStorage bypass attempt');
  console.log('- Test 2: Token forging attempt');
  console.log('- Test 3: Direct admin function access');
  console.log('- Test 4: DOM inspection for admin elements');
  console.log('- Test 5: Session persistence check');
  console.log('- Test 6: Network request monitoring');
  
  console.log('\n💡 Hướng dẫn:');
  console.log('1. Chạy từng test riêng lẻ: testLocalStorageBypass(), testTokenForging(), etc.');
  console.log('2. Reload page sau mỗi test để xem kết quả');
  console.log('3. Kiểm tra console logs để verify security measures');
}

// Export functions to global scope
window.securityTests = {
  testLocalStorageBypass,
  testTokenForging,
  testDirectAdminAccess,
  testDOMInspection,
  testSessionPersistence,
  testNetworkSecurity,
  runAllSecurityTests
};

console.log('\n✅ Security test functions loaded!');
console.log('📝 Available functions:');
console.log('- securityTests.testLocalStorageBypass()');
console.log('- securityTests.testTokenForging()');
console.log('- securityTests.testDirectAdminAccess()');
console.log('- securityTests.testDOMInspection()');
console.log('- securityTests.testSessionPersistence()');
console.log('- securityTests.testNetworkSecurity()');
console.log('- securityTests.runAllSecurityTests()');
console.log('\n🎯 Bắt đầu với: securityTests.runAllSecurityTests()');
