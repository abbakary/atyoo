(function(){
  'use strict';
  function toast(msg,type){ try{ if(window.Swal){ Swal.fire({toast:true,position:'top-end',timer:2500,showConfirmButton:false,icon:type||'info',title:msg}); return; } }catch(e){}
    alert(msg);
  }
  window.showUserMessage = function(message, type){ toast(message, type==='error'?'error': (type==='warning'?'warning':'success')); };
})();
