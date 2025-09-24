const puppeteer = require('puppeteer');

(async () => {
    const url = process.argv[2];
    if (!url) { console.error('Usage: node track-redirects.js URL'); process.exit(2); }

    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    const redirects = [];
    const urlCookies = new Map(); // url -> cookies set for that url
    
    page.on('request', req => {
        const r = req.redirectChain();
        if (r.length) {
            // log when request has a redirect chain (server-side)
            redirects.push({type: 'network-redirect', from: r[r.length-1].url(), to: req.url()});
        }
    });

    page.on('response', async res => {
        const headers = res.headers();
        if (headers['set-cookie']) {
            const setCookies = Array.isArray(headers['set-cookie']) 
                ? headers['set-cookie'] 
                : [headers['set-cookie']];
            
            const url = res.url();
            if (!urlCookies.has(url)) {
                urlCookies.set(url, []);
            }
            
            for (const cookie of setCookies) {
                // Extract only name=value part (before first semicolon)
                const cookieValue = cookie.split(';')[0].trim();
                urlCookies.get(url).push(cookieValue);
            }
        }
    });

    page.on('framenavigated', frame => {
        // captures JS-triggered navigations (location.href, replace, SPA navigations)
        redirects.push({type: 'frame-nav', url: frame.url()});
    });

    // optional: detect client-side location changes after load
    await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});
    // poll for single-page-app changes for short time
    const startUrl = page.url();
    redirects.push({type: 'initial', url: startUrl});

    // Capture initial JavaScript-set cookies
    let jsCookies = await page.evaluate(() => document.cookie);
    if (jsCookies) {
        const initialJsCookies = jsCookies.split('; ').filter(c => c.trim());
        if (initialJsCookies.length > 0) {
            if (!urlCookies.has(startUrl)) {
                urlCookies.set(startUrl, []);
            }
            for (const cookie of initialJsCookies) {
                if (!urlCookies.get(startUrl).includes(cookie)) {
                    urlCookies.get(startUrl).push(cookie + ' (JS)');
                }
            }
        }
    }

    const end = Date.now() + 10000; // Increased to 10 seconds
    while (Date.now() < end) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const cur = page.url();
        if (cur !== redirects[redirects.length-1].url) {
            redirects.push({type: 'client-change', url: cur});
        }
        
        // Check for new JavaScript-set cookies
        const currentJsCookies = await page.evaluate(() => document.cookie);
        if (currentJsCookies && currentJsCookies !== jsCookies) {
            const newCookies = currentJsCookies.split('; ').filter(c => c.trim());
            const oldCookies = (jsCookies || '').split('; ').filter(c => c.trim());
            const addedCookies = newCookies.filter(c => !oldCookies.includes(c));
            
            if (addedCookies.length > 0) {
                const currentUrl = page.url();
                if (!urlCookies.has(currentUrl)) {
                    urlCookies.set(currentUrl, []);
                }
                for (const cookie of addedCookies) {
                    urlCookies.get(currentUrl).push(cookie + ' (JS)');
                }
            }
            jsCookies = currentJsCookies;
        }
    }

    console.log('Redirect chain:');
    for (const r of redirects) {
        console.log('-', r.type, r.url || `${r.from} -> ${r.to}`);
        
        // For network redirects, show cookies from the 'from' URL (which actually sets them)
        // For other types, show cookies from the URL itself
        let cookieUrls = [];
        if (r.type === 'network-redirect' && r.from) {
            cookieUrls.push(r.from);
        }
        if (r.url) {
            cookieUrls.push(r.url);
        }
        if (r.to) {
            cookieUrls.push(r.to);
        }
        
        // Check all potential URLs for cookies, avoiding duplicates
        const seenCookies = new Set();
        for (const checkUrl of cookieUrls) {
            if (urlCookies.has(checkUrl)) {
                const cookies = urlCookies.get(checkUrl);
                for (const cookie of cookies) {
                    if (!seenCookies.has(cookie)) {
                        console.log(`  Cookie: ${cookie}`);
                        seenCookies.add(cookie);
                    }
                }
            }
        }
    }
    
    await browser.close();
})();
