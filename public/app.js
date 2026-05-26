const COLORS = [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#fca5a5', '#f87171', '#ef4444', '#dc2626'
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function createPolygon(points, fill, opacity = 0.85, className = 'funnel-segment') {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    polygon.setAttribute('fill', fill);
    polygon.setAttribute('opacity', opacity);
    if (className) polygon.setAttribute('class', className);
    polygon.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    polygon.addEventListener('mouseenter', () => polygon.setAttribute('opacity', '1'));
    polygon.addEventListener('mouseleave', () => polygon.setAttribute('opacity', opacity));
    return polygon;
}

function createText(x, y, text, fontSize = 12, anchor = 'middle', fill = '#ffffff', className = 'funnel-text') {
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('fill', fill);
    textEl.setAttribute('font-size', fontSize);
    textEl.setAttribute('font-weight', '600');
    textEl.setAttribute('class', className);
    textEl.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    textEl.textContent = text;
    return textEl;
}

function createLine(x1, y1, x2, y2, stroke = '#64748b', strokeWidth = 1, className = 'funnel-leader') {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', strokeWidth);
    line.setAttribute('class', className);
    line.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    return line;
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

function calculateWidthAtY(y, config) {
    const drawableHeight = config.height - config.paddingTop - config.paddingBottom;
    const relativeY = (y - config.paddingTop) / drawableHeight;
    const clampedY = Math.max(0, Math.min(1, relativeY));
    return config.topWidth - (config.topWidth - config.bottomWidth) * clampedY;
}

function generateFunnelSegments(funnelData, config) {
    const totalUsers = funnelData[0].cumulative;
    const drawableHeight = config.height - config.paddingTop - config.paddingBottom;

    const finalRetention = funnelData[funnelData.length - 1].cumulative - funnelData[funnelData.length - 1].count;
    const finalRetentionRate = finalRetention / totalUsers;

    let currentY = config.paddingTop;
    const segments = [];

    for (let i = 0; i < funnelData.length; i++) {
        const d = funnelData[i];
        const segmentHeight = d.churnRate * drawableHeight;

        const yTop = currentY;
        const yBottom = currentY + segmentHeight;

        const topWidthAtY = calculateWidthAtY(yTop, config);
        const bottomWidthAtY = calculateWidthAtY(yBottom, config);

        const leftTop = { x: config.paddingLeft + (config.topWidth - topWidthAtY) / 2, y: yTop };
        const rightTop = { x: config.paddingLeft + (config.topWidth + topWidthAtY) / 2, y: yTop };
        const leftBottom = { x: config.paddingLeft + (config.topWidth - bottomWidthAtY) / 2, y: yBottom };
        const rightBottom = { x: config.paddingLeft + (config.topWidth + bottomWidthAtY) / 2, y: yBottom };

        const centerX = config.paddingLeft + config.topWidth / 2;
        const centerY = segmentHeight > 0 ? yTop + segmentHeight / 2 : yTop;

        segments.push({
            type: 'churn',
            data: d,
            points: [leftTop, rightTop, rightBottom, leftBottom],
            centerX,
            centerY,
            height: segmentHeight,
            color: COLORS[i % COLORS.length],
            yTop,
            yBottom,
            rightEdgeX: rightBottom.x
        });

        currentY = yBottom;
    }

    if (finalRetentionRate > 0.001) {
        const retentionHeight = finalRetentionRate * drawableHeight;
        const yTop = currentY;
        const yBottom = currentY + retentionHeight;

        const topWidthAtY = calculateWidthAtY(yTop, config);
        const bottomWidthAtY = calculateWidthAtY(yBottom, config);

        const leftTop = { x: config.paddingLeft + (config.topWidth - topWidthAtY) / 2, y: yTop };
        const rightTop = { x: config.paddingLeft + (config.topWidth + topWidthAtY) / 2, y: yTop };
        const leftBottom = { x: config.paddingLeft + (config.topWidth - bottomWidthAtY) / 2, y: yBottom };
        const rightBottom = { x: config.paddingLeft + (config.topWidth + bottomWidthAtY) / 2, y: yBottom };

        const centerX = config.paddingLeft + config.topWidth / 2;
        const centerY = yTop + retentionHeight / 2;

        segments.push({
            type: 'retention',
            data: { label: '最终留存', count: finalRetention, retentionRate: finalRetentionRate, churnRate: 0 },
            points: [leftTop, rightTop, rightBottom, leftBottom],
            centerX,
            centerY,
            height: retentionHeight,
            color: '#22c55e',
            yTop,
            yBottom,
            rightEdgeX: rightBottom.x
        });
    }

    return segments;
}

function renderFunnel(funnelData) {
    const container = document.getElementById('funnel-content');
    const width = 750;
    const height = 550;
    const topWidth = 400;
    const bottomWidth = 80;
    const paddingTop = 50;
    const paddingBottom = 40;
    const paddingLeft = 40;
    const paddingRight = 280;

    const config = { width, height, topWidth, bottomWidth, paddingTop, paddingBottom, paddingLeft };

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width + paddingRight} ${height}`);
    svg.setAttribute('class', 'funnel-svg');

    const segments = generateFunnelSegments(funnelData, config);

    svg.appendChild(createText(
        paddingLeft + topWidth / 2,
        paddingTop - 20,
        `${funnelData[0].cumulative}人 (100%)`,
        13, 'middle', '#f97316'
    ));

    const churnSegments = segments.filter(s => s.type === 'churn');
    const retentionSegment = segments.find(s => s.type === 'retention');

    churnSegments.forEach(segment => {
        const polygon = createPolygon(segment.points, segment.color, 0.85);
        svg.appendChild(polygon);
    });

    if (retentionSegment) {
        const polygon = createPolygon(retentionSegment.points, retentionSegment.color, 0.85);
        svg.appendChild(polygon);
    }

    const leaderStartX = paddingLeft + topWidth + 30;
    const labelStartX = leaderStartX + 60;
    const usedLabelYs = [];
    const minLabelGap = 24;

    churnSegments.forEach((segment, index) => {
        if (segment.height >= 25) {
            svg.appendChild(createText(
                segment.centerX,
                segment.centerY - 4,
                segment.data.label,
                11, 'middle', '#ffffff'
            ));
            svg.appendChild(createText(
                segment.centerX,
                segment.centerY + 10,
                `${segment.data.count}人 (${(segment.data.churnRate * 100).toFixed(1)}%)`,
                10, 'middle', 'rgba(255,255,255,0.9)'
            ));
        } else {
            let labelY = segment.centerY;
            for (let i = usedLabelYs.length - 1; i >= 0; i--) {
                if (Math.abs(labelY - usedLabelYs[i]) < minLabelGap) {
                    labelY = usedLabelYs[i] + minLabelGap;
                }
            }
            usedLabelYs.push(labelY);

            const midX = leaderStartX + 15;

            const line1 = createLine(segment.rightEdgeX, segment.centerY, midX, segment.centerY, segment.color, 1.5);
            svg.appendChild(line1);

            const line2 = createLine(midX, segment.centerY, midX, labelY, segment.color, 1.5);
            svg.appendChild(line2);

            const line3 = createLine(midX, labelY, labelStartX - 5, labelY, segment.color, 1.5);
            svg.appendChild(line3);

            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('cx', segment.rightEdgeX);
            dot.setAttribute('cy', segment.centerY);
            dot.setAttribute('r', 3);
            dot.setAttribute('fill', segment.color);
            svg.appendChild(dot);

            svg.appendChild(createText(
                labelStartX,
                labelY + 4,
                `${segment.data.label}: ${segment.data.count}人 (${(segment.data.churnRate * 100).toFixed(1)}%)`,
                10, 'start', '#e4e4e7'
            ));
        }
    });

    if (retentionSegment) {
        if (retentionSegment.height >= 25) {
            svg.appendChild(createText(
                retentionSegment.centerX,
                retentionSegment.centerY - 4,
                retentionSegment.data.label,
                11, 'middle', '#ffffff'
            ));
            svg.appendChild(createText(
                retentionSegment.centerX,
                retentionSegment.centerY + 10,
                `${retentionSegment.data.count}人 (${(retentionSegment.data.retentionRate * 100).toFixed(1)}%)`,
                10, 'middle', 'rgba(255,255,255,0.9)'
            ));
        }
    }

    const finalCount = funnelData[funnelData.length - 1].cumulative - funnelData[funnelData.length - 1].count;
    svg.appendChild(createText(
        paddingLeft + topWidth / 2,
        height - paddingBottom + 15,
        `最终留存: ${finalCount}人 (${(finalCount / funnelData[0].cumulative * 100).toFixed(1)}%)`,
        12, 'middle', '#22c55e'
    ));

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
