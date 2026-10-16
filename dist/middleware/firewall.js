import { logger } from '../utils/logger.js';
// Métodos HTTP permitidos
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
// Agentes maliciosos y escáneres automatizados de vulnerabilidades
const SUSPICIOUS_USER_AGENTS = [
    /sqlmap/i,
    /nikto/i,
    /acunetix/i,
    /nmap/i,
    /masscan/i,
    /wpscan/i,
    /dirbuster/i,
    /gobuster/i,
    /havij/i,
    /nessus/i
];
// Patrones de Cross-Site Scripting (XSS) y ejecución arbitraria
const XSS_PATTERNS = [
    /<script\b[^>]*>/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<iframe\b[^>]*>/i,
    /<embed\b[^>]*>/i,
    /<object\b[^>]*>/i,
    /\bon(?:error|load|click|mouseover|focus|blur|submit)\s*=/i
];
// Patrones de Inyección SQL (SQLi)
const SQLI_PATTERNS = [
    /\bunion\s+(?:all\s+)?select\b/i,
    /\bselect\b.+\bfrom\b.+\binformation_schema\b/i,
    /\bwaitfor\s+delay\b/i,
    /\bbenchmark\s*\(\s*\d+\s*,\s*.+\)/i,
    /\bsleep\s*\(\s*\d+\s*\)/i,
    /(?:^|[\s;])(?:drop|truncate|alter)\s+(?:table|database)\s+/i,
    /--\s*$/m,
    /\/\*![\d\w\s]*\*\//
];
// Patrones de Path Traversal / LFI
const TRAVERSAL_PATTERNS = [
    /(?:\.\.[/\\]|[/\\]\.\.)/,
    /%2e%2e[%2f%5c]/i,
    /(?:etc\/passwd|boot\.ini|win\.ini)/i
];
// Campos sensibles que NO deben ser analizados por firmas SQL (ej: contraseñas complejas y hashes)
const SKIP_BODY_KEYS = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'recoveryToken',
    'refreshToken',
    'answers'
]);
function inspectValue(val, keyName = '') {
    if (SKIP_BODY_KEYS.has(keyName))
        return null;
    if (val === null || val === undefined)
        return null;
    if (typeof val === 'string') {
        // 1. Path traversal check
        for (const pattern of TRAVERSAL_PATTERNS) {
            if (pattern.test(val))
                return 'Path Traversal detectado';
        }
        // 2. XSS check
        for (const pattern of XSS_PATTERNS) {
            if (pattern.test(val))
                return 'Carga maliciosa XSS detectada';
        }
        // 3. SQLi check
        for (const pattern of SQLI_PATTERNS) {
            if (pattern.test(val))
                return 'Firma de Inyección SQL detectada';
        }
        return null;
    }
    if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
            const detected = inspectValue(val[i], keyName);
            if (detected)
                return detected;
        }
        return null;
    }
    if (typeof val === 'object') {
        for (const [subKey, subVal] of Object.entries(val)) {
            const detected = inspectValue(subVal, subKey);
            if (detected)
                return detected;
        }
        return null;
    }
    return null;
}
export const applicationFirewall = (req, res, next) => {
    // 1. Verificación del Método HTTP
    if (!ALLOWED_METHODS.has(req.method)) {
        logger.warn('WAF: Método HTTP denegado', { method: req.method, ip: req.ip, path: req.originalUrl });
        res.status(405).json({
            success: false,
            message: 'Método HTTP no admitido por las políticas de seguridad.'
        });
        return;
    }
    // 2. Verificación de User-Agent sospechoso
    const userAgent = req.header('user-agent') || '';
    for (const pattern of SUSPICIOUS_USER_AGENTS) {
        if (pattern.test(userAgent)) {
            logger.warn('WAF: Agente escáner malicioso bloqueado', {
                userAgent,
                ip: req.ip,
                path: req.originalUrl
            });
            res.status(403).json({
                success: false,
                message: 'Acceso denegado por el cortafuegos de seguridad de la aplicación.'
            });
            return;
        }
    }
    // 3. Verificación de URL y Query Parameters
    let decodedUrl = req.originalUrl || req.url || '';
    try {
        decodedUrl = decodeURI(decodedUrl);
    }
    catch {
        // Si la URI está mal codificada, se evalúa la original
    }
    for (const pattern of TRAVERSAL_PATTERNS) {
        if (pattern.test(decodedUrl)) {
            logger.warn('WAF: Path Traversal en URL bloqueado', { url: req.originalUrl, ip: req.ip });
            res.status(403).json({
                success: false,
                message: 'Acceso denegado por el cortafuegos de seguridad de la aplicación.'
            });
            return;
        }
    }
    // 4. Inspección profunda de Parámetros de Consulta (Query)
    if (req.query && typeof req.query === 'object') {
        const detected = inspectValue(req.query);
        if (detected) {
            logger.warn(`WAF: ${detected} en parámetros query`, { query: req.query, ip: req.ip, path: req.path });
            res.status(403).json({
                success: false,
                message: 'Acceso denegado por el cortafuegos de seguridad de la aplicación.'
            });
            return;
        }
    }
    // 5. Inspección de Carga Útil en el Cuerpo (Body)
    if (req.body && typeof req.body === 'object') {
        const detected = inspectValue(req.body);
        if (detected) {
            logger.warn(`WAF: ${detected} en cuerpo de petición`, { ip: req.ip, path: req.path });
            res.status(403).json({
                success: false,
                message: 'Acceso denegado por el cortafuegos de seguridad de la aplicación.'
            });
            return;
        }
    }
    next();
};
//# sourceMappingURL=firewall.js.map