Wick.Tools.BrushUtils = {
    drawBrushShape (ctx, size, shape, style, args) {
        function applyStyles (path, pathScale=1) {
            if (path)
                style(() => ctx.fill(path), () => ctx.stroke(path), pathScale);
            else
                style(() => ctx.fill(), () => ctx.stroke(), 1);
        }
        function fallback () {
            if (!args) return;
            if (args.fallback === 'circle') {
                ctx.beginPath();
                ctx.arc(centerX, centerY, size / 2, 0, PI2);
                applyStyles();
            } else if (args.fallback === 'polycircle') {
                var curveSegs = args.curveSegs || 24, startAngle = 0;
                ctx.beginPath();
                for (let i = 0; i <= curveSegs; i++) {
                    const a = startAngle + (i / curveSegs) * PI2;
                    const px = Math.cos(a) * r, py = Math.sin(a) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                applyStyles();
            }
        }
        var centerX = 0, centerY = 0, r = size / 2 - 1;
        var tlcX = centerX - size/2, tlcY = centerY - size/2,
            brcX = tlcX + size, brcY = tlcY + size;
        var PI2 = Math.PI * 2;
        
        if (!shape || shape === 'circle') {
            fallback();
            return null;
        }
        // Custom canvas-derived shapes registered via window.wickCustomBrushShapes
        if (shape && shape.startsWith('custom_')) {
            var customData = window.wickCustomBrushShapes && window.wickCustomBrushShapes[shape];
            if (customData && customData.pathD) {
                // Custom brush shapes have dimensions 28x28; scale these
                var to64 = size / 28;
                var totalScale = to64 * customData.scale;
                ctx.save();
                ctx.translate(-size / 2, -size / 2);
                ctx.scale(to64, to64);
                ctx.translate(customData.tx, customData.ty);
                ctx.scale(customData.scale, customData.scale);
                applyStyles(new Path2D(customData.pathD), totalScale);
                ctx.restore();
                return true;
            }
            fallback();
            return null;
        }
        switch (shape) {
            case 'softcircle': {
                var g = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
                g.addColorStop(0,   'rgba(255,255,255,1.0)');
                g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
                g.addColorStop(0.75,'rgba(255,255,255,0.35)');
                g.addColorStop(1,   'rgba(255,255,255,0.0)');
                ctx.fillStyle = g;
                ctx.fillRect(tlcX, tlcY, size, size);
                break;
            }
            case 'square':
                ctx.beginPath();
                ctx.rect(tlcX, tlcY, size, size);
                break;
            case 'rect':
                ctx.beginPath();
                ctx.rect(tlcX, tlcY + Math.round(size * 0.3), size, Math.round(size * 0.4));
                break;
            case 'chisel': {
                ctx.save();
                ctx.translate(centerX, centerY); // we won't need this!
                ctx.rotate(Math.PI / 4);
                ctx.scale(1, 0.15);
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, PI2);
                ctx.restore();
                break;
            }
            case 'diamond': {
                ctx.beginPath();
                ctx.moveTo(centerX, tlcY);
                ctx.lineTo(brcX, centerY);
                ctx.lineTo(centerX, brcY);
                ctx.lineTo(tlcX, centerY);
                ctx.closePath();
                break;
            }
            case 'triangle': {
                // TODO: not equilateral?
                ctx.beginPath();
                ctx.moveTo(centerX, tlcY);
                ctx.lineTo(brcX, brcY);
                ctx.lineTo(tlcX, brcY);
                ctx.closePath();
                break;
            }
            case 'star': {
                var outerR = r, innerR = r * 0.4;
                ctx.beginPath();
                for (var i = 0; i < 10; i++) {
                    var a = (i * Math.PI / 5) - Math.PI / 2;
                    var rad = i % 2 === 0 ? outerR : innerR;
                    var px = centerX + Math.cos(a) * rad;
                    var py = centerY + Math.sin(a) * rad;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            }
            case 'sparkle': {
                var outerR2 = r, innerR2 = r * 0.12;
                ctx.beginPath();
                for (var i2 = 0; i2 < 8; i2++) {
                    var a2 = (i2 * Math.PI / 4) - Math.PI / 2;
                    var rad2 = i2 % 2 === 0 ? outerR2 : innerR2;
                    var px2 = centerX + Math.cos(a2) * rad2;
                    var py2 = centerY + Math.sin(a2) * rad2;
                    i2 === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
                }
                ctx.closePath();
                break;
            }
            case 'leaf': {
                ctx.beginPath();
                ctx.moveTo(centerX, tlcY);
                ctx.quadraticCurveTo(brcX, centerY, centerX, brcY);
                ctx.quadraticCurveTo(tlcX, centerY, centerX, tlcY);
                ctx.closePath();
                break;
            }
            case 'rough': {
                var pts = [
                    [0.50,0.02],[0.71,0.06],[0.89,0.20],[0.97,0.43],
                    [0.95,0.65],[0.80,0.84],[0.60,0.97],[0.38,0.95],
                    [0.17,0.83],[0.04,0.61],[0.06,0.36],[0.20,0.16]
                ];
                ctx.beginPath();
                ctx.moveTo(tlcX + pts[0][0]*size, tlcY + pts[0][1]*size);
                for (var j = 1; j < pts.length; j++)
                    ctx.lineTo(tlcX + pts[j][0]*size, tlcY + pts[j][1]*size);
                ctx.closePath();
                break;
            }
            case 'scatter': {
                var dots = [
                    [0.50,0.50,0.16],[0.25,0.28,0.12],[0.74,0.24,0.10],
                    [0.22,0.72,0.12],[0.74,0.73,0.10],[0.76,0.50,0.08]
                ];
                ctx.beginPath();
                dots.forEach(function(d) {
                    ctx.moveTo(tlcX + (d[0]+d[2]) * size, tlcY + d[1] * size);
                    ctx.arc(tlcX + d[0]*size, tlcY + d[1]*size, d[2]*size, 0, PI2);
                });
                break;
            }
            case 'cross': {
                var t = size * 0.28;
                ctx.beginPath();
                ctx.rect(centerX - t / 2, tlcY, t, size);
                ctx.rect(tlcX, centerY - t / 2, size, t);
                break;
            }
            case 'crescent': {
                /*ctx.arc(centerX, centerY, r, 0, PI2);
                ctx.fill();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(centerX + r * 0.35, centerY, r * 0.78, 0, PI2);*/
                ctx.beginPath();
                ctx.arc(centerX, centerY, r, 0.745971992938, -0.745971992938);
                ctx.arc(centerX + r * 0.35, centerY, r * 0.78, -1.0554259599, 1.0554259599, true);
                break;
            }
            case 'hexagon': {
                ctx.beginPath();
                for (var k = 0; k < 6; k++) {
                    var ha = (k / 6) * PI2 - Math.PI / 2;
                    var hx = centerX + Math.cos(ha) * r;
                    var hy = centerY + Math.sin(ha) * r;
                    k === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                break;
            }
            default:
                fallback();
                return null;
        }

        applyStyles();
        return true;
    }
}