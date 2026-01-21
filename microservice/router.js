/**
 * SmartRouter - Sistema de Roteamento Robusto para Node.js Nativo
 * 
 * @description Roteador high-performance para APIs REST com suporte a:
 * - Parâmetros dinâmicos (:id)
 * - Query parameters (?page=1&sort=desc) 
 * - Pattern matching otimizado
 * - Error handling robusto
 * 
 * @author Principal Engineer
 * @version 2.0.0 (Critical Production Fix)
 */

class SmartRouter {
  constructor() {
    this.routes = {
      'GET': new Map(),
      'POST': new Map(),  
      'PUT': new Map(),
      'DELETE': new Map(),
      'OPTIONS': new Map()
    };
    
    this.routeCount = 0;
    this.matchCount = 0;
    this.debugMode = process.env.NODE_ENV !== 'production';
    
    if (this.debugMode) {
      console.log('🚀 SmartRouter initialized in DEBUG mode');
    }
  }

  /**
   * Registrar rota com padrão flexível
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, OPTIONS)
   * @param {string} pattern - URL pattern (/api/users/:id)
   * @param {Function} handler - Handler function (req, res, context) => {}
   */
  register(method, pattern, handler) {
    if (!method || !pattern || !handler) {
      throw new Error('SmartRouter.register: method, pattern, and handler are required');
    }
    
    const upperMethod = method.toUpperCase();
    
    if (!this.routes[upperMethod]) {
      this.routes[upperMethod] = new Map();
    }
    
    // Validate handler is a function
    if (typeof handler !== 'function') {
      throw new Error(`SmartRouter.register: handler must be a function for ${upperMethod} ${pattern}`);
    }
    
    const routeInfo = {
      regex: this.patternToRegex(pattern),
      handler: handler,
      paramNames: this.extractParamNames(pattern),
      pattern: pattern,
      method: upperMethod
    };
    
    this.routes[upperMethod].set(pattern, routeInfo);
    this.routeCount++;
    
    if (this.debugMode) {
      console.log(`📝 Registered: ${upperMethod} ${pattern} (params: [${routeInfo.paramNames.join(', ')}])`);
    }
  }

  /**
   * Converter padrão de URL para RegExp otimizada
   * @param {string} pattern - URL pattern (/api/users/:id)
   * @returns {RegExp} - Regular expression for matching
   */
  patternToRegex(pattern) {
    // First convert :param to placeholders
    let regexPattern = pattern.replace(/:(\w+)/g, '___PARAM___');
    
    // Then escape special regex characters
    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Finally convert placeholders to capture groups
    regexPattern = regexPattern.replace(/___PARAM___/g, '([^/]+)');
    
    return new RegExp(`^${regexPattern}/?$`);
  }

  /**
   * Extrair nomes dos parâmetros dinâmicos
   * @param {string} pattern - URL pattern (/api/users/:id/:action)
   * @returns {Array<string>} - Array of parameter names ['id', 'action']
   */
  extractParamNames(pattern) {
    const matches = pattern.match(/:(\w+)/g);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  /**
   * Match URL com rota registrada (performance optimized)
   * @param {string} method - HTTP method
   * @param {string} url - Full URL with query parameters
   * @returns {Object|null} - Match result with handler, params, query
   */
  match(method, url) {
    const upperMethod = method.toUpperCase();
    const methodRoutes = this.routes[upperMethod];
    
    if (!methodRoutes || methodRoutes.size === 0) {
      return null;
    }
    
    try {
      // Parse URL with proper base for relative URLs
      const urlObj = new URL(url, 'http://localhost:5002');
      const pathname = urlObj.pathname;
      const queryParams = Object.fromEntries(urlObj.searchParams);
      
      this.matchCount++;
      
      // Strategy 1: Try exact match first (O(1) lookup)
      if (methodRoutes.has(pathname)) {
        const route = methodRoutes.get(pathname);
        
        if (this.debugMode) {
          console.log(`⚡ EXACT match: ${upperMethod} ${pathname}`);
        }
        
        return {
          handler: route.handler,
          params: {},
          query: queryParams,
          pathname: pathname,
          pattern: pathname,
          method: upperMethod
        };
      }

      // Strategy 2: Try pattern matches (O(n) but optimized)
      for (const [pattern, route] of methodRoutes) {
        const match = pathname.match(route.regex);
        
        if (match) {
          // Extract path parameters
          const pathParams = {};
          route.paramNames.forEach((name, index) => {
            pathParams[name] = match[index + 1];
          });
          
          if (this.debugMode) {
            console.log(`🎯 PATTERN match: ${upperMethod} ${pathname} → ${pattern}`, 
                       { pathParams, queryParams });
          }

          return {
            handler: route.handler,
            params: pathParams,
            query: queryParams,
            pathname: pathname,
            pattern: pattern,
            method: upperMethod
          };
        }
      }
      
      // No match found
      if (this.debugMode) {
        console.log(`❌ NO match: ${upperMethod} ${pathname} (tried ${methodRoutes.size} patterns)`);
      }
      
    } catch (error) {
      console.error('❌ SmartRouter URL parsing error:', error);
      console.error('   URL:', url);
      console.error('   Method:', method);
    }
    
    return null;
  }

  /**
   * Get all registered routes (debugging/monitoring)
   * @returns {Object} - Object with methods as keys and route arrays as values
   */
  getRoutes() {
    const allRoutes = {};
    
    for (const [method, routeMap] of Object.entries(this.routes)) {
      allRoutes[method] = Array.from(routeMap.keys());
    }
    
    return allRoutes;
  }
  
  /**
   * Get router statistics
   * @returns {Object} - Router performance and usage stats
   */
  getStats() {
    const totalRoutes = Object.values(this.routes)
      .reduce((sum, routeMap) => sum + routeMap.size, 0);
      
    return {
      totalRoutes,
      matchCount: this.matchCount,
      routesByMethod: Object.fromEntries(
        Object.entries(this.routes).map(([method, routeMap]) => [method, routeMap.size])
      )
    };
  }
  
  /**
   * Clear all routes (for testing)
   */
  clear() {
    for (const routeMap of Object.values(this.routes)) {
      routeMap.clear();
    }
    this.routeCount = 0;
    this.matchCount = 0;
    
    if (this.debugMode) {
      console.log('🧹 SmartRouter cleared all routes');
    }
  }
  
  /**
   * Debug: Print all registered routes
   */
  printRoutes() {
    console.log('\n🗂️  SmartRouter Registered Routes:');
    console.log('=====================================');
    
    for (const [method, routeMap] of Object.entries(this.routes)) {
      if (routeMap.size > 0) {
        console.log(`\n${method}:`);
        for (const pattern of routeMap.keys()) {
          console.log(`  ${pattern}`);
        }
      }
    }
    
    console.log(`\nTotal Routes: ${this.getStats().totalRoutes}`);
    console.log(`Match Count: ${this.matchCount}`);
    console.log('=====================================\n');
  }
}

module.exports = SmartRouter;