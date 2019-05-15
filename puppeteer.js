const puppeteer = require('puppeteer');

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
    'https://byui.brightspace.com/d2l/lms/grades/admin/enter/user_list_view.d2l?ou=469776'];

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
async function clickAndScrape(link) {
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


        // await popup.evaluate(() => {
        //     // document.querySelector("frame[title=Body]").contentDocument.querySelector("select").click();
        //     console.log(document.querySelector("frame[title=Body]").contentDocument)
        // })

        await popup.waitForFunction(() => {
            // return document.querySelector("frame[title=Body]") !== null;
            var frame = document.querySelector('frameset frame[title=Body]')
            if (frame === null)
                return false;

            return frame.contentDocument.querySelector('select[name=attempt]') !== null;
        });

        var frameset = await popup.frames()['0'];
        var childFrames = await frameset.childFrames();
        var frame = childFrames.find(f => f.name() === "Body");
        var attempts = await frame.$$('select[name=attempt] option');
        attempts.forEach(attempt => {
            console.log(attempt.val());
        })

        // await frame.evaluate(() => {
        //     return new Promise((resolve, reject) => {
        //         var select = document.querySelector('select[name=attempt]');
        //         var lastAttempt = select.length;
        //         console.log(lastAttempt);

        //         for (var i = 0; i < select.length; i++) {
        //             if (select.options[i].text = `Attempt ${lastAttempt - 1}`) {
        //                 console.log('selected');
        //                 select.value = select.options[i].value;
        //             }
        //         }
        //         resolve();
        //     })
        // })


    } catch (error) {
        console.log("MAKE A REAL ERROR");
        console.log(error);
    }

}


/* Function call, passes in one test URL but should eventually run through allLinks */
clickAndScrape('https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1745428&ou=288274').catch(console.log)

