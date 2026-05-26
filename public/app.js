(function() {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const tooltip = document.getElementById('tooltip');
    const typhoonList = document.getElementById('typhoonList');

    let allTyphoons = [];
    let filteredTyphoons = [];
    let selectedTyphoonId = null;
    let projectedPaths = [];
    let canvasWidth = 0;
    let canvasHeight = 0;
    let projector = null;

    const MAP_BOUNDS = {
        minLat: 0,
        maxLat: 55,
        minLng: 100,
        maxLng: 150
    };

    function init() {
        setupCanvas();
        setupProjector();
        setupEventListeners();
        loadData();
    }

    function setupCanvas() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        ctx.scale(dpr, dpr);
    }

    function setupProjector() {
        projector = MapProjection.createProjector('mercator', MAP_BOUNDS);
    }

    function setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', loadData);
        
        document.getElementById('yearFilter').addEventListener('change', applyFilters);
        document.getElementById('intensityFilter').addEventListener('input', function(e) {
            document.getElementById('intensityValue').textContent = e.target.value;
            applyFilters();
        });
        document.getElementById('showLabels').addEventListener('change', render);

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('click', handleClick);

        window.addEventListener('resize', function() {
            setupCanvas();
            if (allTyphoons.length > 0) {
                projectAllPaths();
                render();
            }
        });
    }

    async function loadData() {
        loadingOverlay.classList.remove('hidden');
        
        try {
            const response = await fetch('/api/typhoons');
            const result = await response.json();
            allTyphoons = result.data;
            
            console.log(`Loaded ${allTyphoons.length} typhoons`);
            
            populateYearFilter();
            applyFilters();
            
            const years = [...new Set(allTyphoons.map(t => t.year))].sort();
            document.getElementById('totalTyphoons').textContent = allTyphoons.length;
            
            const totalPoints = allTyphoons.reduce((sum, t) => sum + t.points.length, 0);
            document.getElementById('totalPoints').textContent = totalPoints;
            
            const maxWind = Math.max(...allTyphoons.flatMap(t => t.points.map(p => p.windSpeed)));
            document.getElementById('maxWind').textContent = maxWind.toFixed(1) + ' m/s';
            
        } catch (error) {
            console.error('Failed to load data:', error);
            typhoonList.innerHTML = '<p class="empty-message">数据加载失败，请刷新重试</p>';
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function populateYearFilter() {
        const years = [...new Set(allTyphoons.map(t => t.year))].sort((a, b) => b - a);
        const select = document.getElementById('yearFilter');
        
        select.innerHTML = '<option value="all">全部年份</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            select.appendChild(option);
        });
    }

    function applyFilters() {
        const yearFilter = document.getElementById('yearFilter').value;
        const intensityFilter = parseInt(document.getElementById('intensityFilter').value);
        
        filteredTyphoons = allTyphoons.filter(typhoon => {
            if (yearFilter !== 'all' && typhoon.year !== parseInt(yearFilter)) {
                return false;
            }
            
            const maxWind = Math.max(...typhoon.points.map(p => p.windSpeed));
            if (maxWind < intensityFilter) {
                return false;
            }
            
            return true;
        });
        
        document.getElementById('displayedCount').textContent = filteredTyphoons.length;
        
        projectAllPaths();
        renderTyphoonList();
        render();
    }

    function projectAllPaths() {
        projectedPaths = filteredTyphoons.map(typhoon => {
            const projectedPoints = projector.projectPoints(typhoon.points, canvasWidth, canvasHeight);
            return {
                ...typhoon,
                projectedPoints
            };
        });
    }

    function renderTyphoonList() {
        if (filteredTyphoons.length === 0) {
            typhoonList.innerHTML = '<p class="empty-message">没有符合条件的台风</p>';
            return;
        }
        
        typhoonList.innerHTML = filteredTyphoons
            .sort((a, b) => b.year - a.year)
            .map(typhoon => {
                const maxWind = Math.max(...typhoon.points.map(p => p.windSpeed));
                const isActive = selectedTyphoonId === typhoon.id ? 'active' : '';
                return `
                    <div class="typhoon-item ${isActive}" data-id="${typhoon.id}">
                        <div class="typhoon-name">${typhoon.name} (${typhoon.id})</div>
                        <div class="typhoon-info">
                            ${typhoon.year}年 · ${typhoon.points.length}个数据点 · 最大风速 ${maxWind.toFixed(1)} m/s
                        </div>
                    </div>
                `;
            }).join('');
        
        document.querySelectorAll('.typhoon-item').forEach(item => {
            item.addEventListener('click', function() {
                const id = this.dataset.id;
                selectedTyphoonId = selectedTyphoonId === id ? null : id;
                renderTyphoonList();
                render();
            });
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        drawMapBackground();
        drawGrid();
        
        const showLabels = document.getElementById('showLabels').checked;
        
        projectedPaths.forEach(path => {
            const isSelected = selectedTyphoonId === path.id;
            const isDimmed = selectedTyphoonId !== null && !isSelected;
            
            drawTyphoonPath(path, isSelected, isDimmed);
            
            if (showLabels) {
                drawTyphoonLabel(path, isDimmed);
            }
        });
    }

    function drawMapBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e3a5f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.1)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight * 0.3);
        ctx.quadraticCurveTo(canvasWidth * 0.2, canvasHeight * 0.25, canvasWidth * 0.4, canvasHeight * 0.28);
        ctx.quadraticCurveTo(canvasWidth * 0.6, canvasHeight * 0.3, canvasWidth * 0.8, canvasHeight * 0.35);
        ctx.quadraticCurveTo(canvasWidth * 0.9, canvasHeight * 0.38, canvasWidth, canvasHeight * 0.4);
        ctx.lineTo(canvasWidth, canvasHeight);
        ctx.lineTo(0, canvasHeight);
        ctx.closePath();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        
        for (let lng = MAP_BOUNDS.minLng; lng <= MAP_BOUNDS.maxLng; lng += 10) {
            const projected = projector.forward(MAP_BOUNDS.minLat, lng, canvasWidth, canvasHeight);
            ctx.beginPath();
            ctx.moveTo(projected.x, 0);
            ctx.lineTo(projected.x, canvasHeight);
            ctx.stroke();
            
            ctx.fillText(`${lng}°E`, projected.x + 4, canvasHeight - 8);
        }
        
        for (let lat = MAP_BOUNDS.minLat; lat <= MAP_BOUNDS.maxLat; lat += 10) {
            const projected = projector.forward(lat, MAP_BOUNDS.minLng, canvasWidth, canvasHeight);
            ctx.beginPath();
            ctx.moveTo(0, projected.y);
            ctx.lineTo(canvasWidth, projected.y);
            ctx.stroke();
            
            ctx.fillText(`${lat}°N`, 4, projected.y - 4);
        }
    }

    function drawTyphoonPath(path, isSelected, isDimmed) {
        const points = path.projectedPoints;
        if (points.length < 2) return;
        
        const baseOpacity = isDimmed ? 0.08 : (isSelected ? 0.9 : 0.35);
        const lineWidth = isSelected ? 3 : 1.2;
        
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1];
            const currPoint = points[i];
            
            const avgWindSpeed = (prevPoint.windSpeed + currPoint.windSpeed) / 2;
            const color = getWindColor(avgWindSpeed, baseOpacity);
            
            ctx.beginPath();
            ctx.moveTo(prevPoint.screenX, prevPoint.screenY);
            ctx.lineTo(currPoint.screenX, currPoint.screenY);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        
        ctx.restore();
        
        const lastPoint = points[points.length - 1];
        const maxWind = Math.max(...points.map(p => p.windSpeed));
        const maxColor = getWindColor(maxWind, baseOpacity * 1.5);
        
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.beginPath();
        ctx.arc(lastPoint.screenX, lastPoint.screenY, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = maxColor;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(lastPoint.screenX, lastPoint.screenY, isSelected ? 10 : 6, 0, Math.PI * 2);
        ctx.strokeStyle = maxColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = baseOpacity * 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        ctx.restore();
    }

    function drawTyphoonLabel(path, isDimmed) {
        const points = path.projectedPoints;
        if (points.length === 0) return;
        
        const firstPoint = points[0];
        const opacity = isDimmed ? 0.3 : 0.8;
        
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = `rgba(226, 232, 240, ${opacity})`;
        ctx.textAlign = 'center';
        ctx.fillText(path.name, firstPoint.screenX, firstPoint.screenY - 8);
    }

    function getWindColor(windSpeed, alpha) {
        const normalized = Math.max(0, Math.min(1, (windSpeed - 10) / 75));
        
        let r, g, b;
        
        if (normalized < 0.2) {
            const t = normalized / 0.2;
            r = Math.round(140 + t * (200 - 140));
            g = Math.round(220 + t * (230 - 220));
            b = Math.round(200 + t * (180 - 200));
        } else if (normalized < 0.4) {
            const t = (normalized - 0.2) / 0.2;
            r = Math.round(200 + t * (255 - 200));
            g = Math.round(230 + t * (210 - 230));
            b = Math.round(180 - t * (180 - 120));
        } else if (normalized < 0.6) {
            const t = (normalized - 0.4) / 0.2;
            r = 255;
            g = Math.round(210 - t * (210 - 140));
            b = Math.round(120 - t * (120 - 60));
        } else if (normalized < 0.8) {
            const t = (normalized - 0.6) / 0.2;
            r = Math.round(255 - t * (255 - 180));
            g = Math.round(140 - t * (140 - 60));
            b = Math.round(60 - t * (60 - 30));
        } else {
            const t = (normalized - 0.8) / 0.2;
            r = Math.round(180 - t * (180 - 60));
            g = Math.round(60 - t * (60 - 20));
            b = Math.round(30 - t * (30 - 10));
        }
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const hovered = findNearestPoint(x, y);
        
        if (hovered) {
            showTooltip(e.clientX, e.clientY, hovered);
            canvas.style.cursor = 'pointer';
        } else {
            hideTooltip();
            canvas.style.cursor = 'crosshair';
        }
    }

    function handleMouseLeave() {
        hideTooltip();
        canvas.style.cursor = 'crosshair';
    }

    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clicked = findNearestPoint(x, y, 20);
        
        if (clicked) {
            selectedTyphoonId = selectedTyphoonId === clicked.typhoonId ? null : clicked.typhoonId;
            renderTyphoonList();
            render();
        }
    }

    function findNearestPoint(x, y, threshold = 10) {
        let nearest = null;
        let minDist = threshold;
        
        projectedPaths.forEach(path => {
            path.projectedPoints.forEach(point => {
                const dist = Math.sqrt(
                    Math.pow(point.screenX - x, 2) + 
                    Math.pow(point.screenY - y, 2)
                );
                
                if (dist < minDist) {
                    minDist = dist;
                    nearest = {
                        typhoonId: path.id,
                        typhoonName: path.name,
                        year: path.year,
                        ...point
                    };
                }
            });
        });
        
        return nearest;
    }

    function showTooltip(x, y, data) {
        const time = new Date(data.time);
        const timeStr = time.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        tooltip.innerHTML = `
            <div class="tooltip-title">🌀 ${data.typhoonName}</div>
            <div class="tooltip-row"><span>年份</span><span>${data.year}年</span></div>
            <div class="tooltip-row"><span>时间</span><span>${timeStr}</span></div>
            <div class="tooltip-row"><span>纬度</span><span>${data.lat.toFixed(2)}°N</span></div>
            <div class="tooltip-row"><span>经度</span><span>${data.lng.toFixed(2)}°E</span></div>
            <div class="tooltip-row"><span>风速</span><span style="color: ${getWindColor(data.windSpeed, 1)}">${data.windSpeed.toFixed(1)} m/s</span></div>
            <div class="tooltip-row"><span>气压</span><span>${data.pressure} hPa</span></div>
        `;
        
        const tooltipWidth = 250;
        const tooltipHeight = 180;
        let left = x + 15;
        let top = y + 15;
        
        if (left + tooltipWidth > window.innerWidth) {
            left = x - tooltipWidth - 15;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = y - tooltipHeight - 15;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('visible');
    }

    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    window.addEventListener('DOMContentLoaded', init);
})();
