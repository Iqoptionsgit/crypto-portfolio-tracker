const ETHERSCAN_API_KEY = 'STA7FYZ36UXRCN71B717V1N92NZ8ME969U'; // Replace with your real key
const ASSETS = [
    { name: 'ETH', id: 'ethereum', contract: '', decimals: 18 },
    { name: 'USDC', id: 'usd-coin', contract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 }
];
let historicalData = [];
let assetValues = []; // For charts

const CHAIN_ID = 11155111; // Sepolia
const BASE_URL = 'https://api.etherscan.io/v2/api'; // V2 unified endpoint

setInterval(updatePortfolio, 14400000); // Every 4 hours

document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('investorName');
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedName) document.getElementById('investorName').value = savedName;
    if (savedAddress) document.getElementById('walletAddress').value = savedAddress;
    if (savedAddress) updatePortfolio();
});

async function updatePortfolio() {
    const name = document.getElementById('investorName').value.trim();
    const address = document.getElementById('walletAddress').value.trim();
    
    if (!address) { alert('Enter wallet address.'); return; }
    
    localStorage.setItem('investorName', name);
    localStorage.setItem('walletAddress', address);
    
    document.getElementById('nameDisplay').textContent = name || 'Investor';
    document.getElementById('portfolioDisplay').classList.remove('hidden');
    
    let totalValue = 0;
    assetValues = [];
    const tbody = document.querySelector('#portfolioTable tbody');
    tbody.innerHTML = '';
    
    for (const asset of ASSETS) {
        try {
            let balance = 0;
            let url;
            if (asset.contract === '') {
                // ETH balance (V2: action=balance)
                url = `${BASE_URL}?chainid=${CHAIN_ID}&action=balance&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.status === '1') {
                    balance = parseFloat(data.result) / Math.pow(10, asset.decimals);
                } else {
                    console.error('ETH API Error:', data.message);
                    continue; // Skip on error
                }
            } else {
                // Token balance (V2: action=tokenbalance)
                url = `${BASE_URL}?chainid=${CHAIN_ID}&action=tokenbalance&address=${address}&contractaddress=${asset.contract}&apikey=${ETHERSCAN_API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.status === '1') {
                    balance = parseFloat(data.result) / Math.pow(10, asset.decimals);
                } else {
                    console.error('Token API Error:', data.message);
                    continue; // Skip on error
                }
            }
            
            const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${asset.id}&vs_currencies=usd`;
            const priceResponse = await fetch(priceUrl);
            const priceData = await priceResponse.json();
            const price = priceData[asset.id]?.usd || 0;
            
            const value = balance * price;
            totalValue += value;
            assetValues.push(value);
            
            const row = tbody.insertRow();
            row.insertCell(0).textContent = asset.name;
            row.insertCell(1).textContent = balance.toFixed(4);
            row.insertCell(2).textContent = price ? `$${price.toFixed(2)}` : '$0.00';
            row.insertCell(3).textContent = value ? `$${value.toFixed(2)}` : '$0.00';
            row.insertCell(4).textContent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) + '%' : '0%';
        } catch (error) {
            console.error(`Error for ${asset.name}:`, error);
        }
    }
    
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    
    historicalData.push({ date: new Date().toLocaleDateString(), value: totalValue });
    if (historicalData.length > 20) historicalData.shift();
    
    renderCharts();
}

function renderCharts() {
    // Pie Chart (skip if no values)
    const ctxPie = document.getElementById('allocationChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: ASSETS.map(a => a.name),
            datasets: [{ data: assetValues.length > 0 ? assetValues : [0, 0], backgroundColor: ['#FF6384', '#36A2EB'] }]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Allocation' } } }
    });
    
    // Line Chart
    const ctxLine = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: historicalData.map(d => d.date),
            datasets: [{ label: 'Value ($)', data: historicalData.map(d => d.value), borderColor: '#007BFF', fill: false }]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Performance' } } }
    });
}
