/*
 * Tracking System Core JavaScript
 * Main application functionality and utilities
 */

var TrackingSystem = (function() {
    'use strict';

    // Application configuration
    const config = { version: '1.0.1', debug: true };

    // Internal caches backed by localStorage so synchronous reads are possible for UI scripts
    const STORAGE = {
        customers: 'trackingSystem_customers',
        orders: 'trackingSystem_orders'
    };

    function read(key, fallback){
        try { return JSON.parse(localStorage.getItem(key) || fallback); } catch { return JSON.parse(fallback); }
    }
    function write(key, data){ try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
    }

    // Utility functions
    const utils = {
        log(msg){ if (config.debug) console.log('[TrackingSystem] ' + msg); },
        formatDate(date){ return new Date(date).toLocaleString(); },
        formatDuration(minutes){ const h=Math.floor(minutes/60), m=minutes%60; return h>0? `${h}h ${m}m`:`${m}m`; }
    };

    // Customers (minimal cache helpers for list pages)
    function cacheCustomers(list){ if(Array.isArray(list)) write(STORAGE.customers, list); }
    function getCustomerByIdSync(id){ return read(STORAGE.customers,'[]').find(c=>c.id===id) || null; }

    // Orders cache helpers used by list/tracking pages
    function cacheOrders(list){ if(Array.isArray(list)) write(STORAGE.orders, normalizeOrders(list)); }
    function normalizeOrders(list){
        return list.map(o=>({
            id: o.id,
            orderNumber: o.orderNumber,
            customerId: o.customerId,
            serviceType: o.serviceType,
            orderType: o.orderType,
            status: o.status,
            priority: o.priority || 'normal',
            arrivalTime: o.arrivalTime,
            createdAt: o.createdAt,
            departureTime: o.departureTime || null,
            notes: o.description || ''
        }));
    }

    // Public synchronous getters (use local cache). Pages can call sync* to refresh
    function getAllOrders(){ return read(STORAGE.orders,'[]'); }
    function getOrderById(id){ return getAllOrders().find(o=>o.id===id) || null; }

    // Network API
    function getCsrfToken(){
        const cookies=(document.cookie||'').split(';');
        for (let cookie of cookies){ const [n,v]=cookie.trim().split('='); if(n==='csrftoken') return v; }
        const meta=document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    const api = {
        createCustomer(customerData){
            return fetch('/api/customers/', { method:'POST', headers:{ 'Content-Type':'application/json','X-CSRFToken':getCsrfToken() }, body:JSON.stringify(customerData) })
                .then(r=>r.json())
                .then(res=>{ if(res && res.success && res.customer){
                    // Merge minimal cache for quick lookups
                    const all = read(STORAGE.customers,'[]');
                    if(!all.find(c=>c.id===res.customer.id)) { all.unshift(res.customer); write(STORAGE.customers, all.slice(0,500)); }
                }
                return res; });
        },
        searchCustomers(query){ return fetch(`/api/customers/search/?q=${encodeURIComponent(query)}`).then(r=>r.json()).then(res=>{ if(res && res.success){ cacheCustomers(res.results||[]); } return res; }); },
        createOrder(orderData){
            return fetch('/api/orders/', { method:'POST', headers:{ 'Content-Type':'application/json','X-CSRFToken':getCsrfToken() }, body:JSON.stringify(orderData) })
                .then(r=>r.json())
                .then(res=>{ if(res && res.success && res.order){
                    const all = getAllOrders(); all.unshift(normalizeOrders([res.order])[0]); write(STORAGE.orders, all.slice(0,500)); }
                    return res; });
        },
        listOrders(){ return fetch('/api/orders/list/').then(r=>r.json()).then(res=>{ if(res && res.success){ cacheOrders(res.results||[]); } return res; }); },
        updateOrderStatus(orderId, status){
            return fetch(`/api/orders/${encodeURIComponent(orderId)}/status/`, { method:'POST', headers:{ 'Content-Type':'application/json','X-CSRFToken':getCsrfToken() }, body:JSON.stringify({status}) })
                .then(r=>r.json())
                .then(res=>{ if(res && res.success && res.order){
                    const all=getAllOrders(); const idx=all.findIndex(o=>o.id===orderId); const updated=normalizeOrders([res.order])[0]; if(idx>-1){ all[idx]=updated; } else { all.unshift(updated);} write(STORAGE.orders, all); }
                    return res; });
        }
    };

    // Convenience async helpers for pages
    async function syncOrders(){ const res = await api.listOrders(); return res.success ? getAllOrders() : []; }
    async function syncCustomers(q){ const res = await api.searchCustomers(q||''); return res.success ? read(STORAGE.customers,'[]') : []; }

    // Backwards-compat public API
    return {
        init(){ utils.log('Tracking System initialized'); },
        utils,
        getAnalytics: async function(){
            try{ const [summary, list] = await Promise.all([ fetch('/api/analytics/summary/').then(r=>r.json()), api.listOrders() ]);
                const now=new Date(); const last7=[...Array(7)].map((_,i)=>{const d=new Date(now); d.setDate(now.getDate()-(6-i)); return d;});
                const orders=getAllOrders(); const dailyStats=last7.map(d=>({ date:d.toISOString(), orders: orders.filter(o=> new Date(o.arrivalTime||o.createdAt).toDateString()===d.toDateString()).length }));
                const serviceTypeStats={}; const breakdown=(summary.success && summary.data && summary.data.serviceBreakdown)? summary.data.serviceBreakdown:[]; breakdown.forEach(b=>{serviceTypeStats[b.service_type]=b.count;});
                return { totalOrders:orders.length, inProgressOrders: orders.filter(o=>o.status==='in-progress').length, completedToday: orders.filter(o=> (o.status==='completed') && (o.departureTime||'').slice(0,10)===now.toISOString().slice(0,10)).length, totalCustomers: summary.success && summary.data ? (summary.data.totalCustomers||0):0, serviceTypeStats, dailyStats };
            }catch(e){ return { totalOrders:0,inProgressOrders:0,completedToday:0,totalCustomers:0,serviceTypeStats:{},dailyStats:[] }; }
        },
        // Customers
        getCustomerById(id){ return fetch(`/api/customers/${encodeURIComponent(id)}/`).then(r=>r.json()).then(res=>res.success? res.customer : null).catch(()=>getCustomerByIdSync(id)); },
        searchCustomers: api.searchCustomers,
        createCustomer: api.createCustomer,
        // Orders
        createOrder: api.createOrder,
        getAllOrders,
        getOrderById,
        updateOrderStatus: function(orderId, status){ return api.updateOrderStatus(orderId, status); },
        syncOrders,
        syncCustomers
    };
})();
