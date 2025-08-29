(function(){
  'use strict';

  const state = { all: [], filtered: [], current: null };
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function load(){
    state.all = TrackingSystem.getAllCustomers().map(c=>({ status:'active', ...c, customerType: normalizeType(c.customerType) }));
    applyFilters();
  }

  function applyFilters(){
    const q = $('#searchInput').value.trim().toLowerCase();
    const type = normalizeType($('#filterType').value);
    const status = $('#filterStatus').value;
    state.filtered = state.all.filter(c=>{
      const matchesQ = !q || [c.name,c.phone,c.email,c.id].some(v=> (v||'').toString().toLowerCase().includes(q));
      const matchesType = !type || c.customerType === type;
      const matchesStatus = !status || (c.status||'active') === status;
      return matchesQ && matchesType && matchesStatus;
    });
    renderTable();
  }

  function renderTable(){
    const tb = $('#customersTable tbody');
    tb.innerHTML = '';
    state.filtered.forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.name||''}</td>
        <td>${c.phone||''}</td>
        <td>${c.email||''}</td>
        <td class="text-capitalize">${c.customerType||''}</td>
        <td>${c.totalOrders||0}</td>
        <td>${c.lastVisit? new Date(c.lastVisit).toLocaleString(): ''}</td>
        <td><span class="badge ${badgeClass(c.status)} text-uppercase">${(c.status||'active')}</span></td>
        <td><button class="btn btn-sm btn-primary" data-id="${c.id}">View/Edit</button></td>
      `;
      tb.appendChild(tr);
    });
  }

  function badgeClass(status){
    switch((status||'active')){
      case 'vip': return 'badge-light-success';
      case 'inactive': return 'badge-light-secondary';
      case 'blacklisted': return 'badge-light-danger';
      default: return 'badge-light-primary';
    }
  }

  function openEdit(id){
    const c = state.all.find(x=>x.id===id); if(!c) return;
    state.current = c;
    $('#ec_name').value = c.name||'';
    $('#ec_phone').value = c.phone||'';
    $('#ec_email').value = c.email||'';
    $('#ec_address').value = c.address||'';
    $('#ec_type').value = c.customerType||'';
    $('#ec_status').value = (c.status||'active');
    $('#ec_notes').value = c.notes||'';
    $('#ec_created').textContent = c.createdAt? new Date(c.createdAt).toLocaleString(): '';
    $('#ec_updated').textContent = c.updatedAt? new Date(c.updatedAt).toLocaleString(): '';
    renderVehicles(c);
    renderOrders(c);
    const modal = new bootstrap.Modal($('#editCustomerModal'));
    modal.show();
  }

  function renderVehicles(c){
    const wrap = $('#ec_vehicles'); wrap.innerHTML = '';
    (c.vehicles||[]).forEach(v=>{
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `<div class='border rounded p-2 h-100'><div class='fw-semibold'>${v.plateNumber||''}</div><div class='text-muted small'>${[v.make,v.model].filter(Boolean).join(' ')}</div><div class='text-muted small'>${v.vehicleType||''}</div></div>`;
      wrap.appendChild(col);
    });
  }

  function renderOrders(c){
    const tb = $('#ec_orders tbody'); tb.innerHTML = '';
    const orders = TrackingSystem.getOrdersByCustomer(c.id);
    orders.forEach(o=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.orderNumber}</td>
        <td class='text-capitalize'>${o.serviceType}</td>
        <td>
          <select class='form-select form-select-sm' data-order='${o.id}'>
            ${orderOptions(o.status)}
          </select>
        </td>
        <td>${new Date(o.arrivalTime).toLocaleString()}</td>
        <td><button class='btn btn-sm btn-outline-secondary' data-view='${o.id}'>History</button></td>
      `;
      tb.appendChild(tr);
    });
  }

  function orderOptions(cur){
    const statuses = ['created','assigned','in-progress','completed','cancelled'];
    return statuses.map(s=>`<option value='${s}' ${s===cur?'selected':''}>${s}</option>`).join('');
  }

  function saveCustomer(){
    if(!state.current) return;
    const payload = {
      name: $('#ec_name').value.trim(),
      phone: $('#ec_phone').value.trim(),
      email: $('#ec_email').value.trim(),
      address: $('#ec_address').value.trim(),
      customerType: $('#ec_type').value,
      status: $('#ec_status').value,
      notes: $('#ec_notes').value.trim()
    };
    const res = TrackingSystem.updateCustomer(state.current.id, payload);
    if(res.success){
      load();
      openEdit(state.current.id); // refresh modal with updated data
    } else {
      alert(res.error||'Failed to update');
    }
  }

  function exportCSV(){
    const headers = ['ID','Name','Phone','Email','Type','Status','Total Orders','Last Visit'];
    const rows = state.filtered.map(c=>[
      c.id,c.name,c.phone,c.email,c.customerType,(c.status||'active'),(c.totalOrders||0),(c.lastVisit? new Date(c.lastVisit).toISOString(): '')
    ]);
    const csv = [headers, ...rows].map(r=> r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='customers.csv'; a.click();
  }

  function normalizeType(t){
    if(!t) return '';
    const x = String(t).toLowerCase();
    if(x==='business') return 'company';
    if(x==='boda-boda' || x==='boda' || x==='boda_boda') return 'bodaboda';
    return x;
  }

  // Events
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-id]'); if(btn){ openEdit(btn.getAttribute('data-id')); }
    const view = e.target.closest('button[data-view]'); if(view){ const id=view.getAttribute('data-view'); const o = TrackingSystem.getOrderById(id); if(o){ alert((o.statusHistory||[]).map(h=>`${h.timestamp}: ${h.status}${h.notes? ' - '+h.notes:''}`).join('\n')); } }
  });
  document.addEventListener('change', (e)=>{
    const sel = e.target.closest('select[data-order]'); if(sel){ const id=sel.getAttribute('data-order'); const st=sel.value; const r=TrackingSystem.updateOrderStatus(id, st); if(!r.success){ alert(r.error||'Failed'); }}
  });
  $('#searchInput').addEventListener('input', applyFilters);
  $('#filterType').addEventListener('change', applyFilters);
  $('#filterStatus').addEventListener('change', applyFilters);
  $('#resetFilters').addEventListener('click', ()=>{ $('#searchInput').value=''; $('#filterType').value=''; $('#filterStatus').value=''; applyFilters(); });
  $('#exportCsv').addEventListener('click', exportCSV);
  $('#ec_save').addEventListener('click', saveCustomer);
  $('#ec_addVehicle').addEventListener('click', ()=>{
    if(!state.current) return;
    const plate = prompt('Plate number'); if(!plate) return;
    const make = prompt('Make')||''; const model=prompt('Model')||''; const type=prompt('Vehicle type')||'';
    const c = TrackingSystem.getCustomerById(state.current.id);
    const vehicles = (c.vehicles||[]).concat([{plateNumber:plate, make, model, vehicleType:type}]);
    const res = TrackingSystem.updateCustomer(state.current.id, { vehicles });
    if(res.success){ load(); openEdit(state.current.id);} else { alert(res.error||'Failed to add vehicle'); }
  });

  // Init
  load();
})();
