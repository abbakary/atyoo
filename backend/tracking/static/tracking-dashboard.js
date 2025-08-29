/**
 * Tracking System Dashboard
 * Handles all dashboard functionality including charts, statistics, and real-time updates
 */

var TrackingDashboard = (function() {
    'use strict';

    // Private variables
    let charts = {};
    let updateInterval;
    let realtimeData = {
        totalCustomers: 0,
        activeOrders: 0,
        completedToday: 0,
        inProgress: 0
    };

    // Sample data for demonstration
    const sampleData = {
        customers: [
            { id: 1, name: 'John Doe', phone: '+256701234567', email: 'john@email.com', type: 'personal' },
            { id: 2, name: 'Jane Smith', phone: '+256709876543', email: 'jane@email.com', type: 'business' },
            { id: 3, name: 'Bob Wilson', phone: '+256705555555', email: 'bob@email.com', type: 'personal' }
        ],
        orders: [
            {
                id: 'ORD-001',
                customerId: 1,
                customerName: 'John Doe',
                service: 'Tire Sales',
                status: 'in-progress',
                arrivalTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                estimatedDuration: '2hr'
            },
            {
                id: 'ORD-002',
                customerId: 2,
                customerName: 'Jane Smith',
                service: 'Car Service',
                status: 'completed',
                arrivalTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                departureTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                estimatedDuration: '3hr'
            }
        ]
    };

    // Initialize dashboard
    function init() {
        console.log('Initializing Tracking Dashboard...');
        
        initializeData();
        updateStatistics();
        
        // Initialize charts with delay to ensure ApexCharts is loaded
        setTimeout(function() {
            if (typeof ApexCharts !== 'undefined') {
                initializeCharts();
            } else {
                loadApexCharts();
            }
        }, 1000);
        
        loadRecentActivities();
        startRealTimeUpdates();
        bindEvents();
    }

    // Load ApexCharts if not available
    function loadApexCharts() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@latest';
        script.onload = function() {
            console.log('ApexCharts loaded successfully');
            initializeCharts();
        };
        script.onerror = function() {
            console.error('Failed to load ApexCharts');
        };
        document.head.appendChild(script);
    }

    // Initialize sample data in localStorage if not exists
    function initializeData() {
        if (!localStorage.getItem('trackingSystem_customers')) {
            localStorage.setItem('trackingSystem_customers', JSON.stringify(sampleData.customers));
        }
        if (!localStorage.getItem('trackingSystem_orders')) {
            localStorage.setItem('trackingSystem_orders', JSON.stringify(sampleData.orders));
        }
    }

    // Update statistics cards
    function updateStatistics() {
        // Fetch real data from Django API
        fetch('/api/analytics/summary/')
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    const data = result.data;
                    
                    realtimeData = {
                        totalCustomers: data.totalCustomers || 0,
                        activeOrders: data.activeOrders || 0,
                        completedToday: data.completedToday || 0,
                        arrivalsToday: data.arrivalsToday || 0,
                        avgWaitMinutes: data.avgWaitMinutes || 0
                    };

                    // Update main stat cards
                    updateCounter('#totalCustomers', realtimeData.totalCustomers);
                    updateCounter('#pendingOrders', realtimeData.activeOrders);
                    updateCounter('#completedToday', realtimeData.completedToday);
                    updateCounter('#inProgress', realtimeData.activeOrders);
                    
                    // Update live dashboard stats
                    updateCounter('#liveCustomersToday', realtimeData.arrivalsToday);
                    updateCounter('#liveActiveOrders', realtimeData.activeOrders);
                    updateCounter('#liveCompletedToday', realtimeData.completedToday);
                    updateElement('#liveAvgWaitTime', realtimeData.avgWaitMinutes + 'm');
                    
                    // Update service breakdown if available
                    if (data.serviceBreakdown) {
                        updateServiceBreakdown(data.serviceBreakdown);
                    }
                    
                    // Update charts with new data
                    updateChartsWithNewData(data);
                }
            })
            .catch(error => {
                console.error('Error fetching dashboard data:', error);
                // Fallback to default values
                realtimeData = {
                    totalCustomers: 0,
                    activeOrders: 0,
                    completedToday: 0,
                    arrivalsToday: 0,
                    avgWaitMinutes: 0
                };
                updateCounter('#totalCustomers', 0);
                updateCounter('#pendingOrders', 0);
                updateCounter('#completedToday', 0);
                updateCounter('#inProgress', 0);
                updateCounter('#liveCustomersToday', 0);
                updateCounter('#liveActiveOrders', 0);
                updateCounter('#liveCompletedToday', 0);
                updateElement('#liveAvgWaitTime', '0m');
            });
    }

    // Update counter with animation
    function updateCounter(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    // Update element content
    function updateElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    // Update service breakdown display
    function updateServiceBreakdown(serviceBreakdown) {
        // Reset all counters first
        updateCounter('#carServiceCount', 0);
        updateCounter('#tireSalesCount', 0);
        updateCounter('#consultationCount', 0);
        
        // Update with actual data
        serviceBreakdown.forEach(item => {
            const serviceType = item.service_type.toLowerCase();
            if (serviceType.includes('car') || serviceType.includes('service')) {
                updateCounter('#carServiceCount', item.count);
            } else if (serviceType.includes('tire')) {
                updateCounter('#tireSalesCount', item.count);
            } else if (serviceType.includes('consultation')) {
                updateCounter('#consultationCount', item.count);
            }
        });
    }

    // Update charts with new data structure
    function updateChartsWithNewData(data) {
        // For now, just call the existing updateCharts function with adapted data
        const adaptedData = {
            service_breakdown: data.serviceBreakdown || [],
            stats: {
                total_customers: data.totalCustomers,
                active_orders: data.activeOrders,
                completed_today: data.completedToday,
                in_progress: data.activeOrders
            }
        };
        
        updateCharts(adaptedData);
    }

    // Initialize all charts
    function initializeCharts() {
        if (typeof ApexCharts === 'undefined') {
            console.error('ApexCharts is not available');
            return;
        }
        
        try {
            initDailyOrdersChart();
            initOrderStatusChart();
            initServiceTypesChart();
            initAverageDurationChart();
            console.log('All charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    // Daily Orders Overview Chart
    function initDailyOrdersChart() {
        const element = document.querySelector('#dailyOrdersChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const last7Days = getLast7Days();
        const dailyData = last7Days.map(date => {
            const dayOrders = orders.filter(order => 
                new Date(order.arrivalTime).toDateString() === date.toDateString()
            );
            return dayOrders.length;
        });

        const options = {
            series: [{
                name: 'Orders',
                data: dailyData
            }],
            chart: {
                type: 'area',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#007bff'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.9,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            xaxis: {
                categories: last7Days.map(date => date.toLocaleDateString('en-US', { weekday: 'short' }))
            },
            yaxis: {
                min: 0
            },
            tooltip: {
                y: {
                    formatter: function(val) {
                        return val + ' orders';
                    }
                }
            }
        };

        charts.dailyOrders = new ApexCharts(element, options);
        charts.dailyOrders.render();
    }

    // Order Status Distribution Chart
    function initOrderStatusChart() {
        const element = document.querySelector('#orderStatusChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const statusCounts = {
            pending: 0,
            'in-progress': 0,
            'service-complete': 0,
            'ready-for-departure': 0,
            completed: 0,
            cancelled: 0
        };

        orders.forEach(order => {
            if (statusCounts.hasOwnProperty(order.status)) {
                statusCounts[order.status]++;
            }
        });

        const options = {
            series: Object.values(statusCounts),
            chart: {
                type: 'donut',
                height: 350
            },
            labels: ['Pending', 'In Progress', 'Service Complete', 'Ready for Departure', 'Completed', 'Cancelled'],
            colors: ['#ffc107', '#17a2b8', '#fd7e14', '#20c997', '#28a745', '#dc3545'],
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };

        charts.orderStatus = new ApexCharts(element, options);
        charts.orderStatus.render();
    }

    // Service Types Performance Chart
    function initServiceTypesChart() {
        const element = document.querySelector('#serviceTypesChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const serviceTypes = {
            'Tire Sales': 0,
            'Car Service': 0,
            'General Inquiry': 0
        };

        orders.forEach(order => {
            const service = order.service || 'General Inquiry';
            if (serviceTypes.hasOwnProperty(service)) {
                serviceTypes[service]++;
            }
        });

        const options = {
            series: [{
                data: Object.entries(serviceTypes).map(([service, count]) => ({
                    x: service,
                    y: count
                }))
            }],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#007bff', '#28a745', '#ffc107'],
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true
                }
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            }
        };

        charts.serviceTypes = new ApexCharts(element, options);
        charts.serviceTypes.render();
    }

    // Average Service Duration Chart
    function initAverageDurationChart() {
        const element = document.querySelector('#averageDurationChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const completedOrders = orders.filter(order => order.status === 'completed' && order.departureTime);
        
        const durationData = completedOrders.map(order => {
            const arrival = new Date(order.arrivalTime);
            const departure = new Date(order.departureTime);
            const duration = (departure - arrival) / (1000 * 60 * 60); // hours
            return {
                service: order.service,
                duration: Math.round(duration * 10) / 10
            };
        });

        const avgByService = {};
        durationData.forEach(item => {
            if (!avgByService[item.service]) {
                avgByService[item.service] = { total: 0, count: 0 };
            }
            avgByService[item.service].total += item.duration;
            avgByService[item.service].count++;
        });

        const chartData = Object.entries(avgByService).map(([service, data]) => ({
            x: service,
            y: Math.round((data.total / data.count) * 10) / 10
        }));

        // Add default data if no completed orders
        if (chartData.length === 0) {
            chartData.push(
                { x: 'Tire Sales', y: 1.5 },
                { x: 'Car Service', y: 2.5 },
                { x: 'General Inquiry', y: 0.5 }
            );
        }

        const options = {
            series: [{
                name: 'Average Duration (hours)',
                data: chartData
            }],
            chart: {
                type: 'column',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#28a745'],
            dataLabels: {
                enabled: true,
                formatter: function(val) {
                    return val + 'h';
                }
            },
            xaxis: {
                type: 'category'
            },
            yaxis: {
                title: {
                    text: 'Hours'
                }
            }
        };

        charts.averageDuration = new ApexCharts(element, options);
        charts.averageDuration.render();
    }

    // Get last 7 days
    function getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    // Update charts with API data
    function updateCharts(data) {
        // Update daily orders chart
        if (charts.dailyOrders && data.daily_orders) {
            const categories = data.daily_orders.map(item => 
                new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
            );
            const values = data.daily_orders.map(item => item.count);
            
            charts.dailyOrders.updateSeries([{
                name: 'Orders',
                data: values
            }]);
            charts.dailyOrders.updateOptions({
                xaxis: { categories: categories }
            });
        }
        
        // Update order status chart
        if (charts.orderStatus) {
            const stats = data.stats || {};
            const series = [
                stats.in_progress || 0,
                (stats.active_orders || 0) - (stats.in_progress || 0),
                stats.completed_today || 0
            ];
            charts.orderStatus.updateSeries(series);
        }
        
        // Update service types chart
        if (charts.serviceTypes && data.service_breakdown) {
            const categories = data.service_breakdown.map(item => item.service_type);
            const values = data.service_breakdown.map(item => item.count);
            
            charts.serviceTypes.updateSeries([{
                name: 'Orders',
                data: values
            }]);
            charts.serviceTypes.updateOptions({
                xaxis: { categories: categories }
            });
        }
    }

    function updateRecentActivity(activities) {
        const activityElement = document.querySelector('#recentActivityList');
        if (!activityElement) return;
        
        if (activities.length === 0) {
            activityElement.innerHTML = `
                <div class="activity-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">No recent activity</h6>
                            <p class="mb-0 text-muted">Activity will appear here as customers arrive and orders are processed</p>
                        </div>
                        <div class="text-muted">
                            <small>System ready</small>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        const activityHtml = activities.map(activity => {
            const timeAgo = getTimeAgo(new Date(activity.arrival_time));
            const statusClass = {
                'created': 'text-warning',
                'in-progress': 'text-info',
                'completed': 'text-success'
            }[activity.status] || 'text-muted';
            
            return `
                <div class="activity-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${activity.customer_name}</h6>
                            <p class="mb-0 text-muted">${activity.service}</p>
                        </div>
                        <div class="${statusClass}">
                            <small>${timeAgo}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        activityElement.innerHTML = activityHtml;
    }

    // Load recent activities - now just calls updateStatistics to refresh via API
    function loadRecentActivities() {
        updateStatistics(); // This will call the API and update everything
    }

    // Helper functions
    function getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' minutes ago';
        if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + ' hours ago';
        return Math.floor(diffInSeconds / 86400) + ' days ago';
    }

    function getWaitTime(arrivalTime) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - arrivalTime) / 1000);
        
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' minutes';
        return Math.floor(diffInSeconds / 3600) + ' hours ' + Math.floor((diffInSeconds % 3600) / 60) + ' minutes';
    }

    function startRealTimeUpdates() {
        updateInterval = setInterval(() => {
            updateStatistics();
            loadRecentActivities();
            updateNotifications();
        }, 30000); // Update every 30 seconds
    }

    function updateNotifications() {
        // Implementation for notifications
    }

    function bindEvents() {
        // Event bindings
    }

    function cleanup() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }

    // Global function for refresh button
    window.refreshRecentActivity = function() {
        loadRecentActivities();
    };

    // Public API
    return {
        init: init,
        cleanup: cleanup,
        updateStatistics: updateStatistics,
        refresh: loadRecentActivities
    };
})();