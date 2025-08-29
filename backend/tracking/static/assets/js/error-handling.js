/**
 * Global Error Handling Utilities
 * Provides user-facing notifications and safe wrappers
 */
(function(){
  'use strict';

  function notify(type, message) {
    if (typeof Swal !== 'undefined') {
      const icon = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
      Swal.fire({
        text: message,
        icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } else {
      console[type === 'error' ? 'error' : 'log']('[Notify]', message);
    }
  }

  // Public helper
  window.showUserMessage = function(message, type){
    notify(type || 'info', message || '');
  };

  // Safe async wrapper
  window.safeAsync = async function(fn){
    try { return await fn(); }
    catch (err) {
      console.error(err);
      notify('error', 'Unexpected error occurred');
      return null;
    }
  };

  // Global error capture
  window.addEventListener('error', function(e){
    console.error('GlobalError:', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', function(e){
    console.error('UnhandledRejection:', e.reason);
  });
})();
