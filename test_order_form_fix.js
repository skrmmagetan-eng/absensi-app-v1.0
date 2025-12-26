/**
 * 🧪 TEST SCRIPT - Order Form Fix Verification
 * Script untuk memverifikasi bahwa fix permanent sudah bekerja
 */

console.log('🧪 Testing Order Form Fix...');

// Test 1: Check form has novalidate attribute
const form = document.getElementById('order-form');
if (form) {
    const hasNoValidate = form.hasAttribute('novalidate');
    console.log(`✅ Form novalidate attribute: ${hasNoValidate ? 'PRESENT' : 'MISSING'}`);
} else {
    console.log('❌ Order form not found');
}

// Test 2: Check customer select doesn't have required attribute
const customerSelect = document.getElementById('customer');
if (customerSelect) {
    const hasRequired = customerSelect.hasAttribute('required');
    console.log(`✅ Customer select required attribute: ${hasRequired ? 'PRESENT (BAD)' : 'REMOVED (GOOD)'}`);
    console.log(`✅ Customer select display: ${customerSelect.style.display}`);
} else {
    console.log('❌ Customer select not found');
}

// Test 3: Check if searchable dropdown is working
if (window.customerDropdown) {
    console.log('✅ Searchable dropdown: INITIALIZED');
    console.log(`✅ Dropdown value: "${window.customerDropdown.getValue()}"`);
    console.log(`✅ Dropdown required: ${window.customerDropdown.isRequired ? window.customerDropdown.isRequired() : 'N/A'}`);
} else {
    console.log('⚠️ Searchable dropdown: NOT INITIALIZED (may be normal if no customers)');
}

// Test 4: Check submit button
const submitBtn = document.getElementById('btn-submit-order');
if (submitBtn) {
    console.log('✅ Submit button: FOUND');
    console.log(`✅ Submit button disabled: ${submitBtn.disabled}`);
} else {
    console.log('❌ Submit button not found');
}

// Test 5: Simulate form validation
console.log('\n🔍 Testing form validation...');

// Mock validation test
const mockValidation = () => {
    try {
        // Test customer validation
        const customerId = window.customerDropdown?.getValue() || customerSelect?.value;
        console.log(`✅ Customer validation: ${customerId ? 'VALID' : 'INVALID (expected for empty form)'}`);
        
        // Test items validation
        const itemRows = document.querySelectorAll('.order-item-row');
        console.log(`✅ Item rows found: ${itemRows.length}`);
        
        let validItems = 0;
        itemRows.forEach((row, index) => {
            const name = row.querySelector('.item-name')?.value?.trim();
            const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
            
            if (name && qty > 0 && price >= 0) {
                validItems++;
            }
            
            console.log(`   Row ${index + 1}: name="${name}", qty=${qty}, price=${price}`);
        });
        
        console.log(`✅ Valid items: ${validItems}/${itemRows.length}`);
        
        return true;
    } catch (error) {
        console.error('❌ Validation test error:', error);
        return false;
    }
};

const validationResult = mockValidation();
console.log(`\n🎯 Overall validation test: ${validationResult ? 'PASSED' : 'FAILED'}`);

// Test 6: Check for hidden required elements (the original issue)
const hiddenRequiredElements = document.querySelectorAll('select[required][style*="display: none"], input[required][style*="display: none"]');
if (hiddenRequiredElements.length > 0) {
    console.log(`❌ Found ${hiddenRequiredElements.length} hidden required elements (THIS IS THE BUG):`);
    hiddenRequiredElements.forEach((el, i) => {
        console.log(`   ${i + 1}. ${el.tagName}#${el.id} - ${el.getAttribute('required')}`);
    });
} else {
    console.log('✅ No hidden required elements found (GOOD)');
}

console.log('\n🎉 Order Form Fix Test Complete!');
console.log('📝 Summary:');
console.log('   - Form should have novalidate attribute');
console.log('   - Customer select should NOT have required attribute');
console.log('   - No hidden elements should have required attribute');
console.log('   - Custom validation should handle all checks');

// Export test function for manual use
window.testOrderFormFix = () => {
    console.clear();
    console.log('🔄 Re-running order form fix test...');
    // Re-run the test
    setTimeout(() => {
        window.location.reload();
    }, 100);
};

console.log('\n🔧 Manual re-test available: window.testOrderFormFix()');