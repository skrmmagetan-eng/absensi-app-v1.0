// Custom Reset Password System
// Alternative to email-based reset using WhatsApp/SMS

import { db } from '../lib/supabase.js';
import { showNotification } from './helpers.js';

export const customReset = {
  // Generate secure reset token
  generateResetToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },

  // Save reset token to database
  async saveResetToken(userId, email, token) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes expiry

    try {
      console.log('💾 Saving token to database:', { userId, email, token });
      
      // First, delete any existing tokens for this user
      await db.supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', userId);
      
      // Then insert new token
      const { data, error } = await db.supabase
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          email: email,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database save error:', error);
        
        // Check if table exists
        if (error.message.includes('relation "password_reset_tokens" does not exist')) {
          throw new Error('Tabel password_reset_tokens belum dibuat. Silakan jalankan SQL setup di Supabase Dashboard.');
        }
        
        // Check RLS policy
        if (error.message.includes('policy')) {
          throw new Error('Permission denied. Pastikan Anda login sebagai admin.');
        }
        
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ Token saved successfully');
      return { success: true, expiresAt };
      
    } catch (error) {
      console.error('❌ Save token error:', error);
      return { success: false, error: error.message };
    }
  },

  // Validate reset token
  async validateResetToken(token) {
    try {
      const { data, error } = await db.supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return { valid: false, error: 'Token tidak valid atau sudah expired' };
      }

      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  // Mark token as used
  async markTokenUsed(token) {
    try {
      const { error } = await db.supabase
        .from('password_reset_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);

      return !error;
    } catch (error) {
      console.error('Error marking token as used:', error);
      return false;
    }
  },

  // Generate WhatsApp message
  generateWhatsAppMessage(userName, token, expiresAt) {
    const expireTime = new Date(expiresAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `🔐 *RESET PASSWORD - SKRM ABSENSI*

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

Jika Anda tidak meminta reset password, abaikan pesan ini.

_SKRM Management System_`;
  },

  // Generate SMS message (shorter version)
  generateSMSMessage(userName, token) {
    return `SKRM ABSENSI - Reset Password
Halo ${userName}
Kode reset: ${token}
Berlaku 30 menit
Jangan bagikan kode ini`;
  },

  // Create WhatsApp link
  createWhatsAppLink(phoneNumber, message) {
    // Clean phone number (remove +, spaces, etc)
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    
    // Add country code if not present (assume Indonesia +62)
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      formattedPhone = '62' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  },

  // Main function to initiate custom reset
  async initiateCustomReset(email, phoneNumber, userName) {
    try {
      console.log('🔐 Starting custom reset for:', email);
      
      // 1. Get user data
      let user, userError;
      
      const result = await db.supabase
        .from('users')
        .select('id, name, phone')
        .eq('email', email)
        .single();
        
      user = result.data;
      userError = result.error;

      if (userError) {
        console.error('User lookup error:', userError);
        
        // Handle case where phone column doesn't exist
        if (userError.message.includes('column "phone" does not exist')) {
          // Try without phone column
          const { data: userWithoutPhone, error: userError2 } = await db.supabase
            .from('users')
            .select('id, name')
            .eq('email', email)
            .single();
            
          if (userError2) {
            throw new Error(`Database error: ${userError2.message}`);
          }
          
          if (!userWithoutPhone) {
            throw new Error('User tidak ditemukan di database');
          }
          
          // Use provided phone number since DB doesn't have phone column
          if (!phoneNumber) {
            throw new Error('Nomor telepon harus disediakan karena tidak tersimpan di database. Silakan update data karyawan terlebih dahulu.');
          }
          
          // Set user data without phone from DB
          user = { ...userWithoutPhone, phone: null };
        } else {
          throw new Error(`Database error: ${userError.message}`);
        }
      }
      
      if (!user) {
        throw new Error('User tidak ditemukan di database');
      }

      console.log('✅ User found:', user);

      // 2. Generate token
      const token = this.generateResetToken();
      console.log('✅ Token generated:', token);

      // 3. Save token to database
      const saveResult = await this.saveResetToken(user.id, email, token);
      if (!saveResult.success) {
        console.error('Save token error:', saveResult.error);
        throw new Error(`Gagal menyimpan token: ${saveResult.error}`);
      }

      console.log('✅ Token saved to database');

      // 4. Generate messages
      const whatsappMessage = this.generateWhatsAppMessage(
        userName || user.name, 
        token, 
        saveResult.expiresAt
      );
      const smsMessage = this.generateSMSMessage(userName || user.name, token);

      // 5. Create WhatsApp link
      const phone = phoneNumber || user.phone;
      if (!phone) {
        throw new Error('Nomor telepon tidak tersedia untuk karyawan ini. Silakan update data karyawan terlebih dahulu.');
      }

      // Validate phone number format
      const cleanPhone = phone.replace(/[^\d]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new Error(`Format nomor telepon tidak valid: ${phone}. Gunakan format 08xxx atau +62xxx`);
      }

      const whatsappLink = this.createWhatsAppLink(phone, whatsappMessage);

      console.log('✅ Custom reset completed successfully');

      return {
        success: true,
        token,
        whatsappLink,
        smsMessage,
        phone,
        expiresAt: saveResult.expiresAt
      };

    } catch (error) {
      console.error('❌ Custom reset error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Reset password with token
  async resetPasswordWithToken(token, newPassword) {
    try {
      // 1. Validate token
      const validation = await this.validateResetToken(token);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const tokenData = validation.data;

      // 2. Update password in Supabase Auth
      if (!db.supabaseAdmin) {
        throw new Error('Service role key tidak dikonfigurasi. Tidak dapat mengupdate password.');
      }

      const { error: authError } = await db.supabaseAdmin.auth.admin.updateUserById(
        tokenData.user_id,
        { password: newPassword }
      );

      if (authError) {
        throw new Error('Gagal update password: ' + authError.message);
      }

      // 3. Mark token as used
      await this.markTokenUsed(token);

      return { success: true };

    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Clean expired tokens (maintenance function)
  async cleanExpiredTokens() {
    try {
      const { error } = await db.supabase
        .from('password_reset_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
      console.log('Expired tokens cleaned');
    } catch (error) {
      console.error('Error cleaning expired tokens:', error);
    }
  }
};