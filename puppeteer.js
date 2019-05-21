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

async function timeout() {
    return new Promise(resolve => setTimeout(resolve, 1500));
}

async function scrapeData(frame) {
    var data = await frame.$$eval('.d_tl.d_tm.d_tn', items => {
        let tmp = {};
        // set the sis user id
        tmp.sis_user_id = items[0].innerText.split(' ').pop().replace(')', '');
        tmp.date = items[2].innerText.split(' ').slice(1, 4).join(' ');

        return tmp;
    });
    data.link = await frame.url();
    var questions = await frame.$$eval('.drt.d2l-htmlblock.d2l-htmlblock-deferred:not(.d2l-htmlblock-untrusted)', div => {
        let num = 0;
        return div.map(d => {
            return { name: `Question ${++num}`, text: d.innerText };
        });
    });
    var answers = await frame.$$eval('.drt.d2l-htmlblock.d2l-htmlblock-untrusted', div => {
        return div.map(d => { return d.innerText; }).slice(1);
    });

    var multi = [];
    let spot;
    let texts = answers.filter((text, i) => {
        if (text.search(/[b-d]\)\s\n\n\t\n\n/) !== -1) {
            multi.push(text);
            return false;
        }
        if (text.search(/a\)\s\n\n\t\n\n/) !== -1) {
            multi.push(text);
            spot = i;
        }
        return true;
    });
    var selectedIndex = await frame.$$eval('.vui-input[type=radio]', inputs => {
        let index;
        inputs.forEach((input, i) => {
            if (input.getAttribute('checked') == 'checked') {
                index = i;
            }
        });
        return index;
    });

    texts[spot] = multi[selectedIndex];
    let num = 0;
    answers = texts.map(text => {
        return { name: `Question ${++num}`, response_text: text };
    });
    console.log(answers)
    questions = questions.map(q => {
        q.answer = answers.filter(a => {
            return a.name === q.name;
        })[0].response_text;
        return q;
    });
    data.questions = questions;
    return data;
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
    await page.waitFor('.d2l-login-portal-login.d2l-login-portal-bordered');

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
    await page.waitForSelector('.d2l-select[title*=Results]');
    // await page.select('.d2l-select[title*=Results]', '200');
    // await page.waitForSelector('.d2l-select[title*=Results]');

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

        /* Wait for popup and select most recent attempt */
        await popup.waitForFunction(() => {
            var frame = document.querySelector('frameset frame[title=Body]')
            if (frame === null)
                return false;
            return frame.contentDocument.querySelector('select[name=attempt]') !== null;
        });
        var frameset = await popup.frames()['0'];
        var childFrames = await frameset.childFrames();
        var frame = childFrames.find(f => f.name() === "Body");
        var attempt = await frame.$$eval('select[name=attempt] option', e => {
            let value;
            e.reduce((accum, opt) => {
                if (opt.innerText.slice(0, 7).toUpperCase() === 'ATTEMPT' && Number(opt.innerText.slice(-1)) > Number(accum.innerText.slice(-1))) {
                    value = opt.value;
                    return opt;
                }
                return accum;
            }, { innerText: '0' });
            return value;
        });
        // wait for popup to load then select generic
        await timeout();
        await frame.select('select[name=attempt]', '0');
        // wait for reload then select most recent attempt
        await timeout();
        await frame.select('select[name=attempt]', attempt);

        /* scrape data from popup */
        await timeout();
        var data = await scrapeData(frame);
        console.log(data);

    } catch (error) {
        console.log("MAKE A REAL ERROR");
        console.log(error);
    }

}


/* Function call, passes in one test URL but should eventually run through allLinks */
clickAndScrape('https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=1745428&ou=288274').catch(console.log)
// clickAndScrape('https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_item_edit.d2l?objectId=2077072&ou=417283').catch(console.log)

