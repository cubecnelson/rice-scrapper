const webdriver = require('selenium-webdriver');

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

const scrape = (driver, page) => {
    console.log(`Page ${page}`)
    driver.get(`https://www.openrice.com/zh/hongkong/restaurants/district/%E4%B8%8A%E7%92%B0?page=${page}`).then(
            () => {
                return driver.findElements(webdriver.By.className('content-cell-wrapper'));
            }
        ).then (
            elements => Promise.all(elements.map(
                (element, index) => 
                    Promise.all([
                        element.findElements(webdriver.By.className('title-name')),
                        element.findElements(webdriver.By.className('icon-info address')),
                        element.findElements(webdriver.By.className('score score-big highlight')),
                        element.findElements(webdriver.By.className('score highlight')),
                    ])   
            ))
        ).then(
            findElementsResponses => Promise.all(
                findElementsResponses.map(
                    findElementsResponse => 
                        Promise.all(findElementsResponse.map(
                            elements => {
                                return elements[0].getText()
                            }
                        ))
                )
            )
        ).then(
            getTextResponses => {
                let result = getTextResponses.map(
                    itemArray => {
                        return itemArray.map(
                        text => {
                            return text.replace(/\n/g, "").replace(/ {1,}/g,"")
                        }
                    )}
                )
                console.log(result)
                scrape(driver, page + 1);
            }
        ).catch(
            e => {
                console.log(e)
                setTimeout(
                    () => {
                        scrape(driver, page);
                    }
                , 10000)
            }
        )
}

(async function example() {
        let driver = new webdriver.Builder().forBrowser('chrome')
        .build();
        scrape(driver, 1)
})()
