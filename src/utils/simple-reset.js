// Simple Reset Password System - Minimal version that works
import { db } from '../lib/supabase.js';

export const simpleReset = {
  // Generate reset token
  generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },

  // Create WhatsApp link
  createWhatsAppLink(phoneNumber, message) {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    let formattedPhone = cleanPhone;
    
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      formattedPhone = '62' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  },

  // Generate WhatsApp message
  generateMessage(userName, token) {
    const expireTime = new Date(Date.now() + 30*60*1000).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `🔐 RESET PASSWORD - SKRM ABSENSI

Halo ${userName},

Kode reset password Anda:
*${token}*

📱 Cara reset password:
1. Buka aplikasi absensi
2. Klik "Lupa Password?"
3. Masukkan kode: *${token}*
4. Buat password baru

⏰ Kode berlaku sampai: ${expireTime}
🔒 Jangan bagikan kode ini ke siapa pun

SKRM Management System`;
  },

  // Main reset function - simplified
  async initiateReset(email, phoneNumber, userName) {
    try {
      console.log('🔐 Starting simple reset for:', email);

      // 1. Get user data (simple query)
      const { data: user, error: userError } = await db.supabase
        .from('users')
        .select('id, name')
        .eq('email', email)
        .single();

      if (userError || !user) {
        throw new Error('User tidak ditemukan di database');
      }

      console.log('✅ User found:', user);

      // 2. Generate token
      const token = this.generateToken();
      console.log('✅ Token generated:', token);

      // 3. Save token to database (simple insert)
      const expiresAt = new Date(Date.now() + 30*60*1000);
      
      // Delete old tokens for this user first
      await db.supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', user.id);

      // Insert new token
      const { error: insertError } = await db.supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          email: email,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error(`Gagal menyimpan token: ${insertError.message}`);
      }

      console.log('✅ Token saved to database');

      // 4. Validate phone number
      if (!phoneNumber) {
        throw new Error('Nomor telepon harus diisi');
      }

      const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new Error(`Format nomor telepon tidak valid: ${phoneNumber}`);
      }

      // 5. Generate messages and links
      const message = this.generateMessage(userName || user.name, token);
      const whatsappLink = this.createWhatsAppLink(phoneNumber, message);

      console.log('✅ Simple reset completed successfully');

      return {
        success: true,
        token,
        whatsappLink,
        message,
        phone: phoneNumber,
        expiresAt: expiresAt.toISOString()
      };

    } catch (error) {
      console.error('❌ Simple reset error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Validate and use token
  async useToken(token, newPassword) {
    try {
      // 1. Find valid token
      const { data: tokenData, error: tokenError } = await db.supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Token tidak valid atau sudah expired');
      }

      // 2. Update password using admin API
      if (!db.supabaseAdmin) {
        throw new Error('Admin API tidak tersedia');
      }

      const { error: authError } = await db.supabaseAdmin.auth.admin.updateUserById(
        tokenData.user_id,
        { password: newPassword }
      );

      if (authError) {
        throw new Error('Gagal update password: ' + authError.message);
      }

      // 3. Mark token as used
      await db.supabase
        .from('password_reset_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);

      return { success: true };

    } catch (error) {
      console.error('Use token error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};