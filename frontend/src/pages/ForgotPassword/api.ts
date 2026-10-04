/**
 * Mock API untuk flow Lupa Password.
 * Nanti tinggal ganti isi fungsi dengan fetch ke backend.
 */

/* ───────────────────────── Types ───────────────────────── */

export interface ResetState {
  email: string;
  code: string;
}

/* ───────────────────────── Helpers ───────────────────────── */

const delay = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));

/* ───────────────────────── API ───────────────────────── */

export const forgotApi = {
  /** Kirim email reset — selalu sukses (mock) */
  async sendResetEmail(email: string): Promise<{ ok: true }> {
    await delay(600);
    // Nanti: POST /api/auth/forgot-password
    console.log('[MOCK] Reset email sent to:', email);
    return { ok: true };
  },

  /** Verifikasi kode 4 digit — kode mock: 1234 */
  async verifyCode(code: string): Promise<{ ok: boolean; message?: string }> {
    await delay(600);
    // Nanti: POST /api/auth/verify-code
    if (code === '1234') return { ok: true };
    return { ok: false, message: 'Kode verifikasi salah atau sudah kadaluarsa.' };
  },

  /** Kirim ulang kode */
  async resendCode(email: string): Promise<{ ok: true }> {
    await delay(500);
    console.log('[MOCK] Resend code to:', email);
    return { ok: true };
  },

  /** Ganti password — selalu sukses (mock) */
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ ok: true }> {
    await delay(700);
    // Nanti: POST /api/auth/reset-password
    console.log('[MOCK] Reset password:', { email, code, newPassword: '***' });
    return { ok: true };
  },
};