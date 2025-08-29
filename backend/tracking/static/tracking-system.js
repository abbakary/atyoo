/**
 * Tracking System Core JavaScript
 * Main application functionality and utilities
 */

var TrackingSystem = (function() {
    'use strict';

    // Application configuration
    const config = {
        version: '1.0.0',
        debug: true
    };

    // Utility functions
    const utils = {
        log: function(message) {
            if (config.debug) {
                console.log('[TrackingSystem] ' + message);
            }
        },
        
        formatDate: function(date) {
            return new Date(date).toLocaleString();
        },
        
        formatDuration: function(minutes) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
    };

    // Customer management
    const customers = {
        getAll: function() {
            return JSON.parse(localStorage.getItem('trackingSystem_customers') || '[]');
        },
        
        save: function(customer) {
            const customers = this.getAll();
            customers.push(customer);
            localStorage.setItem('trackingSystem_customers', JSON.stringify(customers));
        },
        
        findByPhone: function(phone) {
            return this.getAll().find(c => c.phone === phone);
        }
    };

    // Order management
    const orders = {
        getAll: function() {
            return JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        },
        
        save: function(order) {
            const orders = this.getAll();
            orders.push(order);
            localStorage.setItem('trackingSystem_orders', JSON.stringify(orders));
        },
        
        update: function(orderId, updates) {
            const orders = this.getAll();
            const index = orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                orders[index] = { ...orders[index], ...updates };
                localStorage.setItem('trackingSystem_orders', JSON.stringify(orders));
            }
        },
        
        getByStatus: function(status) {
            return this.getAll().filter(o => o.status === status);
        }
    };

    // Initialize the application
    function init() {
        utils.log('Tracking System initialized');
        // No mock/localStorage seeding. Data comes from backend APIs only.
    }

    // API endpoints
    const api = {
        _handleResponse: function(response){
            return response.text().then(text => {
                let data = {};
                try { data = text ? JSON.parse(text) : {}; } catch (e) {
                    return { success: false, error: 'Invalid server response' };
                }
                if (!response.ok) {
                    const msg = (data && (data.error || data.detail)) || `Request failed (${response.status})`;
                    return { success: false, error: msg };
                }
                return data;
            });
        },
        createCustomer: function(customerData) {
            return fetch('/api/customers/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(customerData)
            })
            .then(this._handleResponse)
            .catch(error => {
                console.error('API Error:', error);
                return { success: false, error: 'Network error occurred' };
            });
        },

        searchCustomers: function(query) {
            return fetch(`/api/customers/search/?q=${encodeURIComponent(query)}`, { credentials: 'same-origin' })
                .then(this._handleResponse)
                .catch(error => {
                    console.error('API Error:', error);
                    return { success: false, error: 'Network error occurred' };
                });
        },

        createOrder: function(orderData) {
            return fetch('/api/orders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(orderData)
            })
            .then(this._handleResponse)
            .catch(error => {
                console.error('API Error:', error);
                return { success: false, error: 'Network error occurred' };
            });
        }
    };

    // Get CSRF token for Django
    function getCsrfToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        // Fallback: try to get from meta tag
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    // Enhanced customer creation with backend integration
    function createCustomer(customerData) {
        utils.log('Creating customer: ' + customerData.name);
        
        // Validate required fields
        if (!customerData.name || !customerData.phone) {
            return Promise.resolve({ 
                success: false, 
                error: 'Name and phone number are required' 
            });
        }

        // Call the backend API
        return api.createCustomer(customerData)
            .then(result => {
                if (result && result.success && result.customer) {
                    utils.log('Customer created successfully: ' + result.customer.id);
                }
                return result || { success: false, error: 'Unknown error' };
            });
    }

    // Enhanced order creation with backend integration
    function createOrder(orderData) {
        utils.log('Creating order for customer: ' + orderData.customerId);
        
        // Validate required fields
        if (!orderData.customerId || !orderData.serviceType) {
            return Promise.resolve({ 
                success: false, 
                error: 'Customer ID and service type are required' 
            });
        }

        // Call the backend API
        return api.createOrder(orderData)
            .then(result => {
                if (result && result.success && result.order) {
                    utils.log('Order created successfully: ' + result.order.orderNumber);
                }
                return result || { success: false, error: 'Unknown error' };
            });
    }

    function getCustomerById(id){
        return fetch(`/api/customers/${encodeURIComponent(id)}/`)
            .then(r=>r.json())
            .then(res=>res.success ? res.customer : null)
            .catch(()=>null);
    }

    function searchCustomers(q){
        return api.searchCustomers(q);
    }

    async function getAnalytics(){
        try{
            const [summaryRes, ordersRes] = await Promise.all([
                fetch('/api/analytics/summary/').then(r=>r.json()),
                fetch('/api/orders/list/').then(r=>r.json())
            ]);
            const now = new Date();
            const last7 = [...Array(7)].map((_,i)=>{const d=new Date(now); d.setDate(now.getDate()- (6-i)); return d;});
            const orders = (ordersRes.success? ordersRes.results: []) || [];
            const dailyStats = last7.map(d=>{
                const dateStr = d.toDateString();
                const count = orders.filter(o=> new Date(o.arrivalTime||o.createdAt).toDateString()===dateStr).length;
                return { date: d.toISOString(), orders: count };
            });
            const serviceTypeStats = {};
            const breakdown = (summaryRes.success && summaryRes.data && summaryRes.data.serviceBreakdown) ? summaryRes.data.serviceBreakdown : [];
            breakdown.forEach(b=>{ serviceTypeStats[b.service_type] = b.count; });
            return {
                totalOrders: orders.length,
                inProgressOrders: (orders.filter(o=> o.status==='in-progress').length),
                completedToday: (orders.filter(o=> (o.status==='completed') && (o.departureTime||'').slice(0,10)===now.toISOString().slice(0,10)).length),
                totalCustomers: summaryRes.success && summaryRes.data ? (summaryRes.data.totalCustomers||0):0,
                serviceTypeStats,
                dailyStats
            };
        }catch(e){
            return { totalOrders:0,inProgressOrders:0,completedToday:0,totalCustomers:0,serviceTypeStats:{},dailyStats:[] };
        }
    }

    // Public API
    return {
        init: init,
        config: config,
        utils: utils,
        customers: customers,
        orders: orders,
        createCustomer: createCustomer,
        createOrder: createOrder,
        api: api,
        getCustomerById: getCustomerById,
        getAnalytics: getAnalytics,
        searchCustomers: searchCustomers
    };
})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TrackingSystem.init);
} else {
    TrackingSystem.init();
}
