const MapProjection = (function() {
    const EARTH_RADIUS = 6378137;
    const MAX_LATITUDE = 85.0511287798;

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    function radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    function mercatorForward(lat, lng, width, height, bounds) {
        const minLat = bounds.minLat || -MAX_LATITUDE;
        const maxLat = bounds.maxLat || MAX_LATITUDE;
        const minLng = bounds.minLng || -180;
        const maxLng = bounds.maxLng || 180;

        const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
        
        const latRad = degToRad(clampedLat);
        
        const x = (lng - minLng) / (maxLng - minLng) * width;
        
        const yMercator = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        const yMinMercator = Math.log(Math.tan(Math.PI / 4 + degToRad(maxLat) / 2));
        const yMaxMercator = Math.log(Math.tan(Math.PI / 4 + degToRad(minLat) / 2));
        const y = (yMercator - yMinMercator) / (yMaxMercator - yMinMercator) * height;

        return { x, y };
    }

    function mercatorInverse(x, y, width, height, bounds) {
        const minLat = bounds.minLat || -MAX_LATITUDE;
        const maxLat = bounds.maxLat || MAX_LATITUDE;
        const minLng = bounds.minLng || -180;
        const maxLng = bounds.maxLng || 180;

        const lng = (x / width) * (maxLng - minLng) + minLng;

        const yMinMercator = Math.log(Math.tan(Math.PI / 4 + degToRad(maxLat) / 2));
        const yMaxMercator = Math.log(Math.tan(Math.PI / 4 + degToRad(minLat) / 2));
        const yMercator = (y / height) * (yMaxMercator - yMinMercator) + yMinMercator;
        const latRad = 2 * Math.atan(Math.exp(yMercator)) - Math.PI / 2;
        const lat = radToDeg(latRad);

        return { lat, lng };
    }

    function equirectangularForward(lat, lng, width, height, bounds) {
        const minLat = bounds.minLat || -90;
        const maxLat = bounds.maxLat || 90;
        const minLng = bounds.minLng || -180;
        const maxLng = bounds.maxLng || 180;

        const x = (lng - minLng) / (maxLng - minLng) * width;
        const y = (maxLat - lat) / (maxLat - minLat) * height;

        return { x, y };
    }

    function equirectangularInverse(x, y, width, height, bounds) {
        const minLat = bounds.minLat || -90;
        const maxLat = bounds.maxLat || 90;
        const minLng = bounds.minLng || -180;
        const maxLng = bounds.maxLng || 180;

        const lng = (x / width) * (maxLng - minLng) + minLng;
        const lat = maxLat - (y / height) * (maxLat - minLat);

        return { lat, lng };
    }

    function createProjector(type, bounds) {
        const projectionType = type || 'mercator';
        const projectionBounds = bounds || {
            minLat: -85.0511287798,
            maxLat: 85.0511287798,
            minLng: -180,
            maxLng: 180
        };

        function forward(lat, lng, width, height) {
            if (projectionType === 'mercator') {
                return mercatorForward(lat, lng, width, height, projectionBounds);
            } else {
                return equirectangularForward(lat, lng, width, height, projectionBounds);
            }
        }

        function inverse(x, y, width, height) {
            if (projectionType === 'mercator') {
                return mercatorInverse(x, y, width, height, projectionBounds);
            } else {
                return equirectangularInverse(x, y, width, height, projectionBounds);
            }
        }

        function projectPoints(points, width, height) {
            return points.map(p => {
                const projected = forward(p.lat, p.lng, width, height);
                return {
                    ...p,
                    screenX: projected.x,
                    screenY: projected.y
                };
            });
        }

        function getBounds() {
            return { ...projectionBounds };
        }

        function getType() {
            return projectionType;
        }

        return {
            forward,
            inverse,
            projectPoints,
            getBounds,
            getType
        };
    }

    return {
        createProjector,
        mercatorForward,
        mercatorInverse,
        equirectangularForward,
        equirectangularInverse,
        degToRad,
        radToDeg,
        EARTH_RADIUS,
        MAX_LATITUDE
    };
})();

window.MapProjection = MapProjection;
