const COLORS = [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#fca5a5', '#f87171', '#ef4444', '#dc2626'
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function createPolygon(points, fill, opacity = 0.85, className = '') {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    polygon.setAttribute('fill', fill);
    polygon.setAttribute('opacity', opacity);
    if (className) polygon.setAttribute('class', className);
    polygon.addEventListener('mouseenter', () => polygon.setAttribute('opacity', '1'));
    polygon.addEventListener('mouseleave', () => polygon.setAttribute('opacity', opacity));
    return polygon;
}

function createText(x, y, text, fontSize = 12, anchor = 'middle', fill = '#ffffff', className = '') {
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('fill', fill);
    textEl.setAttribute('font-size', fontSize);
    textEl.setAttribute('font-weight', '600');
    if (className) textEl.setAttribute('class', className);
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
    const totalUsers = funnelData[0].cumulative;
    const drawableHeight = height - paddingTop - paddingBottom;
    const widthDiff = topWidth - bottomWidth;

    const finalRetention = funnelData[funnelData.length - 1].cumulative - funnelData[funnelData.length - 1].count;
    const finalRetentionRate = finalRetention / totalUsers;

    let currentY = paddingTop;
    const segments = [];

    for (let i = 0; i < funnelData.length; i++) {
        const d = funnelData[i];
        const segmentHeight = d.churnRate * drawableHeight;

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
        const centerY = segmentHeight > 0 ? yTop + segmentHeight / 2 : yTop;

        segments.push({
            type: 'churn',
            data: d,
            points: [leftTop, rightTop, rightBottom, leftBottom],
            centerX,
            centerY,
            height: segmentHeight,
            color: COLORS[i % COLORS.length]
        });

        currentY = yBottom;
    }

    if (finalRetentionRate > 0.001) {
        const retentionHeight = finalRetentionRate * drawableHeight;
        const yTop = currentY;
        const yBottom = currentY + retentionHeight;
        const progressTop = (yTop - paddingTop) / drawableHeight;
        const progressBottom = (yBottom - paddingTop) / drawableHeight;

        const topSegmentWidth = topWidth - widthDiff * progressTop;
        const bottomSegmentWidth = topWidth - widthDiff * progressBottom;

        const leftTop = { x: paddingLeft + (topWidth - topSegmentWidth) / 2, y: yTop };
        const rightTop = { x: paddingLeft + (topWidth + topSegmentWidth) / 2, y: yTop };
        const leftBottom = { x: paddingLeft + (topWidth - bottomSegmentWidth) / 2, y: yBottom };
        const rightBottom = { x: paddingLeft + (topWidth + bottomSegmentWidth) / 2, y: yBottom };

        const centerX = paddingLeft + topWidth / 2;
        const centerY = yTop + retentionHeight / 2;

        segments.push({
            type: 'retention',
            data: { label: '最终留存', count: finalRetention, retentionRate: finalRetentionRate, churnRate: 0 },
            points: [leftTop, rightTop, rightBottom, leftBottom],
            centerX,
            centerY,
            height: retentionHeight,
            color: '#22c55e'
        });
    }

    return segments;
}

function renderFunnel(funnelData) {
    const container = document.getElementById('funnel-content');
    const width = 600;
    const height = 500;
    const topWidth = 400;
    const bottomWidth = 80;
    const paddingTop = 40;
    const paddingBottom = 30;
    const paddingLeft = 20;
    const paddingRight = 200;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width + paddingRight} ${height}`);
    svg.setAttribute('class', 'funnel-svg');

    const segments = generateFunnelSegments(funnelData, {
        width, height, topWidth, bottomWidth, paddingTop, paddingBottom, paddingLeft
    });

    svg.appendChild(createText(paddingLeft + topWidth / 2, paddingTop - 15, `${funnelData[0].cumulative}人 (100%)`, 13, 'middle', '#f97316', 'funnel-text'));

    let churnSegments = segments.filter(s => s.type === 'churn');

    churnSegments.forEach((segment, index) => {
        const polygon = createPolygon(segment.points, segment.color, 0.85, 'funnel-segment');
        svg.appendChild(polygon);

        if (segment.height > 25) {
            svg.appendChild(createText(
                segment.centerX,
                segment.centerY - 4,
                segment.data.label,
                11, 'middle', '#ffffff', 'funnel-text'
            ));
            svg.appendChild(createText(
                segment.centerX,
                segment.centerY + 10,
                `${segment.data.count}人 (${(segment.data.churnRate * 100).toFixed(1)}%)`,
                10, 'middle', 'rgba(255,255,255,0.9)', 'funnel-text'
            ));
        } else if (segment.height > 15) {
            svg.appendChild(createText(
                segment.centerX,
                segment.centerY + 3,
                `${segment.data.count}人`,
                9, 'middle', '#ffffff', 'funnel-text'
            ));
        }
    });

    const retentionSegment = segments.find(s => s.type === 'retention');
    if (retentionSegment) {
        const polygon = createPolygon(retentionSegment.points, retentionSegment.color, 0.85, 'funnel-segment');
        svg.appendChild(polygon);

        if (retentionSegment.height > 25) {
            svg.appendChild(createText(
                retentionSegment.centerX,
                retentionSegment.centerY - 4,
                retentionSegment.data.label,
                11, 'middle', '#ffffff', 'funnel-text'
            ));
            svg.appendChild(createText(
                retentionSegment.centerX,
                retentionSegment.centerY + 10,
                `${retentionSegment.data.count}人 (${(retentionSegment.data.retentionRate * 100).toFixed(1)}%)`,
                10, 'middle', 'rgba(255,255,255,0.9)', 'funnel-text'
            ));
        }
    }

    churnSegments.forEach((segment, index) => {
        const labelX = paddingLeft + topWidth + 20;
        const labelY = segment.centerY;

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', labelX);
        rect.setAttribute('y', labelY - 6);
        rect.setAttribute('width', 12);
        rect.setAttribute('height', 12);
        rect.setAttribute('fill', segment.color);
        rect.setAttribute('rx', 2);
        svg.appendChild(rect);

        svg.appendChild(createText(
            labelX + 18,
            labelY + 4,
            `${segment.data.label}: ${(segment.data.retentionRate * 100).toFixed(1)}% → ${(segment.data.churnRate * 100).toFixed(1)}%`,
            10, 'start', '#e4e4e7', 'funnel-text'
        ));
    });

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

    const totalUsers = funnelData[0].cumulative;
    const finalRetention = funnelData[funnelData.length - 1].cumulative - funnelData[funnelData.length - 1].count;

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
        detailsDiv.innerHTML = `流失 <span class="churn-rate">${d.count}人</span> · 占比 <strong>${(d.churnRate * 100).toFixed(1)}%</strong> · 留存 ${(d.retentionRate * 100).toFixed(1)}%`;

        textDiv.appendChild(stepDiv);
        textDiv.appendChild(detailsDiv);

        item.appendChild(colorBox);
        item.appendChild(textDiv);
        legend.appendChild(item);
    });

    const retentionItem = document.createElement('div');
    retentionItem.className = 'legend-item';
    retentionItem.style.borderTop = '1px solid rgba(255,255,255,0.1)';
    retentionItem.style.marginTop = '8px';
    retentionItem.style.paddingTop = '16px';

    const retentionColorBox = document.createElement('div');
    retentionColorBox.className = 'legend-color';
    retentionColorBox.style.background = '#22c55e';

    const retentionTextDiv = document.createElement('div');
    retentionTextDiv.className = 'legend-text';

    const retentionStepDiv = document.createElement('div');
    retentionStepDiv.className = 'legend-step';
    retentionStepDiv.style.color = '#22c55e';
    retentionStepDiv.textContent = '最终留存';

    const retentionDetailsDiv = document.createElement('div');
    retentionDetailsDiv.className = 'legend-details';
    retentionDetailsDiv.innerHTML = `<span style="color: #22c55e; font-weight: 600">${finalRetention}人</span> · 占总人数 ${(finalRetention / totalUsers * 100).toFixed(1)}%`;

    retentionTextDiv.appendChild(retentionStepDiv);
    retentionTextDiv.appendChild(retentionDetailsDiv);

    retentionItem.appendChild(retentionColorBox);
    retentionItem.appendChild(retentionTextDiv);
    legend.appendChild(retentionItem);

    return legend;
}

function renderStats(funnelData, rawData) {
    const statsContainer = document.getElementById('stats');
    const totalUsers = rawData.length;
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

async function loadData(zeroRetention = false) {
    const container = document.getElementById('funnel-content');
    container.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>正在加载数据...</p>
        </div>
    `;

    try {
        const url = zeroRetention ? '/api/churn-data?zero=1' : '/api/churn-data';
        const response = await fetch(url);
        const rawData = await response.json();
        const funnelData = processChurnData(rawData);
        renderStats(funnelData, rawData);
        renderFunnel(funnelData);
    } catch (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">数据加载失败: ${error.message}</div>`;
    }
}

loadData();
