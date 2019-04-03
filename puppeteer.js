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

async function waitForPopUpToBeThere(browser) {
    return new Promise((resolve, error) => {
        var tryCount = 0;
        var hi = setInterval(async function () {
            tryCount += 1;
            console.log(tryCount);
            var pages = await browser.pages();
            if (pages.length > 1) {
                clearInterval(hi);
                resolve();
            } else if (tryCount > 10) {
                clearInterval(hi);
                error(new Error('Popup Time Out'));
            }
        }, 200);
    });
}

function once(emitter, event) {
    return new Promise(resolve => emitter.once(event, resolve));
}

/********************************************************************************
 * This function completes all the puppeteer tasks of clicking through the d2l
 * UI and scraping quiz data from it. All the smaller steps are commented below.
 *******************************************************************************/
async function doStuff(link) {
    /* Define the browser */
    const browser = await puppeteer.launch({
        // slowMo: 100,
        headless: false,
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        handleSIGINT: true,
        args: ['--start-maximized']
    });

    /* Navigate to the new blank page that puppeteer opens for us */
    var pages = await browser.pages()
    const page = pages[0];

    /* Navigate to the d2l backdoor login page and wait for it to load */
    await page.goto('https://byui.brightspace.com/d2l/login?noredirect=true');
    await page.waitFor('.d2l-login-portal-login.d2l-login-portal-bordered')

    /* Type in my username and password, which are set as environment varaibles within the console */
    await page.type('#userName', process.env.D2L_USERNAME);
    await page.type('#password', process.env.D2L_PASSWORD);

    /* Click the login button and wait for the next page to load */
    await page.evaluate(() => {
        document.querySelector('.d2l-button').click();
    })
    await page.waitForSelector('.d2l-navigation-s-group-text');

    /* Go to the quiz page (link is the one passed into the function) and wait for it to load */
    await page.goto(link);
    await page.waitForSelector('.di_i');




    // /* Click all the popups buttons on the page */
    // page.evaluate(() => {
    //     var popupButtons = document.querySelectorAll('table[id*="z"] .di_i');
    //     for (var i = 0; i < popupButtons.length; i++) {
    //         popupButtons[i].click();
    //     }
    // })

    // var popupButtons = await page.$$('table[id*="z"] .di_i');
    // for (var i = 0; i < popupButtons.length; i++) {
    //     console.log("got a page")
    // }

    // // get all pages
    // var pages = await browser.pages()
    // var content = [];
    // for (const page of pages) {
    //     await page.waitForSelector('.vui-input.d2l-select');
    //     await page.click('.vui-input.d2l-select');
    //     await page.evaluate(() => {
    //         var options = document.querySelector('.vui-input.d2l-select').children;
    //         options[0].click[0];
    //     })
    //     // console.log(await page.content())   // new page now appear!
    // }

    // await page.goto('https://byui.brightspace.com/d2l/common/popup/popup.d2l?ou=288274&queryString=ou%3D288274%26qi%3D706568%26ui%3D82812%26isov%3D1%26ai%3D0%26isdialog%3D1&footerMsg=&buttonOffset=0&popBodySrc=/d2l/lms/quizzing/admin/mark/quiz_mark_attempt.d2l&width=715&height=750&hasStatusBar=false&hasAutoScroll=true&hasHiddenHeader=false&p=d2l_cntl_2fa811de8fde4c7b80a79e82b401e9cd_2')

    // await page.waitForSelector('#z_i');
    // await page.click('#z_i');
    // await page.evaluate(() => {
    //     var options = document.querySelector('.vui-input.d2l-select').children;
    //     options[0].click[0];
    // })




    try {

        var submissions = await page.$$('a[title*=Submission]');
        // for (let i = 0; i < submissions.length; i++) {
        // const submission = submissions[i];
        const submission = submissions[0];

        // open the popup
        const [popup] = await Promise.all([
            new Promise(resolve => page.once('popup', resolve)),
            submission.click()
        ]);

        // await once(browser, 'targetcreated');
        // wait for the popup
        // await waitForPopUpToBeThere(browser)

        // await popup.waitForSelector(`frame[title=Body]`)

        var frames = popup.frames();
        frames.forEach(f => console.log(f.name()))







    } catch (error) {
        console.log("MAKE A REAL ERROR");
        console.log(error);
    }
    // change the first on the page
    // popup.select(`select`, )

    // }

}


/* Function call, passes in one test URL but should eventually run through allLinks */
doStuff('https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1745428&ou=288274').catch(console.log)


/* These are the links to the page where the 250 Toolkit assessmnet is graded in each course */
var allLinks = ['https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1745428&ou=288274',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1750705&ou=290362',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1738936&ou=326763',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1737441&ou=327760',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1739166&ou=341283',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1836945&ou=365243',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1881080&ou=375413',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1881154&ou=375417',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1881275&ou=376061',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1949190&ou=388402',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1956053&ou=389359',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1983807&ou=394370',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2061724&ou=412335',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2061755&ou=412339',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2077072&ou=417283',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2116011&ou=425434',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2130217&ou=428547',
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/user_list_view.d2l?ou=469776']