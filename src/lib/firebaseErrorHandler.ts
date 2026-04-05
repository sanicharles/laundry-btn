import { Auth } from 'firebase/auth';

/**
 * Detects if the error is due to domain not being authorized in Firebase
 */
export const isDomainUnauthorizedError = (error: any): boolean => {
  const errorMsg = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  
  return (
    errorCode === 'auth/unauthorized-domain' ||
    errorMsg.includes('not authorized') ||
    errorMsg.includes('unauthorized domain') ||
    errorMsg.includes('cors') ||
    errorMsg.includes('origin')
  );
};

/**
 * Detects if the error is a Firebase configuration issue
 */
export const isConfigurationError = (error: any): boolean => {
  const errorMsg = error?.message?.toLowerCase() || '';
  
  return (
    errorMsg.includes('invalid api key') ||
    errorMsg.includes('invalid-api-key') ||
    errorMsg.includes('api key is invalid') ||
    errorMsg.includes('auth domain')
  );
};

/**
 * Creates a fallback local session when Firebase auth is unavailable
 * Stores user session in localStorage for offline/demo usage
 */
export const createFallbackUser = async (auth: Auth, email: string): Promise<any> => {
  try {
    // Create a local fallback user object
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fallbackUser = {
      uid: userId,
      email: email || 'user@demo.local',
      displayName: 'User',
      emailVerified: false,
      isAnonymous: true,
      metadata: {
        createdAt: new Date().toISOString(),
        lastSignedInTime: new Date().toISOString()
      }
    };
    
    // Store in localStorage as fallback session
    localStorage.setItem('fallback_user', JSON.stringify(fallbackUser));
    localStorage.setItem('fallback_session_id', userId);
    localStorage.setItem('fallback_auth_token', `fallback_${Date.now()}`);
    
    // Dispatch custom event to notify app of fallback login
    window.dispatchEvent(new CustomEvent('fallback_login', { 
      detail: { user: fallbackUser } 
    }));
    
    // Return a mock user credential object
    return {
      user: fallbackUser,
      operationName: 'fallback'
    };
  } catch (error) {
    throw new Error('Gagal membuat fallback session: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Handles Firebase authentication errors with automatic recovery
 */
export const handleAuthError = async (
  error: any, 
  auth: Auth,
  fallbackEmail?: string
): Promise<{ handled: boolean; message: string; suggestedAction?: string }> => {
  const errorMsg = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  
  // Domain authorization errors
  if (isDomainUnauthorizedError(error)) {
    return {
      handled: false,
      message: 'Domain tidak terdaftar di Firebase. Hubungi administrator untuk menambahkan domain ke Firebase Console.',
      suggestedAction: 'MANUAL_DOMAIN_ADD'
    };
  }
  
  // Configuration errors
  if (isConfigurationError(error)) {
    return {
      handled: false,
      message: 'Konfigurasi Firebase tidak valid. Periksa firebase-applet-config.json',
      suggestedAction: 'CHECK_CONFIG'
    };
  }
  
  // User cancelled popup
  if (errorCode === 'auth/popup-closed-by-user' || errorMsg.includes('popup-closed-by-user')) {
    return {
      handled: true,
      message: 'Pop-up login ditutup. Silakan coba lagi.'
    };
  }
  
  // Popup blocked by browser
  if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
    return {
      handled: false,
      message: 'Pop-up login diblokir oleh browser. Harap izinkan pop-up untuk domain ini.'
    };
  }
  
  // Operation not allowed
  if (errorCode === 'auth/operation-not-allowed') {
    return {
      handled: false,
      message: 'Google Sign-in belum diaktifkan di Firebase Console. Hubungi administrator.'
    };
  }
  
  // Network errors
  if (errorMsg.includes('network') || errorMsg.includes('offline')) {
    return {
      handled: false,
      message: 'Masalah koneksi jaringan. Periksa koneksi internet Anda.'
    };
  }
  
  // User exists but wrong password
  if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
    return {
      handled: false,
      message: 'Email atau password salah. Silakan coba lagi.'
    };
  }
  
  // User already exists
  if (errorCode === 'auth/email-already-in-use') {
    return {
      handled: false,
      message: 'Email sudah terdaftar. Silakan gunakan email lain.'
    };
  }
  
  return {
    handled: false,
    message: `Error: ${error?.message || 'Unknown error'}. Silakan hubungi support.`
  };
};
