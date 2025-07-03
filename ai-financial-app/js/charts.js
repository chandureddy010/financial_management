// Chart Management System

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = CONFIG.CHART_COLORS;
        this.init();
    }
    
    init() {
        // Set Chart.js defaults
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#64748b';
        Chart.defaults.plugins.legend.display = true;
        Chart.defaults.plugins.legend.position = 'bottom';
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
    }
    
    // Create category spending chart
    createCategoryChart(canvasId, data, period = 'month') {
        const ctx = DOM.get(canvasId);
        if (!ctx) return null;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const chartData = this.prepareCategoryData(data, period);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.values,
                    backgroundColor: this.colors.slice(0, chartData.labels.length),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            generateLabels: (chart) => {
                                const data = chart.data;
                                const total = data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                                
                                return data.labels.map((label, index) => ({
                                    text: `${label}: ${NumberUtils.formatCurrency(data.datasets[0].data[index])} (${Math.round((data.datasets[0].data[index] / total) * 100)}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[index],
                                    strokeStyle: data.datasets[0].backgroundColor[index],
                                    pointStyle: 'circle',
                                    hidden: false,
                                    index: index
                                }));
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = NumberUtils.formatCurrency(context.parsed);
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        return this.charts[canvasId];
    }
    
    // Create income vs expense chart
    createIncomeExpenseChart(canvasId, data, period = 'year') {
        const ctx = DOM.get(canvasId);
        if (!ctx) return null;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const chartData = this.prepareIncomeExpenseData(data, period);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: chartData.income,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: chartData.expenses,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = NumberUtils.formatCurrency(context.parsed.y);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => NumberUtils.formatCurrency(value)
                        }
                    }
                }
            }
        });
        
        return this.charts[canvasId];
    }
    
    // Prepare category data for chart
    prepareCategoryData(transactions, period) {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        const filteredTransactions = transactions.filter(transaction => {
            const transDate = new Date(transaction.date);
            return transDate >= startDate && transaction.type === 'expense';
        });
        
        const categoryTotals = {};
        const categories = Storage.getCategories();
        
        filteredTransactions.forEach(transaction => {
            const category = categories.find(cat => cat.id === transaction.categoryId);
            const categoryName = category ? category.name : 'Others';
            
            if (!categoryTotals[categoryName]) {
                categoryTotals[categoryName] = 0;
            }
            categoryTotals[categoryName] += transaction.amount;
        });
        
        return {
            labels: Object.keys(categoryTotals),
            values: Object.values(categoryTotals)
        };
    }
    
    // Prepare income vs expense data
    prepareIncomeExpenseData(transactions, period) {
        const now = new Date();
        let months = 12;
        
        switch (period) {
            case '6months':
                months = 6;
                break;
            case 'year':
                months = 12;
                break;
            case '2years':
                months = 24;
                break;
        }
        
        const labels = [];
        const income = [];
        const expenses = [];
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            labels.push(monthName);
            
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthTransactions = transactions.filter(transaction => {
                const transDate = new Date(transaction.date);
                return transDate >= monthStart && transDate <= monthEnd;
            });
            
            const monthIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const monthExpenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            
            income.push(monthIncome);
            expenses.push(monthExpenses);
        }
        
        return { labels, income, expenses };
    }
    
    // Update chart data
    updateChart(canvasId, newData) {
        const chart = this.charts[canvasId];
        if (!chart) return;
        
        chart.data = newData;
        chart.update();
    }
    
    // Destroy chart
    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }
    
    // Destroy all charts
    destroyAllCharts() {
        Object.keys(this.charts).forEach(canvasId => {
            this.destroyChart(canvasId);
        });
    }
    
    // Get chart colors
    getColors(count) {
        return this.colors.slice(0, count);
    }
}

// Create global charts instance
const Charts = new ChartManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChartManager, Charts };
}