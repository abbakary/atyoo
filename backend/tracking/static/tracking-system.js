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
        
        // Initialize data if first time
        if (localStorage.getItem('trackingSystem_customers') === null) {
            localStorage.setItem('trackingSystem_customers', JSON.stringify([
                {
                    id: 'CUST-001',
                    name: 'John Doe',
                    phone: '+256701234567',
                    email: 'john@example.com',
                    type: 'personal',
                    created: new Date().toISOString()
                },
                {
                    id: 'CUST-002', 
                    name: 'Jane Smith',
                    phone: '+256709876543',
                    email: 'jane@example.com',
                    type: 'company',
                    created: new Date().toISOString()
                }
            ]));
        }
        
        if (localStorage.getItem('trackingSystem_orders') === null) {
            localStorage.setItem('trackingSystem_orders', JSON.stringify([
                {
                    id: 'ORD-001',
                    customerId: 'CUST-001',
                    customerName: 'John Doe',
                    service: 'Tire Sales',
                    status: 'in-progress',
                    arrivalTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    estimatedDuration: 120,
                    created: new Date().toISOString()
                },
                {
                    id: 'ORD-002',
                    customerId: 'CUST-002',
                    customerName: 'Jane Smith',
                    service: 'Car Service',
                    status: 'completed',
                    arrivalTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                    departureTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    estimatedDuration: 180,
                    actualDuration: 175,
                    created: new Date().toISOString()
                }
            ]));
        }
    }

    // API endpoints
    const api = {
        createCustomer: function(customerData) {
            return fetch('/api/customers/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(customerData)
            })
            .then(response => response.json())
            .catch(error => {
                console.error('API Error:', error);
                return { success: false, error: 'Network error occurred' };
            });
        },
        
        searchCustomers: function(query) {
            return fetch(`/api/customers/search/?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .catch(error => {
                    console.error('API Error:', error);
                    return { success: false, error: 'Network error occurred' };
                });
        },
        
        createOrder: function(orderData) {
            return fetch('/api/orders/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(orderData)
            })
            .then(response => response.json())
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
                if (result.success) {
                    // Also store in localStorage for immediate frontend use
                    customers.save(result.customer);
                    utils.log('Customer created successfully: ' + result.customer.id);
                }
                return result;
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
                if (result.success) {
                    utils.log('Order created successfully: ' + result.order.orderNumber);
                }
                return result;
            });
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
        api: api
    };
})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TrackingSystem.init);
} else {
    TrackingSystem.init();
}