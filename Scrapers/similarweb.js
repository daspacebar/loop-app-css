const puppeteer = require('puppeteer');
const fs = require('fs');


const _getDomainBatches = () => {
    console.log(`get domains in batches`);
    const _allDomains = [];
    try {
        const _file = fs.readFileSync("similarWebDomains.csv", "utf8");
        const _lines = _file.split("\n");
        _lines.map((line) => {
            const _trimmedLine = line.trim();
            if (_trimmedLine)
                _allDomains.push(_trimmedLine);
        });
    } catch (error) {
        console.log(error);
    }
    const _totalDomains = _allDomains.length;
    console.log(`total domain: ${_totalDomains}`);
    if (_totalDomains < 5)
        return [_allDomains];

    const _batchSize = parseInt(_totalDomains / 2);
    const _batches = [];
    for (let i = 0; i < 2; ++i) {
        _batches.push(_allDomains.slice(i * _batchSize, (i+1) * _batchSize));
    }
    return _batches;
};

const _processOverviewElement = async (elementHandle) => {
    console.log(`process overview element`);
    const _itemNameElement = await elementHandle.$('.engagement-list__item-name');
    const _name = await (await _itemNameElement.getProperty('textContent')).jsonValue();
    const _itemValueElement = await elementHandle.$('.engagement-list__item-value');
    const _value = await (await _itemValueElement.getProperty('textContent')).jsonValue();
    return {name: _name, value: _value};
}

const executeDomainDataLoot = async () => {
    console.log(`starting the loot at ${new Date()}`);
    const _domainBatches = _getDomainBatches();
    let _batchNumber = 1;
    for (const _domainList of _domainBatches) {
        _scrapDomainData(_domainList, _batchNumber);
        ++_batchNumber;
    }
}

async function _scrapDomainData(domains, batchNumber) {
    const _results = {};
    fs.appendFileSync(`domainData${batchNumber}.csv`, `domain,total visit,bounce rate,pages per visit,avg visit duration\n`);
    for (const _domain of domains) {
        const _data = [_domain];
        console.log(`scrap stats for: ${_domain}`);
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        try {
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (['image', 'font', 'stylesheet', 'other'].indexOf(request.resourceType()) !== -1) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
            _results[_domain] = {};
            const _url = `https://www.similarweb.com/website/${_domain}/#overview`
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9'
            });
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36");
            // Navigate to the SimilarWeb website and search for the domain
            await page.goto(_url);

            // Wait for the page to load and for the total visit data to be displayed
            await page.waitForSelector('.engagement-list__item', { timeout: 15000 });
            const _overviewElements = await page.$$('.engagement-list__item');
            for (const _overviewElement of _overviewElements) {
                const _result = await _processOverviewElement(_overviewElement.asElement());
                _data.push(_result.value);
            }
            const _newLine = `${_data.toString()}\n`;
            console.log(_newLine);
            fs.appendFileSync(`domainData${batchNumber}.csv`, _newLine);
            await browser.close();
        } catch (error) {
            console.error(`Skipping for ${_domain}`);
            _data.push('-','-','-','-');
            fs.appendFileSync(`domainData${batchNumber}.csv`, `${_data.toString()}\n`);
            await browser.close();
        } finally {
            if (!browser.isClosed) {
                await browser.close();
            }
        }
    }
}

(async () => {
    await executeDomainDataLoot();
})();