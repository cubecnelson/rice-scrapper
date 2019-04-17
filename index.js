const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');


const locations = ['上環', '西環', '灣仔', '銅鑼灣'];

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function isString (value) {
    return typeof value === 'string' || value instanceof String;
}

const scrape = (driver, page, locationIndex, collection) => {
    if (page > 15) {
        page = 1;
        locationIndex = locationIndex + 1;
        if (locationIndex > locations.length) {
            return
        }
    }
    let location = locations[locationIndex];
    let url = `https://www.openrice.com/zh/hongkong/restaurants/district/${encodeURI(location)}?page=${page}`
    console.log(`Location: ${location}, Page: ${page}, URL: ${url}`)
    driver.get(url).then(
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
                        element.findElements(webdriver.By.css('div.emoticon-container.sad-face.pois-restaurant-list-cell-content-right-info-rating-sad > span')),
                        element.findElements(webdriver.By.className('icon-info icon-info-food-price')),
                        element.findElements(webdriver.By.css('ul.pois-categoryui-list > li')),
                        element.findElements(webdriver.By.className('text bookmarkedUserCount js-bookmark-count'))
                    ])   
            ))
        ).then(
            findElementsResponses => Promise.all(
                findElementsResponses.map(
                    findElementsResponse => 
                        Promise.all(findElementsResponse.map(
                            (elements, index) => {
                                if (index == findElementsResponse.length - 1) {
                                    return elements[0].getAttribute('data-count')
                                }
                                if (index == findElementsResponse.length - 2) {
                                    return Promise.all(elements.map(element => element.getText()))
                                }
                                return elements[0].getText()
                            }
                        ))
                )
            )
        ).then(
            getTextResponses => {
                let result = getTextResponses.map(
                    rowArray => {
                        let tempArray = rowArray.map(
                            rowItem => {
                                if (isString(rowItem)) {
                                    return rowItem.replace(/\n/g, "").replace(/ {2,}/g,"")
                                } else {
                                    return rowItem.map(
                                        text => text.replace(/\n/g, "").replace(/ {1,}/g,"")
                                    )
                                }
                            })
                        return {title: tempArray[0], address: tempArray[1], happy: tempArray[2], sad: tempArray[3], price: tempArray[4], category: tempArray[5], bookmarkCount: tempArray[6]}
                    }
                )
                console.log(result)
                collection.insert(...result, function(err, result) {});
                scrape(driver, page + 1, locationIndex, collection);
            }
        ).catch(
            e => {
                console.log(e)
                setTimeout(
                    () => {
                        scrape(driver, page, locationIndex, collection);
                    }
                , 10000)
            }
        )
}

(async function example() {
        let driver = new webdriver.Builder().forBrowser('chrome')
	    .setChromeOptions(new chrome.Options().addArguments('headless'))
        .build();


    MongoClient.connect("mongodb://localhost:27017/test", {native_parser:true}, function(err, db) {

        db.createCollection("a_simple_collection", {capped:true, size:10000, max:1000, w:1}, function(err, collection) {
            scrape(driver, 1, 0, collection)
        });
        
      });
})()
