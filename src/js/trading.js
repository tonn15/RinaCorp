let currentWidget = null;

const symbols = [{
    symbol: "FX:EURUSD",
    name: "EUR/USD"
}, {
    symbol: "FX:GBPUSD",
    name: "GBP/USD"
}, {
    symbol: "FX:XAUUSD",
    name: "XAU/USD (Gold)"
}];

function createTradingViewWidget(index) {
    const container = document.getElementById('tradingview-widget');
    container.innerHTML = ''; // Nettoyer l'ancien widget

    currentWidget = new TradingView.widget({
        "width": "100%",
        "height": "620",
        "symbol": symbols[index].symbol,
        "interval": "60",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "fr",
        "toolbar_bg": "#0b0b1e",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "save_image": false,
        "container_id": "tradingview-widget",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "studies": ["MASimple@tv-basicstudies"]
    });
}

function switchSymbol(index) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[index].classList.add('active');
    createTradingViewWidget(index);
}

// Initialisation
window.onload = () => {
    createTradingViewWidget(0);
};