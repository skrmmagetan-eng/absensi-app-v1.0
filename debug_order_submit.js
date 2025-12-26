/**
 * 🔍 DEBUG SCRIPT - ORDER SUBMIT ISSUE
 * Script untuk debug masalah tombol "Kirim Data Omset" tidak merespons
 * 
 * Jalankan di Browser Console saat di halaman order/baru
 */

console.log('🔍 Starting order submit debug...');

// 1. Check if form elements exist
const form = document.getElementById('order-form');
const submitBtn = document.getElementById('btn-submit-order');
const customerSelect = document.getElementById('customer');

console.log('📋 Form elements check:');
console.log('- Form:', form ? '✅ Found' : '❌ Not found');
console.log('- Submit button:', submitBtn ? '✅ Found' : '❌ Not found');
console.log('- Customer select:', customerSelect ? '✅ Found' : '❌ Not found');

// 2. Check if event listeners are attached
if (form) {
    const listeners = getEventListeners ? getEventListeners(form) : 'getEventListeners not available';
    console.log('📡 Form event listeners:', listeners);
}

if (submitBtn) {
    const btnListeners = getEventListeners ? getEventListeners(submitBtn) : 'getEventListeners not available';
    console.log('🔘 Button event listeners:', btnListeners);
    
    // Check button properties
    console.log('🔘 Button properties:');
    console.log('- Disabled:', submitBtn.disabled);
    console.log('- Type:', submitBtn.type);
    console.log('- Form:', submitBtn.form);
}

// 3. Check form data
function checkFormData() {
    console.log('📊 Current form data:');
    
    const customerId = document.getElementById('customer')?.value;
    console.log('- Customer ID:', customerId);
    
    const items = [];
    document.querySelectorAll('.order-item-row').forEach((row, index) => {
        const name = row.querySelector('.item-name')?.value;
        const qty = row.querySelector('.item-qty')?.value;
        const price = row.querySelector('.item-price')?.value;
        
        console.log(`- Item ${index + 1}:`, { name, qty, price });
        
        if (name && qty > 0) {
            items.push({ name, qty: parseFloat(qty), price: parseFloat(price) });
        }
    });
    
    console.log('- Valid items:', items);
    console.log('- Total items:', items.length);
    
    const notes = document.getElementById('notes')?.value;
    console.log('- Notes:', notes);
    
    return { customerId, items, notes };
}

// 4. Test form submission manually
function testFormSubmit() {
    console.log('🧪 Testing form submission...');
    
    const formData = checkFormData();
    
    if (!formData.customerId) {
        console.error('❌ No customer selected');
        return false;
    }
    
    if (formData.items.length === 0) {
        console.error('❌ No valid items');
        return false;
    }
    
    console.log('✅ Form data is valid, attempting submission...');
    
    // Try to trigger form submit event
    if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        console.log('📤 Submit event dispatched');
    }
    
    return true;
}

// 5. Check for JavaScript errors
window.addEventListener('error', (e) => {
    console.error('🚨 JavaScript Error:', e.error);
});

// 6. Manual button click test
function testButtonClick() {
    console.log('🧪 Testing button click...');
    
    if (submitBtn) {
        submitBtn.click();
        console.log('🖱️ Button clicked programmatically');
    } else {
        console.error('❌ Submit button not found');
    }
}

// 7. Check state and user
const user = window.state?.getState('user');
const profile = window.state?.getState('profile');

console.log('👤 User state:', user);
console.log('👔 Profile state:', profile);

// 8. Check database connection
console.log('🔗 Database available:', !!window.db);

// Export functions for manual testing
window.debugOrder = {
    checkForm: checkFormData,
    testSubmit: testFormSubmit,
    testClick: testButtonClick,
    form: form,
    button: submitBtn
};

console.log('🔧 Debug functions available at: window.debugOrder');
console.log('📖 Usage:');
console.log('- window.debugOrder.checkForm() - Check form data');
console.log('- window.debugOrder.testSubmit() - Test form submission');
console.log('- window.debugOrder.testClick() - Test button click');

// Auto-run basic checks
checkFormData();