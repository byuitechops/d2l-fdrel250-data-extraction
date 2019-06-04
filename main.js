const puppeteer = require('puppeteer');
const pmap = require('p-map');
const {
    sortSection,
    sortSemesters
} = require('./sort.js');

// This function waits 1000ms to allow the popup to load.
async function timeout() {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

/***********************************************
 * This function scrapes all data from a single
 * student submission popup.
 ***********************************************/
async function scrapeData(frame) {
    var data = await frame.$$eval('.d_tl.d_tm.d_tn', items => {
        let tmp = {};
        // set the sis user id
        tmp.sis_user_id = items[0].innerText.split(' ').pop().replace(')', '');
        // set the date stamp
        tmp.date = items[2].innerText.split(' ').slice(1, 4).join(' ');

        return tmp;
    });
    // set the link of this student's submission
    data.link = await frame.url();

    // get divs that have questions
    var divs = await frame.$$('div[style*="margin-left:0.9em;"]');
    var num = 0;
    var qAndAs = [];
    for (let div of divs) {
        let questionText = await div.$eval('.drt.d2l-htmlblock.d2l-htmlblock-deferred:not(.d2l-htmlblock-untrusted)', q => q.innerText);
        let answer = await div.$$eval('.drt.d2l-htmlblock.d2l-htmlblock-untrusted', ans => {
            if (ans.length === 1) return ans[0].innerText;
            else if (ans.length === 0) return await div.$eval('.ds_b', noText => noText.innerText);
            // let options
            // let selected = await div.$$eval('.vui-input[type=radio]', inputs => {
            //     let index;
            //     inputs.forEach((input, i) => {
            //         if (input.getAttribute('checked') == 'checked') index = i;
            //     });
            //     return index;
            // });
        });
        qAndAs.push({ name: `Question ${++num}`, text: questionText, response_text: answer });
    }
    console.log(qAndAs)

    /*************************************************************************************************/
    // // get questions from popup
    // var questions = await frame.$$eval('.drt.d2l-htmlblock.d2l-htmlblock-deferred:not(.d2l-htmlblock-untrusted)', div => {
    //     let num = 0;
    //     return div.map(d => {
    //         return { name: `Question ${++num}`, text: d.innerText };
    //     });
    // });
    // // get answers from popup
    // var answers = await frame.$$eval('.drt.d2l-htmlblock.d2l-htmlblock-untrusted', div => {
    //     return div.map(d => { return d.innerText; }).slice(1);
    // });

    // // loop through answer text to find multiple choice questions
    // var multi = [];
    // let spot;
    // let texts = answers.filter((text, i) => {
    //     if (text.search(/[b-d]\)\s\n\n\t\n\n/) !== -1) {
    //         multi.push(text);
    //         return false;
    //     }
    //     if (text.search(/a\)\s\n\n\t\n\n/) !== -1) {
    //         multi.push(text);
    //         spot = i;
    //     }
    //     return true;
    // });
    // // find the answer the student selected and trash the other multi choice answers
    // var selectedIndex = await frame.$$eval('.vui-input[type=radio]', inputs => {
    //     let index;
    //     inputs.forEach((input, i) => {
    //         if (input.getAttribute('checked') == 'checked') {
    //             index = i;
    //         }
    //     });
    //     return index;
    // });
    // texts[spot] = multi[selectedIndex];
    // // map answers to questions
    // let num = 0;
    // answers = texts.map(text => {
    //     return { name: `Question ${++num}`, response_text: text };
    // });
    // // set question objects and return student data
    // questions = questions.map(q => {
    //     q.answer = answers.filter(a => {
    //         return a.name === q.name;
    //     })[0].response_text;
    //     return q;
    // });
    /*************************************************************************************************/


    // data.questions = questions;
    return data;
}

/********************************************************************************
 * This function completes all the puppeteer tasks of clicking through the d2l UI.
 *******************************************************************************/
async function clickAndScrape({ submission, page }) {
    // open the popup
    const [popup] = await Promise.all([
        new Promise(resolve => page.once('popup', resolve)),
        submission.click()
    ]);
    try {
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

        /* scrape data from popup and return student's Q&As */
        await timeout();
        var data = await scrapeData(frame);
        var title = await page.$eval("a[title*=FDREL]", course => {
            var code = course.getAttribute('href').split('/').pop();
            var semester = course.innerText.split('; ').pop();
            var sections = course.innerText.split(' ')[2].split(',');
            return { semester, sections, code };
        });
        data.semester = title.semester;
        data.sections = title.sections;
        data.course_id = title.code;
    } catch (error) {
        console.log("ERROR SCRAPING SUBMISSION: ", error.message);
    }
    await popup.close();
    await page.waitForSelector('a[title*=Submission]');
    return data;
}

async function openLink(link) {
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

    let data;
    try {
        var submissions = await page.$$('a[title*=Submission]');
        // for (let i = 0; i < submissions.length; i++) {
        // const submission = submissions[i];
        submissions = submissions.slice(0, 3).map(submission => { return { submission, page }; });
        data = await pmap(submissions, clickAndScrape, { concurrency: 1 });
        await browser.close();
        // console.dir(data, { depth: 4 });
    } catch (error) {
        console.log(`ERROR READING SUBMISSIONS: `, error.message);
    }
    return data;
}

// export main
module.exports = {
    async main(link) {
        var data = await openLink(link);
        // console.dir(data, { depth: 4 });
        // var sortedData = sortSection(data);
        // return sortedData;
        return { yo: 'yo' };
    }
};