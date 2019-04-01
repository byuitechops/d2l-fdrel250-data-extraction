const fs = require('fs');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');


function readFile() {
    var links = [];
    fs.createReadStream('./pathwayReport.csv')
        .pipe(csv())
        .on('data', (data) => {
            links.push(data['Link to Evaluation']);
        })
        .on('end', () => {
            for (var i = 0; i < links.length; i++) {
                getQuizData(links[i]);
            }
        })

}



async function getQuizData(link) {
    const browser = await puppeteer.launch({
        slowMo: 100,
        headless: false
    });

    const page = await browser.newPage();
    await page.goto('https://byui.brightspace.com/d2l/login?noredirect=true');
    await page.waitFor('.d2l-login-portal-login.d2l-login-portal-bordered')
    await page.type('#userName', process.env.D2L_USERNAME);
    await page.type('#password', process.env.D2L_PASSWORD);
    await page.evaluate(() => {
        document.querySelector('.d2l-button').click();
    })
    await page.waitForSelector('.d2l-navigation-s-group-text');
    await page.goto(link);
    await page.waitForSelector('#z_cg');
    await page.hover('#z_cg');

    await page.evaluate(() => {
        document.querySelector('#z_cg').click();
        console.log("hello")
    })
    await page.waitFor('.dco_c.vui-dropdown-menu')
    await page.evaluate(() => {
        document.querySelectorAll('.dcm_i2')[1].click();
    })

    await page.waitFor('#z_h_Questions_l')
    await page.evaluate(() => {
        document.querySelector('#z_h_Questions_l').click();
    })

    await page.waitFor('.d2l-link.d2l-link-inline');
    await page.evaluate(() => {
        var questions = document.querySelectorAll('.d2l-link.d2l-link-inline');
        for (var i = 0; i < 10; i++) {
            questions[i].click();
        }
    })


    // const pages = await browser.pages();
    // const popup = pages[pages.length - 1];
    // console.log(popup.url);
}
//dcm_i2 [2]
//drt d2l-htmlblock d2l-htmlblock-deferred>p

getQuizData('https://byui.brightspace.com/d2l/common/dialogs/quickLink/quickLink.d2l?ou=288274&type=quiz&rcode=byui_production-1618379');

// readFile();
