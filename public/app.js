const COLORS = [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#fca5a5', '#f87171', '#ef4444', '#dc2626'
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function createPolygon(points, fill, opacity = 0.85) {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    polygon.setAttribute('fill', fill);
    polygon.setAttribute('opacity', opacity);
    polygon.style.transition = 'opacity 0.3s ease';
    polygon.addEventListener('mouseenter', () => polygon.setAttribute('opacity', '1'));
    polygon.addEventListener('mouseleave', () => polygon.setAttribute('opacity', opacity));
    return polygon;
}

function createText(x, y, text, fontSize = 12, anchor = 'middle', fill = '#ffffff') {
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('fill', fill);
    textEl.setAttribute('font-size', fontSize);
    textEl.setAttribute('font-weight', '600');
    textEl.textContent = text;
    return textEl;
}

function processChurnData(rawData) {
    const maxStep = Math.max(...rawData);
    const counts = new Array(maxStep).fill(0);
    rawData.forEach(step => counts[step - 1]++);

    const total = rawData.length;
    let cumulative = total;

    return counts.map((count, index) => {
        const step = index + 1;
        const retentionRate = cumulative / total;
        const churnRate = count / total;
        const result = {
            step,
            label: `第${step}个视频`,
            count,
            cumulative,
            retentionRate,
            churnRate,
            percentageOfTotal: cumulative / total
        };
        cumulative -= count;
        return result;
    });
}

function generateFunnelSegments(funnelData, config) {
    const { width, height, topWidth, bottomWidth, paddingTop, paddingBottom, paddingLeft } = config;
    const totalChurn = funnelData.reduce((sum, d) => sum + d.churnRate, 0);

    let currentY = paddingTop;
    const segments = [];
    const drawableHeight = height - paddingTop - paddingBottom;
    const widthDiff = topWidth - bottomWidth;

    for (let i = 0; i < funnelData.length; i++) {
        const d = funnelData[i];
        const segmentHeight = (d.churnRate / totalChurn) * drawableHeight;

        const yTop = currentY;
        const yBottom = currentY + segmentHeight;

        const progressTop = (yTop - paddingTop) / drawableHeight;
        const progressBottom = (yBottom - paddingTop) / drawableHeight;

        const topSegmentWidth = topWidth - widthDiff * progressTop;
        const bottomSegmentWidth = topWidth - widthDiff * progressBottom;

        const leftTop = { x: paddingLeft + (topWidth - topSegmentWidth) / 2, y: yTop };
        const rightTop = { x: paddingLeft + (topWidth + topSegmentWidth) / 2, y: yTop };
        const leftBottom = { x: paddingLeft + (topWidth - bottomSegmentWidth) / 2, y: yBottom };
        const rightBottom = { x: paddingLeft + (topWidth + bottomSegmentWidth) / 2, y: yBottom };

        const centerX = paddingLeft + topWidth / 2;
        const centerY = yTop + segmentHeight / 2;

        segments.push({
            data: d,
            points: [leftTop, rightTop, rightBottom, leftBottom],
            centerX,
            centerY,
            height: segmentHeight
        });

        currentY = yBottom;
    }

    return segments;
}

function renderFunnel(funnelData) {
    const container = document.getElementById('funnel-content');
    const width = 600;
    const height = 500;
    const topWidth = 400;
    const bottomWidth = 80;
    const paddingTop = 30;
    const paddingBottom = 30;
    const paddingLeft = 20;
    const paddingRight = 180;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width + paddingRight} ${height}`);
    svg.setAttribute('class', 'funnel-svg');

    const segments = generateFunnelSegments(funnelData, {
        width, height, topWidth, bottomWidth, paddingTop, paddingBottom, paddingLeft
    });

    segments.forEach((segment, index) => {
        const color = COLORS[index % COLORS.length];
        const polygon = createPolygon(segment.points, color, 0.85);
        svg.appendChild(polygon);

        if (segment.height > 20) {
            svg.appendChild(createText(segment.centerX, segment.centerY - 5, segment.data.label, 11, 'middle', '#ffffff'));
            svg.appendChild(createText(segment.centerX, segment.centerY + 10, `${segment.data.count}人 (${(segment.data.churnRate * 100).toFixed(1)}%)`, 10, 'middle', '#ffffff'));
        }

        const labelX = paddingLeft + topWidth + 20;
        const labelY = segment.centerY;
        svg.appendChild(createText(labelX, labelY + 4, `${segment.data.label}: ${(segment.data.retentionRate * 100).toFixed(1)}%`, 11, 'start', '#e4e4e7'));
    });

    svg.appendChild(createText(paddingLeft + topWidth / 2, paddingTop - 10, `${funnelData[0].cumulative}人 (100%)`, 13, 'middle', '#f97316'));
    const lastY = height - paddingBottom + 20;
    const finalCount = funnelData[funnelData.length - 1].cumulative - funnelData[funnelData.length - 1].count;
    svg.appendChild(createText(paddingLeft + topWidth / 2, lastY, `最终留存: ${finalCount}人 (${(finalCount / funnelData[0].cumulative * 100).toFixed(1)}%)`, 13, 'middle', '#22c55e'));

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'funnel-wrapper';
    wrapper.appendChild(svg);
    wrapper.appendChild(createLegend(funnelData));
    container.appendChild(wrapper);
}

function createLegend(funnelData) {
    const legend = document.createElement('div');
    legend.className = 'funnel-legend';

    funnelData.forEach((d, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.background = COLORS[index % COLORS.length];

        const textDiv = document.createElement('div');
        textDiv.className = 'legend-text';

        const stepDiv = document.createElement('div');
        stepDiv.className = 'legend-step';
        stepDiv.textContent = d.label;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'legend-details';
        detailsDiv.innerHTML = `流失 <span class="churn-rate">${d.count}人</span> · 占比 ${(d.churnRate * 100).toFixed(1)}% · 留存 ${(d.retentionRate * 100).toFixed(1)}%`;

        textDiv.appendChild(stepDiv);
        textDiv.appendChild(detailsDiv);

        item.appendChild(colorBox);
        item.appendChild(textDiv);
        legend.appendChild(item);
    });

    return legend;
}

function renderStats(funnelData, rawData) {
    const statsContainer = document.getElementById('stats');
    const totalUsers = rawData.length;
    const totalChurn = funnelData.reduce((sum, d) => sum + d.count, 0);
    const finalRetention = funnelData[funnelData.length - 1].cumulative - funnelData[funnelData.length - 1].count;
    const retentionRate = (finalRetention / totalUsers) * 100;
    const avgWatchStep = rawData.reduce((sum, val) => sum + val, 0) / totalUsers;
    const maxChurnStep = funnelData.reduce((max, d) => d.churnRate > max.churnRate ? d : max, funnelData[0]);

    const stats = [
        { label: '总用户数', value: totalUsers.toLocaleString(), color: '#f97316' },
        { label: '最终留存', value: `${finalRetention.toLocaleString()}人 (${retentionRate.toFixed(1)}%)`, color: '#22c55e' },
        { label: '平均观看', value: `${avgWatchStep.toFixed(1)} 个视频`, color: '#3b82f6' },
        { label: '流失高峰', value: `${maxChurnStep.label} (${(maxChurnStep.churnRate * 100).toFixed(1)}%)`, color: '#ef4444' }
    ];

    statsContainer.innerHTML = stats.map(s => `
        <div class="stat-card">
            <div class="stat-value" style="color: ${s.color}">${s.value}</div>
            <div class="stat-label">${s.label}</div>
        </div>
    `).join('');
}

async function loadData() {
    const container = document.getElementById('funnel-content');
    container.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>正在加载数据...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/churn-data');
        const rawData = await response.json();
        const funnelData = processChurnData(rawData);
        renderStats(funnelData, rawData);
        renderFunnel(funnelData);
    } catch (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">数据加载失败: ${error.message}</div>`;
    }
}

loadData();
