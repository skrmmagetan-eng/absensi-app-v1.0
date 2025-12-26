/**
 * 🔧 QUICK FIX - ORDER FORM VALIDATION ISSUE
 * Script untuk fix masalah "invalid form control" pada form order
 * 
 * Jalankan di Browser Console untuk fix immediate
 */

console.log('🔧 Applying quick fix for order form...');

// 1. Force remove required attribute from all hidden selects
document.querySelectorAll('select[style*="display: none"]').forEach(select => {
    if (select.hasAttribute('required')) {
        select.removeAttribute('required');
        console.log('✅ Removed required from hidden select:', select.id);
    }
});

// 2. Specifically target customer select
const customerSelect = document.getElementById('customer');
if (customerSelect) {
    customerSelect.removeAttribute('required');
    console.log('✅ Removed required from customer select');
    
    // Make sure it has a valid value or empty
    if (!customerSelect.value) {
        customerSelect.value = '';
    }
}

// 3. Add custom validation to form
const form = document.getElementById('order-form');
if (form) {
    // Remove existing submit listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new submit handler
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🚀 Custom form submit handler triggered');
        
        // Custom validation
        const customerValue = document.getElementById('customer').value || 
                             window.customerDropdown?.getValue();
        
        if (!customerValue) {
            alert('❌ Pilih pelanggan terlebih dahulu');
            return;
        }
        
        // Get items
        const items = [];
        let totalAmount = 0;
        
        document.querySelectorAll('.order-item-row').forEach(row => {
            const name = row.querySelector('.item-name')?.value;
            const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
            
            if (name && qty > 0) {
                items.push({ name, qty, price });
                totalAmount += qty * price;
            }
        });
        
        if (items.length === 0) {
            alert('❌ Masukkan minimal satu barang');
            return;
        }
        
        const notes = document.getElementById('notes')?.value || '';
        const user = window.state?.getState('user');
        
        if (!user) {
            alert('❌ User tidak ditemukan, silakan login ulang');
            return;
        }
        
        // Show loading
        const submitBtn = document.getElementById('btn-submit-order');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Mengirim...';
        
        try {
            console.log('📤 Submitting order data:', {
                customer: customerValue,
                items,
                total: totalAmount
            });
            
            // Generate items summary
            const itemsSummary = items.map(i => `${i.name} (${i.qty}x)`).join(', ');
            
            const orderData = {
                employee_id: user.id,
                customer_id: customerValue,
                items: items,
                items_summary: itemsSummary,
                total_amount: totalAmount,
                status: 'pending',
                notes: notes || null,
                created_at: new Date().toISOString()
            };
            
            const result = await window.db.createOrder(orderData);
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            console.log('✅ Order created successfully:', result);
            alert('🎉 Data omset berhasil dikirim!');
            
            // Reset form
            newForm.reset();
            
            // Navigate back
            setTimeout(() => {
                window.location.hash = '#orders';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Order submission failed:', error);
            alert('❌ Gagal mengirim data omset: ' + error.message);
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
    
    console.log('✅ Custom form handler attached');
}

// 4. Test button click
const submitBtn = document.getElementById('btn-submit-order');
if (submitBtn) {
    console.log('✅ Submit button found and ready');
    
    // Test click
    submitBtn.addEventListener('click', (e) => {
        console.log('🖱️ Submit button clicked');
    });
}

console.log('🎉 Quick fix applied! Try submitting the form now.');

// Export for manual testing
window.testOrderSubmit = () => {
    const form = document.getElementById('order-form');
    if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
};

console.log('🔧 Manual test available: window.testOrderSubmit()');